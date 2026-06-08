import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Res,
  UseGuards, UseInterceptors, UploadedFile, ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, EmployeeFilterDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @Roles(Role.UNIVERSITY_ADMIN)
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: any) {
    dto.universityId = user.universityId;
    return this.employeesService.create(dto);
  }

  @Get()
  findAll(@Query() filters: EmployeeFilterDto, @CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : undefined;
    return this.employeesService.findAll(filters, universityId);
  }

  @Get('dashboard-stats')
  getDashboardStats(@CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : undefined;
    return this.employeesService.getDashboardStats(universityId);
  }

  @Get('dashboard-charts')
  getDashboardCharts(@Query('universityId') queryUniId: string, @CurrentUser() user: any) {
    const universityId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : (queryUniId || undefined);
    return this.employeesService.getDashboardCharts(universityId);
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const XLSX = await import('xlsx');
    const headers = [
      'Employee Name', 'Employee ID', 'Department', 'Subject',
      'Category', 'Category(Selection)', 'Type',
      'Designation(appointment)', 'Designation (Present)',
      'Gender', 'Date of Joining', 'Retirement Date',
      'Employment Status', 'Mobile Number', 'Email Address',
    ];
    const sampleRow = {
      'Employee Name': 'Dr. Rajesh Kumar',
      'Employee ID': 'EMP001',
      'Department': 'Computer Science',
      'Subject': 'Data Structures',
      'Category': 'GENERAL',
      'Category(Selection)': 'GENERAL',
      'Type': 'BUDGETED',
      'Designation(appointment)': 'Assistant Professor',
      'Designation (Present)': 'Associate Professor',
      'Gender': 'MALE',
      'Date of Joining': '2015-06-15',
      'Retirement Date': '2045-06-30',
      'Employment Status': 'ACTIVE',
      'Mobile Number': '9876543210',
      'Email Address': 'rajesh@example.ac.in',
    };
    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee-upload-template.xlsx"');
    res.send(buf);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>, @CurrentUser() user: any) {
    const emp = await this.employeesService.findOne(id);
    if (emp.universityId !== user.universityId) throw new ForbiddenException('Cannot modify another university\'s employee');
    delete dto.universityId;
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    const emp = await this.employeesService.findOne(id);
    if (emp.universityId !== user.universityId) throw new ForbiddenException('Cannot delete another university\'s employee');
    return this.employeesService.delete(id);
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
    if (emp.universityId !== user.universityId) throw new ForbiddenException('Cannot modify another university\'s employee');
    if (!photo) throw new ForbiddenException('No photo uploaded');

    const fs = await import('fs');
    const path = await import('path');
    const ext = path.extname(photo.originalname) || '.jpg';
    const filename = `${id}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'photos');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), photo.buffer);

    const photoUrl = `/uploads/photos/${filename}`;
    return this.employeesService.update(id, { photoUrl } as any);
  }

  @Post('bulk-upload')
  @Roles(Role.UNIVERSITY_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Query('universityId') universityId: string,
    @CurrentUser() user: any,
  ) {
    const uniId = user.role === Role.UNIVERSITY_ADMIN ? user.universityId : universityId;
    if (!uniId) return { success: 0, failed: 0, errors: ['University is required'], total: 0 };

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    return this.employeesService.bulkImport(rows as Record<string, any>[], uniId);
  }
}
