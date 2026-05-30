import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async universityWiseReport() {
    const universities = await this.prisma.university.findMany({
      include: {
        _count: { select: { employees: true } },
        employees: { where: { employmentStatus: 'ACTIVE' }, select: { postType: true, gender: true, employeeClassification: true } },
      },
    });

    return universities.map((u) => ({
      university: u.name, code: u.code,
      total: u._count.employees,
      active: u.employees.length,
      teaching: u.employees.filter((e) => e.employeeClassification === 'TEACHING').length,
      nonTeaching: u.employees.filter((e) => e.employeeClassification === 'NON_TEACHING').length,
      budgeted: u.employees.filter((e) => e.postType === 'BUDGETED').length,
      sfs: u.employees.filter((e) => e.postType === 'SFS').length,
      contractual: u.employees.filter((e) => e.postType === 'CONTRACTUAL').length,
      male: u.employees.filter((e) => e.gender === 'MALE').length,
      female: u.employees.filter((e) => e.gender === 'FEMALE').length,
    }));
  }

  async departmentWiseReport(universityId?: string) {
    const where = universityId ? { universityId } : {};
    const departments = await this.prisma.department.findMany({
      where,
      include: {
        university: { select: { name: true, code: true } },
        _count: { select: { employees: true } },
        employees: { where: { employmentStatus: 'ACTIVE' }, select: { employeeClassification: true, postType: true } },
      },
    });

    return departments.map((d) => ({
      university: d.university.code, department: d.name,
      total: d._count.employees,
      teaching: d.employees.filter((e) => e.employeeClassification === 'TEACHING').length,
      nonTeaching: d.employees.filter((e) => e.employeeClassification === 'NON_TEACHING').length,
      budgeted: d.employees.filter((e) => e.postType === 'BUDGETED').length,
      sfs: d.employees.filter((e) => e.postType === 'SFS').length,
      contractual: d.employees.filter((e) => e.postType === 'CONTRACTUAL').length,
    }));
  }

  async subjectWiseReport(universityId?: string) {
    const where: any = { employmentStatus: 'ACTIVE', subject: { not: null } };
    if (universityId) where.universityId = universityId;

    const employees = await this.prisma.employee.findMany({
      where,
      select: { subject: true, gender: true, employeeClassification: true, university: { select: { code: true } } },
    });

    const subjectMap = new Map<string, any>();
    for (const e of employees) {
      const key = `${e.university.code}-${e.subject}`;
      if (!subjectMap.has(key)) subjectMap.set(key, { university: e.university.code, subject: e.subject, total: 0, male: 0, female: 0 });
      const s = subjectMap.get(key);
      s.total++;
      if (e.gender === 'MALE') s.male++;
      if (e.gender === 'FEMALE') s.female++;
    }

    return Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }

  async designationWiseReport(universityId?: string) {
    const where: any = { employmentStatus: 'ACTIVE' };
    if (universityId) where.universityId = universityId;

    const employees = await this.prisma.employee.findMany({
      where,
      select: { designationPresent: true, gender: true, category: true, university: { select: { code: true } } },
    });

    const map = new Map<string, any>();
    for (const e of employees) {
      const desig = e.designationPresent || 'Unknown';
      const key = `${e.university.code}-${desig}`;
      if (!map.has(key)) map.set(key, { university: e.university.code, designation: desig, total: 0, male: 0, female: 0 });
      const s = map.get(key);
      s.total++;
      if (e.gender === 'MALE') s.male++;
      if (e.gender === 'FEMALE') s.female++;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  async categoryWiseReport(universityId?: string) {
    const where: any = { employmentStatus: 'ACTIVE' };
    if (universityId) where.universityId = universityId;

    const grouped = await this.prisma.employee.groupBy({
      by: ['category', 'gender'],
      where,
      _count: true,
    });

    const categories = new Map<string, any>();
    for (const g of grouped) {
      if (!categories.has(g.category)) categories.set(g.category, { category: g.category, total: 0, male: 0, female: 0 });
      const c = categories.get(g.category);
      c.total += g._count;
      if (g.gender === 'MALE') c.male += g._count;
      if (g.gender === 'FEMALE') c.female += g._count;
    }

    return Array.from(categories.values());
  }

  async genderWiseReport(universityId?: string) {
    const where: any = { employmentStatus: 'ACTIVE' };
    if (universityId) where.universityId = universityId;

    const grouped = await this.prisma.employee.groupBy({
      by: ['gender', 'employeeClassification'],
      where,
      _count: true,
    });

    return grouped.map((g) => ({
      gender: g.gender,
      classification: g.employeeClassification,
      count: g._count,
    }));
  }

  async teachingStaffReport(universityId?: string) {
    const where: any = { employmentStatus: 'ACTIVE', employeeClassification: 'TEACHING' };
    if (universityId) where.universityId = universityId;

    return this.prisma.employee.findMany({
      where,
      select: {
        employeeId: true, name: true, designationPresent: true, subject: true, category: true, postType: true, gender: true,
        department: { select: { name: true } },
        university: { select: { code: true } },
        retirementDate: true,
      },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async nonTeachingStaffReport(universityId?: string) {
    const where: any = { employmentStatus: 'ACTIVE', employeeClassification: 'NON_TEACHING' };
    if (universityId) where.universityId = universityId;

    return this.prisma.employee.findMany({
      where,
      select: {
        employeeId: true, name: true, designationPresent: true, category: true, postType: true, gender: true,
        department: { select: { name: true } },
        university: { select: { code: true } },
        retirementDate: true,
      },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async retirementDueReport(months: number = 12, universityId?: string) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    const where: any = {
      retirementDate: { gte: new Date(), lte: futureDate },
      employmentStatus: 'ACTIVE',
    };
    if (universityId) where.universityId = universityId;

    return this.prisma.employee.findMany({
      where,
      include: {
        university: { select: { name: true, code: true } },
        department: { select: { name: true } },
      },
      orderBy: { retirementDate: 'asc' },
    });
  }

  async employeeStrengthReport() {
    const universities = await this.prisma.university.findMany({
      include: { _count: { select: { employees: true } } },
    });

    const results: any[] = [];
    for (const u of universities) {
      const active = await this.prisma.employee.count({ where: { universityId: u.id, employmentStatus: 'ACTIVE' } });
      const sanctioned = await this.prisma.sanctionedPost.aggregate({
        where: { universityId: u.id },
        _sum: { sanctionedCount: true },
      });
      const sanct = sanctioned._sum.sanctionedCount || 0;

      results.push({
        university: u.name, code: u.code,
        totalRecords: u._count.employees,
        activeEmployees: active,
        sanctionedPosts: sanct,
        vacancies: sanct - active,
      });
    }

    return results;
  }

  async employeeDirectory(universityId: string) {
    return this.prisma.employee.findMany({
      where: { universityId, employmentStatus: 'ACTIVE' },
      select: {
        employeeId: true, name: true, designationPresent: true, subject: true,
        employeeClassification: true, category: true, postType: true, gender: true,
        department: { select: { name: true } },
        mobileNumber: true, email: true, retirementDate: true,
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });
  }
}
