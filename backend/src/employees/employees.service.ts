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
    const { sortBy: rawSort = 'createdAt', sortOrder = 'desc' } = filters;
    // Clamp pagination defensively (the DTO also bounds it) so a crafted request can't
    // dump the whole table or pass a negative/NaN skip.
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Shared filter -> WHERE builder (used by findAll and the summary boxes).
  private buildWhere(filters: EmployeeFilterDto, userUniversityId?: string): Prisma.EmployeeWhereInput {
    const { search, ...rest } = filters;
    const where: Prisma.EmployeeWhereInput = {};

    // Tenant scope: a UNIVERSITY_ADMIN is pinned to their own university and CANNOT
    // widen it via a ?universityId= query param (that would be a cross-tenant IDOR).
    // Only when there is no enforced scope (SUPER_ADMIN / STATE_USER) may the caller
    // filter by an arbitrary universityId.
    if (userUniversityId) where.universityId = userUniversityId;
    else if (rest.universityId) where.universityId = rest.universityId;
    if (rest.departmentId) where.departmentId = rest.departmentId;
    if (rest.department) where.department = { is: { name: { equals: rest.department, mode: 'insensitive' } } };
    if (rest.employeeId) where.employeeId = { contains: rest.employeeId, mode: 'insensitive' };
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

  // Canonical category aliases — maps the spellings real source sheets use (SC, BC-A, General…)
  // to the enum, so categories import correctly instead of silently collapsing to UR.
  private static readonly CATEGORY_ALIASES: Record<string, string> = {
    UR: 'UR', GENERAL: 'UR', GEN: 'UR', GE: 'UR',
    SC: 'DSC', DSC: 'DSC', ST: 'OSC', OSC: 'OSC',
    'BC-A': 'BCA', 'BC A': 'BCA', BCA: 'BCA',
    'BC-B': 'BCB', 'BC B': 'BCB', BCB: 'BCB',
    EWS: 'EWS', PWD: 'PWD', PH: 'PWD',
  };

  private normCategory(raw: any): string | undefined {
    const k = String(raw ?? '').trim().toUpperCase();
    return k ? EmployeesService.CATEGORY_ALIASES[k] : undefined;
  }

  private normPostType(raw: any): string | undefined {
    const k = String(raw ?? '').trim().toUpperCase().replace(/[\s_-]+/g, '');
    return ({ BUDGETED: 'BUDGETED', SFS: 'SFS', SELFFINANCED: 'SFS', SELFFINANCE: 'SFS', CONTRACTUAL: 'CONTRACTUAL', CONTRACT: 'CONTRACTUAL' } as Record<string, string>)[k];
  }

  // Collapse a designation to one of the 4 canonical ranks (others left as-is).
  private static canonRank(raw: string): string {
    const l = raw.trim().toLowerCase();
    if (l.startsWith('senior')) return 'Senior Professor';
    if (l.startsWith('associate') || l.startsWith('assoc')) return 'Associate Professor';
    if (l.startsWith('assistant') || l.startsWith('asst')) return 'Assistant Professor';
    if (l.startsWith('prof')) return 'Professor';
    return raw.trim();
  }

  // "Assistant Professor in ECE" → { rank: 'Assistant Professor', discipline: 'ECE' }. The
  // discipline (when present only in the designation) is surfaced so it can fill an empty Subject,
  // keeping the designation to the 4 ranks instead of fragmenting into "… in <discipline>".
  private normDesignation(raw: any): { rank?: string; discipline?: string } {
    const s = String(raw ?? '').trim();
    if (!s) return {};
    const m = s.match(/^(.*?)\s+in\s+(.+)$/i);
    if (m) return { rank: EmployeesService.canonRank(m[1]), discipline: m[2].trim() };
    return { rank: EmployeesService.canonRank(s) };
  }

  // Parse a row into employee fields. Anything blank/absent in the sheet comes back as
  // `undefined` (NOT defaulted) so callers can distinguish "set this value" from "leave it
  // unchanged" — this is what enables blank-tolerant uploads and partial updates by Employee ID.
  private parseRowData(row: Record<string, any>) {
    const txt = (v: any): string | undefined => {
      const s = v == null ? '' : String(v).trim();
      return s === '' ? undefined : s;
    };
    const oneOf = (v: any, allowed: string[]): string | undefined => {
      const u = txt(v)?.toUpperCase();
      return u && allowed.includes(u) ? u : undefined;
    };
    const parseDate = (val: any): Date | undefined => {
      if (val == null || String(val).trim() === '') return undefined;
      if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    };
    // Fail LOUD on a present-but-unrecognised enum value instead of silently
    // defaulting it (which previously turned "OBC" -> UR, "M" -> MALE, "Regular"
    // -> BUDGETED, etc. with no warning). A blank cell is still allowed through
    // (returns undefined) so blank-tolerant uploads / partial updates keep working.
    const invalids: string[] = [];
    const strict = <T>(raw: any, parse: (r: string) => T | undefined, label: string, hint: string): T | undefined => {
      const r = txt(raw);
      if (r === undefined) return undefined;
      const v = parse(r);
      if (v === undefined) invalids.push(`${label} "${r}" not recognised (expected ${hint})`);
      return v;
    };

    const appt = this.normDesignation(row['Designation(appointment)'] ?? row['designationAppointed']);
    const pres = this.normDesignation(row['Designation (Present)'] ?? row['designationPresent']);
    let subject = txt(row['Subject'] ?? row['subject']);
    const discipline = pres.discipline ?? appt.discipline;
    if (!subject && discipline) subject = discipline; // keep the discipline when it was only in the designation

    return {
      employeeId: txt(row['Employee ID'] ?? row['employeeId']),
      name: txt(row['Employee Name'] ?? row['name']),
      gender: strict(row['Gender'], r => oneOf(r, ['MALE', 'FEMALE', 'OTHER']), 'Gender', 'MALE/FEMALE/OTHER'),
      category: strict(row['Category'], r => this.normCategory(r), 'Category', 'UR/SC/ST/BC-A/BC-B/EWS/PWD'),
      categorySelection: strict(row['Category(Selection)'], r => this.normCategory(r), 'Category(Selection)', 'UR/SC/ST/BC-A/BC-B/EWS/PWD'),
      postType: strict(row['Type'], r => this.normPostType(r), 'Type', 'Budgeted/SFS/Self Financed/Contractual'),
      employmentStatus: strict(row['Employment Status'], r => oneOf(r, ['ACTIVE', 'RETIRED', 'RESIGNED', 'TERMINATED', 'SUSPENDED']), 'Employment Status', 'Active/Retired/Resigned/Terminated/Suspended'),
      subject,
      designationAppointed: appt.rank,
      designationPresent: pres.rank,
      retirementDate: parseDate(row['Retirement Date'] ?? row['retirementDate']),
      dateOfJoining: parseDate(row['Date of Joining'] ?? row['dateOfJoining']),
      mobileNumber: txt(row['Mobile Number'] ?? row['mobileNumber']),
      email: txt(row['Email Address'] ?? row['email']),
      deptName: txt(row['Department'] ?? row['department']),
      _invalids: invalids,
    };
  }

  // Map raw exceptions to safe text so bulk-upload responses never leak Prisma/DB
  // schema details (table/column/constraint names, partial SQL).
  private safeRowError(err: any): string {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return 'a record with these unique fields already exists';
      if (err.code === 'P2003') return 'references a related record that does not exist';
      return 'database constraint violation';
    }
    if (err instanceof Prisma.PrismaClientValidationError) return 'invalid field value';
    return 'could not be processed';
  }

  async bulkImport(rows: Record<string, any>[], universityId: string) {
    if (rows.length > 5000) throw new Error('Maximum 5000 rows per upload');
    const results = { success: 0, failed: 0, created: 0, updated: 0, errors: [] as string[], total: rows.length };
    const deptCache = new Map<string, string>();
    // Bound how many brand-new departments a single upload can mint (prevents a crafted
    // sheet of unique department names from creating thousands of rows).
    const MAX_NEW_DEPTS = 300;
    let newDeptCount = 0;

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

        // Reject a row that carries an unrecognised category/gender/type/status value
        // rather than silently importing it with a wrong default. The message names the
        // exact bad value so the uploader can fix the sheet and re-upload.
        if (parsed._invalids.length) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: ${parsed._invalids.join('; ')}`);
          continue;
        }

        // Resolve the department only when a name is provided (auto-create within limits).
        let departmentId: string | undefined;
        if (parsed.deptName) {
          departmentId = deptCache.get(parsed.deptName.toLowerCase());
          if (!departmentId) {
            if (newDeptCount >= MAX_NEW_DEPTS) {
              results.failed++;
              results.errors.push(`Row ${rowNum}: too many new departments in a single upload`);
              continue;
            }
            const dept = await this.prisma.department.create({ data: { name: parsed.deptName, universityId } });
            departmentId = dept.id;
            newDeptCount++;
            deptCache.set(parsed.deptName.toLowerCase(), departmentId);
          }
        }

        const existingDbId = parsed.employeeId ? empIdMap.get(parsed.employeeId) : undefined;

        if (existingDbId && existingDbId !== 'new') {
          // UPDATE by Employee ID: write only the columns present in the sheet, leaving the
          // rest untouched — lets a later "primary key + a few columns" file patch records.
          const data: Record<string, any> = {};
          const put = (k: string, v: any) => { if (v !== undefined) data[k] = v; };
          put('name', parsed.name);
          put('gender', parsed.gender);
          put('category', parsed.category);
          put('categorySelection', parsed.categorySelection);
          put('postType', parsed.postType);
          put('employmentStatus', parsed.employmentStatus);
          put('subject', parsed.subject);
          put('designationAppointed', parsed.designationAppointed);
          put('designationPresent', parsed.designationPresent);
          put('retirementDate', parsed.retirementDate);
          put('dateOfJoining', parsed.dateOfJoining);
          put('mobileNumber', parsed.mobileNumber);
          put('email', parsed.email);
          put('departmentId', departmentId);
          await this.prisma.employee.update({ where: { id: existingDbId }, data });
          results.updated++;
        } else {
          // CREATE: Name is the only hard requirement; a blank Department falls back to
          // "Unassigned"; every other blank field is left null / takes its column default.
          if (!parsed.name) {
            results.failed++;
            results.errors.push(`Row ${rowNum}: Employee Name is required to create a new record`);
            continue;
          }
          if (!departmentId) {
            departmentId = deptCache.get('unassigned');
            if (!departmentId) {
              const dept = await this.prisma.department.create({ data: { name: 'Unassigned', universityId } });
              departmentId = dept.id;
              deptCache.set('unassigned', departmentId);
            }
          }
          const createData: any = {
            universityId, departmentId,
            employeeId: parsed.employeeId ?? null,
            name: parsed.name,
            gender: parsed.gender ?? 'MALE',
            category: parsed.category ?? 'UR',
            categorySelection: parsed.categorySelection ?? parsed.category ?? 'UR',
            postType: parsed.postType ?? 'BUDGETED',
            employmentStatus: parsed.employmentStatus ?? 'ACTIVE',
            employeeClassification: 'TEACHING',
            subject: parsed.subject ?? null,
            designationAppointed: parsed.designationAppointed ?? null,
            designationPresent: parsed.designationPresent ?? null,
            retirementDate: parsed.retirementDate ?? null,
            dateOfJoining: parsed.dateOfJoining ?? null,
            mobileNumber: parsed.mobileNumber ?? null,
            email: parsed.email ?? null,
          };
          await this.prisma.employee.create({ data: createData });
          if (parsed.employeeId) empIdMap.set(parsed.employeeId, 'new');
          results.created++;
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${this.safeRowError(err)}`);
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

    // Collapse any fragmented designation ("Assistant Professor in ECE" → "Assistant Professor")
    // so every dashboard chart/legend shows the canonical ranks, regardless of how the
    // underlying records were entered. (Idempotent once the data itself is cleaned up.)
    for (const e of employees) {
      if (e.designationPresent) e.designationPresent = EmployeesService.canonRank(e.designationPresent);
    }

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
