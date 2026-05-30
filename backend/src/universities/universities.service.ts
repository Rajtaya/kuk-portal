import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUniversityDto } from './dto/create-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateUniversityDto) {
    return this.prisma.university.create({ data: dto });
  }

  findAll() {
    return this.prisma.university.findMany({
      include: { _count: { select: { employees: true, departments: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.university.findUnique({
      where: { id },
      include: { departments: true, _count: { select: { employees: true } } },
    });
  }

  update(id: string, dto: Partial<CreateUniversityDto>) {
    return this.prisma.university.update({ where: { id }, data: dto });
  }

  async getStats(id: string) {
    const activeWhere = { universityId: id, employmentStatus: 'ACTIVE' as any };
    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    const [total, teaching, nonTeaching, budgeted, sfs, contractual, male, female, retiringThisYear, sanctioned] =
      await Promise.all([
        this.prisma.employee.count({ where: activeWhere }),
        this.prisma.employee.count({ where: { ...activeWhere, employeeClassification: 'TEACHING' } }),
        this.prisma.employee.count({ where: { ...activeWhere, employeeClassification: 'NON_TEACHING' } }),
        this.prisma.employee.count({ where: { ...activeWhere, postType: 'BUDGETED' } }),
        this.prisma.employee.count({ where: { ...activeWhere, postType: 'SFS' } }),
        this.prisma.employee.count({ where: { ...activeWhere, postType: 'CONTRACTUAL' } }),
        this.prisma.employee.count({ where: { ...activeWhere, gender: 'MALE' } }),
        this.prisma.employee.count({ where: { ...activeWhere, gender: 'FEMALE' } }),
        this.prisma.employee.count({
          where: { ...activeWhere, retirementDate: { gte: now, lte: yearEnd } },
        }),
        this.prisma.sanctionedPost.aggregate({
          where: { universityId: id },
          _sum: { sanctionedCount: true },
        }),
      ]);

    const sanct = sanctioned._sum.sanctionedCount || 0;
    return { total, teaching, nonTeaching, budgeted, sfs, contractual, male, female, retiringThisYear, sanctioned: sanct, vacancies: sanct - total };
  }
}
