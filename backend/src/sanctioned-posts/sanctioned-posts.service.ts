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
    const posts = await this.prisma.sanctionedPost.findMany({
      where,
      include: { university: { select: { name: true, code: true } }, department: { select: { name: true } } },
    });

    const result: any[] = [];
    for (const post of posts) {
      const filled = await this.prisma.employee.count({
        where: {
          universityId: post.universityId,
          departmentId: post.departmentId,
          designationPresent: { contains: post.designation, mode: 'insensitive' },
          employmentStatus: 'ACTIVE',
          ...(post.subject ? { subject: { contains: post.subject, mode: 'insensitive' } } : {}),
        },
      });

      result.push({
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
      });
    }

    return result;
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
