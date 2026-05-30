import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto, EmployeeFilterDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: dto as any,
      include: { university: true, department: true },
    });
  }

  async findAll(filters: EmployeeFilterDto, userUniversityId?: string) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, ...rest } = filters;

    const where: Prisma.EmployeeWhereInput = {};

    if (userUniversityId) where.universityId = userUniversityId;
    if (rest.universityId) where.universityId = rest.universityId;
    if (rest.departmentId) where.departmentId = rest.departmentId;
    if (rest.subject) where.subject = { contains: rest.subject, mode: 'insensitive' };
    if (rest.postType) where.postType = rest.postType;
    if (rest.employeeClassification) where.employeeClassification = rest.employeeClassification;
    if (rest.gender) where.gender = rest.gender;
    if (rest.category) where.category = rest.category;
    if (rest.employmentStatus) where.employmentStatus = rest.employmentStatus;
    if (rest.designation) where.designationPresent = { contains: rest.designation, mode: 'insensitive' };

    if (rest.retirementYear) {
      const year = Number(rest.retirementYear);
      where.retirementDate = { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { designationPresent: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { university: { select: { name: true, code: true } }, department: { select: { name: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { university: true, department: true, documents: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  update(id: string, dto: Partial<CreateEmployeeDto>) {
    return this.prisma.employee.update({
      where: { id },
      data: dto as any,
      include: { university: true, department: true },
    });
  }

  delete(id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }

  async bulkImport(rows: Record<string, any>[], universityId: string) {
    const results = { success: 0, failed: 0, errors: [] as string[], total: rows.length };
    const deptCache = new Map<string, string>();

    const existingDepts = await this.prisma.department.findMany({ where: { universityId } });
    for (const d of existingDepts) deptCache.set(d.name.toLowerCase(), d.id);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const name = row['Employee Name'] || row['name'];
        if (!name) { results.failed++; results.errors.push(`Row ${rowNum}: Employee Name is missing`); continue; }

        const deptName = row['Department'] || row['department'] || '';
        if (!deptName) { results.failed++; results.errors.push(`Row ${rowNum} (${name}): Department is missing`); continue; }

        let departmentId = deptCache.get(deptName.toLowerCase());
        if (!departmentId) {
          const dept = await this.prisma.department.create({ data: { name: deptName, universityId } });
          departmentId = dept.id;
          deptCache.set(deptName.toLowerCase(), departmentId);
        }

        const genderRaw = (row['Gender'] || '').toUpperCase();
        const gender = ['MALE', 'FEMALE', 'OTHER'].includes(genderRaw) ? genderRaw : 'MALE';

        const categoryRaw = (row['Category'] || '').toUpperCase();
        const validCategories = ['GENERAL','SC','ST','OBC','EWS','BCA','BCB','PWD','ESM'];
        const category = validCategories.includes(categoryRaw) ? categoryRaw : 'GENERAL';

        const catSelRaw = (row['Category(Selection)'] || '').toUpperCase();
        const categorySelection = validCategories.includes(catSelRaw) ? catSelRaw : 'GENERAL';

        const typeRaw = (row['Type'] || '').toUpperCase();
        const postType = ['BUDGETED','SFS','CONTRACTUAL'].includes(typeRaw) ? typeRaw : 'BUDGETED';

        const classRaw = (row['Employee Type'] || '').toUpperCase().replace(/[\s-]/g, '_');
        const employeeClassification = ['TEACHING','NON_TEACHING'].includes(classRaw) ? classRaw : 'TEACHING';

        const statusRaw = (row['Employment Status'] || '').toUpperCase();
        const employmentStatus = ['ACTIVE','RETIRED','RESIGNED','TERMINATED','SUSPENDED'].includes(statusRaw) ? statusRaw : 'ACTIVE';

        let retirementDate: Date | null = null;
        const retVal = row['Retirement Date'] || row['retirementDate'];
        if (retVal) {
          if (typeof retVal === 'number') {
            retirementDate = new Date(Math.round((retVal - 25569) * 86400 * 1000));
          } else {
            const parsed = new Date(retVal);
            if (!isNaN(parsed.getTime())) retirementDate = parsed;
          }
        }

        let dateOfJoining: Date | null = null;
        const dojVal = row['Date of Joining'] || row['dateOfJoining'];
        if (dojVal) {
          if (typeof dojVal === 'number') {
            dateOfJoining = new Date(Math.round((dojVal - 25569) * 86400 * 1000));
          } else {
            const parsed = new Date(dojVal);
            if (!isNaN(parsed.getTime())) dateOfJoining = parsed;
          }
        }

        await this.prisma.employee.create({
          data: {
            employeeId: row['Employee ID'] || row['employeeId'] || null,
            name,
            gender: gender as any,
            universityId,
            departmentId,
            subject: row['Subject'] || row['subject'] || null,
            category: category as any,
            categorySelection: categorySelection as any,
            postType: postType as any,
            employeeClassification: employeeClassification as any,
            designationAppointed: row['Designation(appointment)'] || row['designationAppointed'] || null,
            designationPresent: row['Designation (Present)'] || row['designationPresent'] || null,
            retirementDate,
            dateOfJoining,
            employmentStatus: employmentStatus as any,
            mobileNumber: row['Mobile Number'] || row['mobileNumber'] || null,
            email: row['Email Address'] || row['email'] || null,
          },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    return results;
  }

  async getDashboardStats(universityId?: string) {
    const where = universityId ? { universityId } : {};
    const activeWhere = { ...where, employmentStatus: 'ACTIVE' as any };

    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    const [
      total, active, teaching, nonTeaching,
      budgeted, sfs, contractual,
      male, female,
      retiringThisYear,
      totalSanctioned,
    ] = await Promise.all([
      this.prisma.employee.count({ where }),
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
        where: universityId ? { universityId } : {},
        _sum: { sanctionedCount: true },
      }),
    ]);

    const sanctioned = totalSanctioned._sum.sanctionedCount || 0;
    const vacancies = sanctioned - active;

    const universityCount = universityId
      ? undefined
      : await this.prisma.university.count();

    return {
      total, active, teaching, nonTeaching,
      budgeted, sfs, contractual,
      gender: { male, female },
      retiringThisYear,
      sanctioned, filled: active, vacancies,
      universityCount,
    };
  }
}
