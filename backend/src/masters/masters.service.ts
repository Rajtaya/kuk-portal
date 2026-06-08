import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  async getSubjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  async createSubject(name: string) {
    const exists = await this.prisma.subject.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Subject already exists');
    return this.prisma.subject.create({ data: { name } });
  }

  async updateSubject(id: string, name: string) {
    const exists = await this.prisma.subject.findFirst({ where: { name, NOT: { id } } });
    if (exists) throw new ConflictException('Subject with that name already exists');
    return this.prisma.subject.update({ where: { id }, data: { name } });
  }

  async deleteSubject(id: string) {
    return this.prisma.subject.delete({ where: { id } });
  }

  async getDesignations() {
    return this.prisma.designation.findMany({ orderBy: { name: 'asc' } });
  }

  async createDesignation(name: string) {
    const exists = await this.prisma.designation.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Designation already exists');
    return this.prisma.designation.create({ data: { name } });
  }

  async deleteDesignation(id: string) {
    return this.prisma.designation.delete({ where: { id } });
  }
}
