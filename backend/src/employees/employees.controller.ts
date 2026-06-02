import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, ForbiddenException,
} from '@nestjs/common';
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
  create(@Body() dto: CreateEmployeeDto) {
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  delete(@Param('id') id: string) {
    return this.employeesService.delete(id);
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
