import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto, include: { university: true } });
  }

  findAll(universityId?: string) {
    const where = universityId ? { universityId } : {};
    return this.prisma.department.findMany({
      where,
      include: { university: true, _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: { university: true, _count: { select: { employees: true } } },
    });
  }

  update(id: string, data: Partial<CreateDepartmentDto>) {
    return this.prisma.department.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }
}
