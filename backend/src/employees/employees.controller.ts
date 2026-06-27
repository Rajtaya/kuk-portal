import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Res,
  UseGuards, UseInterceptors, UploadedFile, ForbiddenException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeFilterDto } from './dto/create-employee.dto';
import { validateFileSignature } from '../common/file-validation.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService, private auditService: AuditService) {}

  @Post()
  @Roles(Role.UNIVERSITY_ADMIN)
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: any) {
    // Uni admins always create within their own university; super admins choose it in the form.
    if (user.role === Role.UNIVERSITY_ADMIN) dto.universityId = user.universityId;
    if (!dto.universityId) throw new BadRequestException('University is required');
    return this.employeesService.create(dto);
  }

  @Get()
  findAll(@Query() filters: EmployeeFilterDto, @CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : undefined;
    return this.employeesService.findAll(filters, universityId);
  }

  @Get('dashboard-stats')
  getDashboardStats(@Query('universityId') queryUniId: string, @CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : (queryUniId || undefined);
    return this.employeesService.getDashboardStats(universityId);
  }

  @Get('summary')
  getSummary(@Query() filters: EmployeeFilterDto, @CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : undefined;
    return this.employeesService.getSummary(filters, universityId);
  }

  @Get('dashboard-charts')
  getDashboardCharts(@Query('universityId') queryUniId: string, @CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : (queryUniId || undefined);
    return this.employeesService.getDashboardCharts(universityId);
  }

  @Get('check-duplicates')
  @Roles(Role.UNIVERSITY_ADMIN)
  async checkDuplicates(@Query('ids') ids: string, @Query('universityId') queryUniId: string, @CurrentUser() user: any) {
    // Uni admins are pinned to their own university (query param ignored — prevents probing
    // employee IDs at other universities / IDOR); super admins check the university they picked.
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : queryUniId;
    if (!ids || !universityId) return [];
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5000);
    if (!idList.length) return [];
    return this.employeesService.findExistingEmployeeIds(idList, universityId);
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const { Workbook } = await import('exceljs');
    const headers = [
      'Employee Name', 'Employee ID', 'Department', 'Subject',
      'Category', 'Category(Selection)', 'Type',
      'Designation(appointment)', 'Designation (Present)',
      'Gender', 'Date of Joining', 'Retirement Date',
      'Employment Status', 'Mobile Number', 'Email Address',
    ];
    const sampleRow = [
      'Dr. Rajesh Kumar', 'EMP001', 'Computer Science', 'Data Structures',
      'GENERAL', 'GENERAL', 'BUDGETED',
      'Assistant Professor', 'Associate Professor',
      'MALE', '2015-06-15', '2045-06-30',
      'ACTIVE', '9876543210', 'rajesh@example.ac.in',
    ];
    const wb = new Workbook();
    const ws = wb.addWorksheet('Employees');
    ws.columns = headers.map((h) => ({ header: h, width: Math.max(h.length + 2, 18) }));
    ws.addRow(sampleRow);
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee-upload-template.xlsx"');
    res.send(Buffer.from(buf));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const emp = await this.employeesService.findOne(id);
    if (user.role === Role.UNIVERSITY_ADMIN && emp.universityId !== user.universityId) {
      throw new ForbiddenException('Cannot view another university\'s employee');
    }
    return emp;
  }

  @Put(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: any) {
    delete dto.universityId;
    return this.employeesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.employeesService.delete(id, user);
  }

  // Photos are streamed through this authenticated, university-scoped endpoint instead
  // of being exposed as unauthenticated static files. Served under /api so the frontend
  // proxy makes it same-origin (cookies are sent).
  @Get(':id/photo')
  @Roles(Role.SUPER_ADMIN, Role.STATE_USER, Role.UNIVERSITY_ADMIN)
  async getPhoto(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const emp = await this.employeesService.findOne(id);
    if (user.role === Role.UNIVERSITY_ADMIN && emp.universityId !== user.universityId) {
      throw new ForbiddenException('Cannot view another university\'s employee');
    }
    if (!emp.photoUrl) throw new NotFoundException('No photo');
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'uploads', 'photos', path.basename(emp.photoUrl));
    if (!fs.existsSync(filePath)) throw new NotFoundException('Photo not found');
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'private, max-age=300',
    });
    res.sendFile(filePath);
  }

  @Post(':id/photo')
  @Roles(Role.UNIVERSITY_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
        cb(new ForbiddenException('Only JPEG, PNG, WebP images allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const emp = await this.employeesService.findOne(id);
    if (user.role === Role.UNIVERSITY_ADMIN && emp.universityId !== user.universityId) throw new ForbiddenException('Cannot modify another university\'s employee');
    if (!photo) throw new ForbiddenException('No photo uploaded');
    validateFileSignature(photo.buffer, photo.mimetype, 'photo');

    const fs = await import('fs');
    const path = await import('path');
    const extMap: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const ext = extMap[photo.mimetype] || '.jpg';
    const filename = `${id}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'photos');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), photo.buffer);

    const photoUrl = `/uploads/photos/${filename}`;
    return this.employeesService.update(id, { photoUrl } as any, user);
  }

  @Post('bulk-upload')
  @Roles(Role.UNIVERSITY_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/) && !file.mimetype.match(/^application\/vnd\.ms-excel$/)) {
        cb(new ForbiddenException('Only Excel files (.xlsx, .xls) are allowed'), false);
      } else { cb(null, true); }
    },
  }))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Query('universityId') universityId: string,
    @CurrentUser() user: any,
  ) {
    const uniId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : universityId;
    if (!uniId) return { success: 0, failed: 0, errors: ['University is required'], total: 0 };
    if (!file) throw new BadRequestException('A spreadsheet file is required');

    validateFileSignature(file.buffer, file.mimetype, 'spreadsheet');

    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    await wb.xlsx.load(file.buffer as any);
    const sheet = wb.worksheets[0];
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value); });
    const rows: Record<string, any>[] = [];
    sheet.eachRow((row, num) => {
      if (num === 1) return;
      const obj: Record<string, any> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (headers[col]) obj[headers[col]] = cell.value;
      });
      if (Object.keys(obj).length) rows.push(obj);
    });

    const result = await this.employeesService.bulkImport(rows, uniId);

    this.auditService.log({
      userId: user.id,
      action: 'BULK_UPLOAD',
      entity: 'employees',
      changes: { universityId: uniId, total: result.total, created: result.created, updated: result.updated, failed: result.failed },
      ipAddress: undefined,
    }).catch(() => {});

    return result;
  }
}
