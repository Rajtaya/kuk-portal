import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto, EmployeeFilterDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private prisma: PrismaService) {}

  async autoRetireEmployees() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.employee.updateMany({
      where: {
        employmentStatus: 'ACTIVE',
        retirementDate: { lt: today },
      },
      data: { employmentStatus: 'RETIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-retired ${result.count} employee(s) past their retirement date`);
    }

    return result.count;
  }

  // Date inputs arrive as "YYYY-MM-DD" from <input type="date">; Prisma only
  // accepts Date objects or full ISO-8601 datetimes, anything else throws a 500.
  private coerceDates<T extends { dateOfJoining?: any; retirementDate?: any }>(dto: T): T {
    for (const key of ['dateOfJoining', 'retirementDate'] as const) {
      const value = dto[key];
      if (typeof value === 'string' && value) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) (dto as any)[key] = parsed;
      }
    }
    return dto;
  }

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: this.coerceDates(dto) as any,
      include: { university: true, department: true },
    });
  }

  async findAll(filters: EmployeeFilterDto, userUniversityId?: string) {
    const ALLOWED_SORT = ['name','employeeId','createdAt','subject','designationAppointed','designationPresent','retirementDate','gender','category','categorySelection','postType','employmentStatus'];
    const { page = 1, limit = 20, sortBy: rawSort = 'createdAt', sortOrder = 'desc' } = filters;
    const dir: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    // Header-click sorting: scalar fields via whitelist, plus virtual sorts on the related university.
    let orderBy: Prisma.EmployeeOrderByWithRelationInput;
    if (rawSort === 'university') orderBy = { university: { name: dir } };
    else if (rawSort === 'universityCode') orderBy = { university: { code: dir } };
    else orderBy = { [ALLOWED_SORT.includes(rawSort) ? rawSort : 'createdAt']: dir };

    const where = this.buildWhere(filters, userUniversityId);

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { university: { select: { name: true, code: true } }, department: { select: { name: true } } },
        orderBy,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  // Shared filter -> WHERE builder (used by findAll and the summary boxes).
  private buildWhere(filters: EmployeeFilterDto, userUniversityId?: string): Prisma.EmployeeWhereInput {
    const { search, ...rest } = filters;
    const where: Prisma.EmployeeWhereInput = {};

    if (userUniversityId) where.universityId = userUniversityId;
    if (rest.universityId) where.universityId = rest.universityId;
    if (rest.departmentId) where.departmentId = rest.departmentId;
    if (rest.department) where.department = { is: { name: { equals: rest.department, mode: 'insensitive' } } };
    if (rest.subject) where.subject = { contains: rest.subject, mode: 'insensitive' };
    if (rest.postType) where.postType = rest.postType;
    if (rest.employeeClassification) where.employeeClassification = rest.employeeClassification;
    if (rest.gender) where.gender = rest.gender;
    if (rest.category) where.category = rest.category;
    if (rest.employmentStatus) where.employmentStatus = rest.employmentStatus;
    if (rest.designation) where.designationPresent = { equals: rest.designation, mode: 'insensitive' };

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

    return where;
  }

  // Filtered summary for the header boxes: Total / Budgeted / SFS over the same WHERE as the table.
  async getSummary(filters: EmployeeFilterDto, userUniversityId?: string) {
    const where = this.buildWhere(filters, userUniversityId);
    const [total, budgeted, sfs, contractual] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.count({ where: { ...where, postType: 'BUDGETED' as any } }),
      this.prisma.employee.count({ where: { ...where, postType: 'SFS' as any } }),
      this.prisma.employee.count({ where: { ...where, postType: 'CONTRACTUAL' as any } }),
    ]);
    return { total, budgeted, sfs, contractual };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { university: true, department: true, documents: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: Partial<CreateEmployeeDto>, user?: { role: Role; universityId?: string }) {
    if (user?.role === Role.UNIVERSITY_ADMIN) {
      const emp = await this.prisma.employee.findUniqueOrThrow({ where: { id } });
      if (emp.universityId !== user.universityId) throw new ForbiddenException('Cannot modify another university\'s employee');
    }
    return this.prisma.employee.update({
      where: { id },
      data: this.coerceDates(dto) as any,
      include: { university: true, department: true },
    });
  }

  async delete(id: string, user?: { role: Role; universityId?: string }) {
    if (user?.role === Role.UNIVERSITY_ADMIN) {
      const emp = await this.prisma.employee.findUniqueOrThrow({ where: { id } });
      if (emp.universityId !== user.universityId) throw new ForbiddenException('Cannot delete another university\'s employee');
    }
    return this.prisma.employee.delete({ where: { id } });
  }

  async findExistingEmployeeIds(ids: string[], universityId: string): Promise<string[]> {
    const existing = await this.prisma.employee.findMany({
      where: { universityId, employeeId: { in: ids } },
      select: { employeeId: true },
    });
    return existing.map(e => e.employeeId!).filter(Boolean);
  }

  private parseRowData(row: Record<string, any>) {
    const genderRaw = (row['Gender'] || '').toUpperCase();
    const gender = ['MALE', 'FEMALE', 'OTHER'].includes(genderRaw) ? genderRaw : 'MALE';

    const validCategories = ['UR','DSC','OSC','BCA','BCB','EWS','PWD'];
    const categoryRaw = (row['Category'] || '').toUpperCase();
    const category = validCategories.includes(categoryRaw) ? categoryRaw : 'UR';

    const catSelRaw = (row['Category(Selection)'] || '').toUpperCase();
    const categorySelection = validCategories.includes(catSelRaw) ? catSelRaw : 'UR';

    const typeRaw = (row['Type'] || '').toUpperCase();
    const postType = ['BUDGETED','SFS','CONTRACTUAL'].includes(typeRaw) ? typeRaw : 'BUDGETED';

    const statusRaw = (row['Employment Status'] || '').toUpperCase();
    const employmentStatus = ['ACTIVE','RETIRED','RESIGNED','TERMINATED','SUSPENDED'].includes(statusRaw) ? statusRaw : 'ACTIVE';

    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    return {
      employeeId: row['Employee ID'] || row['employeeId'] || null,
      name: row['Employee Name'] || row['name'] || '',
      gender, category, categorySelection, postType, employmentStatus,
      employeeClassification: 'TEACHING' as const,
      subject: row['Subject'] || row['subject'] || null,
      designationAppointed: row['Designation(appointment)'] || row['designationAppointed'] || null,
      designationPresent: row['Designation (Present)'] || row['designationPresent'] || null,
      retirementDate: parseDate(row['Retirement Date'] || row['retirementDate']),
      dateOfJoining: parseDate(row['Date of Joining'] || row['dateOfJoining']),
      mobileNumber: row['Mobile Number'] || row['mobileNumber'] || null,
      email: row['Email Address'] || row['email'] || null,
      deptName: row['Department'] || row['department'] || '',
    };
  }

  async bulkImport(rows: Record<string, any>[], universityId: string) {
    if (rows.length > 5000) throw new Error('Maximum 5000 rows per upload');
    const results = { success: 0, failed: 0, created: 0, updated: 0, errors: [] as string[], total: rows.length };
    const deptCache = new Map<string, string>();

    const existingDepts = await this.prisma.department.findMany({ where: { universityId } });
    for (const d of existingDepts) deptCache.set(d.name.toLowerCase(), d.id);

    const existingEmps = await this.prisma.employee.findMany({
      where: { universityId, employeeId: { not: null } },
      select: { id: true, employeeId: true },
    });
    const empIdMap = new Map(existingEmps.filter(e => e.employeeId).map(e => [e.employeeId!, e.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const parsed = this.parseRowData(row);
        if (!parsed.name) { results.failed++; results.errors.push(`Row ${rowNum}: Employee Name is missing`); continue; }
        if (!parsed.deptName) { results.failed++; results.errors.push(`Row ${rowNum} (${parsed.name}): Department is missing`); continue; }

        let departmentId = deptCache.get(parsed.deptName.toLowerCase());
        if (!departmentId) {
          const dept = await this.prisma.department.create({ data: { name: parsed.deptName, universityId } });
          departmentId = dept.id;
          deptCache.set(parsed.deptName.toLowerCase(), departmentId);
        }

        const { deptName: _, ...data } = parsed;
        const employeeData = { ...data, universityId, departmentId } as any;

        if (parsed.employeeId && empIdMap.has(parsed.employeeId)) {
          const existingId = empIdMap.get(parsed.employeeId)!;
          delete employeeData.employeeId;
          await this.prisma.employee.update({ where: { id: existingId }, data: employeeData });
          results.updated++;
        } else {
          await this.prisma.employee.create({ data: employeeData });
          if (parsed.employeeId) empIdMap.set(parsed.employeeId, 'new');
          results.created++;
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    return results;
  }

  async getDashboardCharts(universityId?: string) {
    await this.autoRetireEmployees();
    const empWhere: Prisma.EmployeeWhereInput = { employmentStatus: 'ACTIVE' };
    if (universityId) empWhere.universityId = universityId;

    const [employees, allUniversities, subjectCount, designationCount, sanctionedPosts] = await Promise.all([
      this.prisma.employee.findMany({
        where: empWhere,
        select: {
          universityId: true,
          departmentId: true,
          university: { select: { name: true } },
          subject: true,
          designationPresent: true,
          category: true,
          postType: true,
          gender: true,
        },
      }),
      this.prisma.university.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
      this.prisma.subject.count(),
      this.prisma.designation.count(),
      this.prisma.sanctionedPost.findMany({
        where: universityId ? { universityId } : {},
        select: { universityId: true, departmentId: true, subject: true, designation: true, postType: true, sanctionedCount: true },
      }),
    ]);

    const designationSet = new Set<string>();
    const subjectSet = new Set<string>();
    for (const e of employees) {
      if (e.designationPresent) designationSet.add(e.designationPresent);
      if (e.subject) subjectSet.add(e.subject);
    }

    // 1. Designation by University (stacked bar)
    const uniMap = new Map<string, Record<string, number>>();
    for (const e of employees) {
      const uni = e.university.name;
      if (!uniMap.has(uni)) uniMap.set(uni, {});
      const desig = e.designationPresent || 'Other';
      const m = uniMap.get(uni)!;
      m[desig] = (m[desig] || 0) + 1;
    }

    // 2. Hierarchy per university (sunburst)
    const hMap = new Map<string, { name: string; subs: Map<string, Map<string, Map<string, number>>> }>();
    for (const e of employees) {
      if (!hMap.has(e.universityId)) hMap.set(e.universityId, { name: e.university.name, subs: new Map() });
      const h = hMap.get(e.universityId)!;
      const subj = e.subject || 'Other';
      if (!h.subs.has(subj)) h.subs.set(subj, new Map());
      const desig = e.designationPresent || 'Other';
      if (!h.subs.get(subj)!.has(desig)) h.subs.get(subj)!.set(desig, new Map());
      const ptMap = h.subs.get(subj)!.get(desig)!;
      ptMap.set(e.postType, (ptMap.get(e.postType) || 0) + 1);
    }

    // 3. Category × Designation
    const catMap = new Map<string, Record<string, number>>();
    for (const e of employees) {
      if (!catMap.has(e.category)) catMap.set(e.category, {});
      const desig = e.designationPresent || 'Other';
      catMap.get(e.category)![desig] = (catMap.get(e.category)![desig] || 0) + 1;
    }

    // 4. PostType × Designation
    const ptDesigMap = new Map<string, Record<string, number>>();
    for (const e of employees) {
      if (!ptDesigMap.has(e.postType)) ptDesigMap.set(e.postType, {});
      const desig = e.designationPresent || 'Other';
      ptDesigMap.get(e.postType)![desig] = (ptDesigMap.get(e.postType)![desig] || 0) + 1;
    }

    // 5. Gender × Designation (nested donut)
    const gMap = new Map<string, Map<string, number>>();
    for (const e of employees) {
      if (!gMap.has(e.gender)) gMap.set(e.gender, new Map());
      const desig = e.designationPresent || 'Other';
      const m = gMap.get(e.gender)!;
      m.set(desig, (m.get(desig) || 0) + 1);
    }

    // 6. Designation × PostType → Sanction / Present / Vacant (stacked bar)
    const dpSanctionMap = new Map<string, number>();
    for (const sp of sanctionedPosts) {
      const key = `${sp.designation}||${sp.postType}`;
      dpSanctionMap.set(key, (dpSanctionMap.get(key) || 0) + sp.sanctionedCount);
    }
    const dpPresentMap = new Map<string, number>();
    for (const e of employees) {
      const key = `${e.designationPresent || 'Other'}||${e.postType}`;
      dpPresentMap.set(key, (dpPresentMap.get(key) || 0) + 1);
    }
    const allDPKeys = new Set([...dpSanctionMap.keys(), ...dpPresentMap.keys()]);
    const desigOrder = ['Professor', 'Associate Professor', 'Assistant Professor', 'Other Teaching Posts'];
    const ptOrder = ['BUDGETED', 'SFS', 'CONTRACTUAL'];
    const designationPostType = [...allDPKeys]
      .map(k => { const [d, p] = k.split('||'); return { designation: d, postType: p, key: k }; })
      .sort((a, b) => {
        const di = desigOrder.indexOf(a.designation) === -1 ? 99 : desigOrder.indexOf(a.designation);
        const dj = desigOrder.indexOf(b.designation) === -1 ? 99 : desigOrder.indexOf(b.designation);
        if (di !== dj) return di - dj;
        return ptOrder.indexOf(a.postType) - ptOrder.indexOf(b.postType);
      })
      .map(({ designation, postType, key }) => {
        const sanctioned = dpSanctionMap.get(key) || 0;
        const present = dpPresentMap.get(key) || 0;
        return { designation, postType, sanctioned, present, vacant: Math.max(0, sanctioned - present) };
      });

    // 7. Sanction vs Present by Subject
    const sMap = new Map<string, Record<string, number>>();
    for (const sp of sanctionedPosts) {
      const subj = sp.subject || 'General';
      if (!sMap.has(subj)) sMap.set(subj, {});
      const key = `Sanction - ${sp.designation}`;
      sMap.get(subj)![key] = (sMap.get(subj)![key] || 0) + sp.sanctionedCount;
    }
    const pMap = new Map<string, Record<string, number>>();
    for (const e of employees) {
      const subj = e.subject || 'General';
      if (!pMap.has(subj)) pMap.set(subj, {});
      const key = `Present - ${e.designationPresent || 'Other'}`;
      pMap.get(subj)![key] = (pMap.get(subj)![key] || 0) + 1;
    }
    const allSubjs = new Set([...sMap.keys(), ...pMap.keys()]);

    // "Filled" = headcount of all active employees (incl contractual), so the figure matches the
    // employee-distribution chart and counts contractual staff as occupying a post.
    // Vacant = Sanctioned − Filled.
    const sanctionedPostsTotal = sanctionedPosts.filter(p => p.postType !== 'CONTRACTUAL').reduce((s, p) => s + p.sanctionedCount, 0);
    const filledPosts = employees.filter(e => e.postType !== 'CONTRACTUAL').length;
    const vacantSeats = Math.max(0, sanctionedPostsTotal - filledPosts);

    return {
      stats: {
        universityCount: universityId ? 1 : allUniversities.length,
        employeeCount: employees.length,
        sanctionedPosts: sanctionedPostsTotal,
        filledPosts,
        // When scoped to a university, report that university's distinct subjects/designations
        // (from its active employees) rather than the global master counts.
        subjectCount: universityId ? subjectSet.size : subjectCount,
        vacantSeats,
        designationCount: universityId ? designationSet.size : designationCount,
      },
      designationByUniversity: [...uniMap.entries()].map(([university, desigs]) => ({ university, ...desigs })),
      hierarchy: [...hMap.entries()].map(([id, { name, subs }]) => ({
        universityId: id,
        universityName: name,
        children: [...subs.entries()].map(([subj, desigs]) => ({
          name: subj,
          children: [...desigs.entries()].map(([desig, pts]) => ({
            name: desig,
            children: [...pts.entries()].map(([pt, count]) => ({ name: pt, value: count })),
          })),
        })),
      })),
      categoryDesignation: [...catMap.entries()].map(([category, desigs]) => ({
        category, ...desigs, total: Object.values(desigs).reduce((a, b) => a + b, 0),
      })),
      postTypeDesignation: [...ptDesigMap.entries()].map(([postType, desigs]) => ({
        postType, ...desigs, total: Object.values(desigs).reduce((a, b) => a + b, 0),
      })),
      genderDesignation: [...gMap.entries()].map(([gender, desigs]) => ({
        gender,
        total: [...desigs.values()].reduce((a, b) => a + b, 0),
        designations: [...desigs.entries()].map(([name, value]) => ({ name, value })),
      })),
      sanctionVsPresent: [...allSubjs].sort().map(subj => ({
        subject: subj, ...(sMap.get(subj) || {}), ...(pMap.get(subj) || {}),
      })),
      designationPostType,
      universities: universityId ? allUniversities.filter(u => u.id === universityId) : allUniversities,
      designations: [...designationSet].sort(),
      subjects: [...subjectSet].sort(),
    };
  }

  async getDashboardStats(universityId?: string) {
    await this.autoRetireEmployees();
    const where = universityId ? { universityId } : {};
    const activeWhere = { ...where, employmentStatus: 'ACTIVE' as any };

    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    const [
      total, active, teaching,
      budgeted, sfs, contractual,
      male, female,
      retiringThisYear,
      totalSanctioned,
      universityCount,
    ] = await Promise.all([
      this.prisma.employee.count({ where }),
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
        where: universityId ? { universityId } : {},
        _sum: { sanctionedCount: true },
      }),
      // Folded into the parallel batch (was a separate sequential round-trip).
      universityId ? Promise.resolve(undefined) : this.prisma.university.count(),
    ]);

    const sanctioned = totalSanctioned._sum.sanctionedCount || 0;
    const vacancies = sanctioned - active;

    return {
      total, active, teaching,
      budgeted, sfs, contractual,
      gender: { male, female },
      retiringThisYear,
      sanctioned, filled: active, vacancies,
      universityCount,
    };
  }
}
