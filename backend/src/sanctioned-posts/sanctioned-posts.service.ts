import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSanctionedPostDto } from './dto/sanctioned-post.dto';

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

  update(id: string, dto: Partial<CreateSanctionedPostDto>) {
    return this.prisma.sanctionedPost.update({ where: { id }, data: dto as any });
  }

  delete(id: string) {
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
          category: post.category,
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
        category: post.category,
        sanctioned: post.sanctionedCount,
        filled,
        vacant: post.sanctionedCount - filled,
      });
    }

    return result;
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

        const categoryRaw = (row['Category'] || 'GENERAL').toUpperCase();
        const validCategories = ['GENERAL','SC','ST','OBC','EWS','BCA','BCB','PWD','ESM'];
        const category = validCategories.includes(categoryRaw) ? categoryRaw : 'GENERAL';

        await this.prisma.sanctionedPost.upsert({
          where: {
            universityId_departmentId_designation_category_subject: {
              universityId,
              departmentId,
              designation,
              category: category as any,
              subject: row['Subject'] || null,
            },
          },
          update: { sanctionedCount: count },
          create: {
            universityId,
            departmentId,
            designation,
            category: category as any,
            subject: row['Subject'] || null,
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
