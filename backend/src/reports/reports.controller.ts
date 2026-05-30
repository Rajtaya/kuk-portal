import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  private resolveUniversityId(user: any, queryId?: string) {
    return user.role === Role.UNIVERSITY_ADMIN ? user.universityId : queryId;
  }

  @Get('university-wise')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.STATE_USER)
  universityWiseReport() {
    return this.reportsService.universityWiseReport();
  }

  @Get('department-wise')
  departmentWiseReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.departmentWiseReport(this.resolveUniversityId(user, universityId));
  }

  @Get('subject-wise')
  subjectWiseReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.subjectWiseReport(this.resolveUniversityId(user, universityId));
  }

  @Get('designation-wise')
  designationWiseReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.designationWiseReport(this.resolveUniversityId(user, universityId));
  }

  @Get('category-wise')
  categoryWiseReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.categoryWiseReport(this.resolveUniversityId(user, universityId));
  }

  @Get('gender-wise')
  genderWiseReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.genderWiseReport(this.resolveUniversityId(user, universityId));
  }

  @Get('teaching-staff')
  teachingStaffReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.teachingStaffReport(this.resolveUniversityId(user, universityId));
  }

  @Get('non-teaching-staff')
  nonTeachingStaffReport(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.nonTeachingStaffReport(this.resolveUniversityId(user, universityId));
  }

  @Get('retirement-due')
  retirementDueReport(@Query('months') months: number, @Query('universityId') universityId: string, @CurrentUser() user: any) {
    return this.reportsService.retirementDueReport(months || 12, this.resolveUniversityId(user, universityId));
  }

  @Get('employee-strength')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.STATE_USER)
  employeeStrengthReport() {
    return this.reportsService.employeeStrengthReport();
  }

  @Get('employee-directory')
  employeeDirectory(@Query('universityId') universityId: string, @CurrentUser() user: any) {
    const uniId = this.resolveUniversityId(user, universityId);
    return this.reportsService.employeeDirectory(uniId);
  }
}
