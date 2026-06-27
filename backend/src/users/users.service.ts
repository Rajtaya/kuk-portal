import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: { id: true, email: true, name: true, role: true, universityId: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, university: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, university: true },
    });
  }

  async update(id: string, data: UpdateUserDto) {
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  }
}
