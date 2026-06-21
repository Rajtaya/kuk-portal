import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUniversityDto } from './dto/create-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateUniversityDto) {
    return this.prisma.university.create({ data: dto });
  }

  async findAll() {
    // Vacant % per university uses the SAME scope as the Sanctioned Posts "Total" box
    // (which each university card deep-links to): Sanctioned = Budgeted + SFS posts;
    // Filled = active Budgeted + SFS employees; Vacant = max(0, Sanctioned − Filled).
    // Contractual is excluded on both sides so the card and that page can't disagree.
    const [universities, sanctioned, filled] = await Promise.all([
      this.prisma.university.findMany({
        include: { _count: { select: { employees: true, departments: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.sanctionedPost.groupBy({
        by: ['universityId'],
        where: { postType: { in: ['BUDGETED', 'SFS'] as any } },
        _sum: { sanctionedCount: true },
      }),
      this.prisma.employee.groupBy({
        by: ['universityId'],
        where: { employmentStatus: 'ACTIVE' as any, postType: { in: ['BUDGETED', 'SFS'] as any } },
        _count: { _all: true },
      }),
    ]);

    const sanctMap = new Map(sanctioned.map((s) => [s.universityId, s._sum.sanctionedCount || 0]));
    const filledMap = new Map(filled.map((f) => [f.universityId, f._count._all]));

    return universities.map((u) => {
      const sanctionedCount = sanctMap.get(u.id) || 0;
      const filledCount = filledMap.get(u.id) || 0;
      return {
        ...u,
        sanctioned: sanctionedCount,
        filled: filledCount,
        vacant: Math.max(0, sanctionedCount - filledCount),
      };
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

    const [total, teaching, budgeted, sfs, contractual, male, female, retiringThisYear, sanctioned] =
      await Promise.all([
        this.prisma.employee.count({ where: activeWhere }),
        this.prisma.employee.count({ where: { ...activeWhere, employeeClassification: 'TEACHING' } }),
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
    return { total, teaching, budgeted, sfs, contractual, male, female, retiringThisYear, sanctioned: sanct, vacancies: sanct - total };
  }
}
