import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSanctionedPostDto } from './dto/sanctioned-post.dto';
import { Role } from '@prisma/client';

@Injectable()
export class SanctionedPostsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSanctionedPostDto) {
    return this.prisma.sanctionedPost.create({ data: dto, include: { university: true, department: true } });
  }

  findAll(universityId?: string) {
    const where = universityId ? { universityId } : {};
    return this.prisma.sanctionedPost.findMany({
      where,
      include: { university: { select: { name: true, code: true } }, department: { select: { name: true } } },
      orderBy: [{ university: { name: 'asc' } }, { department: { name: 'asc' } }, { designation: 'asc' }],
    });
  }

  async update(id: string, dto: Partial<CreateSanctionedPostDto>, user?: any) {
    if (user?.role === Role.UNIVERSITY_ADMIN) {
      const post = await this.prisma.sanctionedPost.findUniqueOrThrow({ where: { id } });
      if (post.universityId !== user.universityId) throw new ForbiddenException('Access denied');
    }
    return this.prisma.sanctionedPost.update({ where: { id }, data: dto as any });
  }

  async delete(id: string, user?: any) {
    if (user?.role === Role.UNIVERSITY_ADMIN) {
      const post = await this.prisma.sanctionedPost.findUniqueOrThrow({ where: { id } });
      if (post.universityId !== user.universityId) throw new ForbiddenException('Access denied');
    }
    return this.prisma.sanctionedPost.delete({ where: { id } });
  }

  async getVacancyReport(universityId?: string) {
    const where = universityId ? { universityId } : {};

    // Two queries total (was 1 + N: a count() per post → ~492 round-trips for all-universities).
    // Fetch posts and active employees once, then compute "filled" in memory.
    const [posts, employees] = await Promise.all([
      this.prisma.sanctionedPost.findMany({
        where,
        include: { university: { select: { name: true, code: true } }, department: { select: { name: true } } },
      }),
      this.prisma.employee.findMany({
        where: { employmentStatus: 'ACTIVE', ...(universityId ? { universityId } : {}) },
        select: { universityId: true, departmentId: true, designationPresent: true, subject: true, postType: true },
      }),
    ]);

    // Bucket active employees by university+department so each post only scans its own dept.
    const buckets = new Map<string, { designation: string; subject: string; postType: string }[]>();
    for (const e of employees) {
      if (!e.departmentId) continue;
      const key = `${e.universityId}|${e.departmentId}`;
      let arr = buckets.get(key);
      if (!arr) { arr = []; buckets.set(key, arr); }
      arr.push({ designation: (e.designationPresent || '').toLowerCase().trim(), subject: (e.subject || '').toLowerCase().trim(), postType: e.postType });
    }

    return posts.map((post) => {
      const candidates = buckets.get(`${post.universityId}|${post.departmentId}`) || [];
      const desig = post.designation.toLowerCase().trim();
      const subj = post.subject ? post.subject.toLowerCase().trim() : null;

      // An employee fills this post only on an EXACT match: same present designation, same
      // post type, and (when the post specifies one) the same subject. The old substring match
      // over-counted — a "Professor" post also caught Associate/Assistant/Senior Professors,
      // and with no post-type filter, SFS staff could fill Budgeted posts — which is why
      // filled + vacant exceeded the sanctioned total (excess) instead of equalling it.
      let filled = 0;
      for (const emp of candidates) {
        if (emp.designation !== desig) continue;
        if (emp.postType !== post.postType) continue;
        if (subj && emp.subject !== subj) continue;
        filled++;
      }

      return {
        id: post.id,
        university: post.university.name,
        universityCode: post.university.code,
        department: post.department.name,
        subject: post.subject,
        designation: post.designation,
        postType: post.postType,
        sanctioned: post.sanctionedCount,
        filled,
        vacant: Math.max(0, post.sanctionedCount - filled),
        excess: Math.max(0, filled - post.sanctionedCount),
      };
    });
  }

  async bulkImport(rows: Record<string, any>[], universityId: string) {
    if (rows.length > 5000) throw new Error('Maximum 5000 rows per upload');
    const results = { success: 0, failed: 0, errors: [] as string[], total: rows.length };
    const deptCache = new Map<string, string>();

    const existingDepts = await this.prisma.department.findMany({ where: { universityId } });
    for (const d of existingDepts) deptCache.set(d.name.toLowerCase(), d.id);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const deptName = row['Department'] || '';
        const designation = row['Designation'] || '';
        const count = Number(row['Sanctioned Posts'] || row['Count'] || 0);

        if (!deptName || !designation) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Department and Designation are required`);
          continue;
        }

        let departmentId = deptCache.get(deptName.toLowerCase());
        if (!departmentId) {
          const dept = await this.prisma.department.create({ data: { name: deptName, universityId } });
          departmentId = dept.id;
          deptCache.set(deptName.toLowerCase(), departmentId);
        }

        const postTypeRaw = (row['Type'] || row['PostType'] || 'BUDGETED').toUpperCase();
        const validPostTypes = ['BUDGETED','SFS','CONTRACTUAL'];
        const postType = validPostTypes.includes(postTypeRaw) ? postTypeRaw : 'BUDGETED';

        await this.prisma.sanctionedPost.upsert({
          where: {
            universityId_departmentId_designation_subject_postType: {
              universityId,
              departmentId,
              designation,
              subject: row['Subject'] || null,
              postType: postType as any,
            },
          },
          update: { sanctionedCount: count },
          create: {
            universityId,
            departmentId,
            designation,
            subject: row['Subject'] || null,
            postType: postType as any,
            sanctionedCount: count,
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
}
