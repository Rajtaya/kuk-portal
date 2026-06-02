import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: any) {
    if (user.role === Role.UNIVERSITY_ADMIN) dto.universityId = user.universityId;
    return this.departmentsService.create(dto);
  }

  @Get()
  findAll(@Query('universityId') universityId?: string, @CurrentUser() user?: any) {
    const uniId = user?.role === Role.UNIVERSITY_ADMIN ? user.universityId : universityId;
    return this.departmentsService.findAll(uniId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateDepartmentDto>, @CurrentUser() user: any) {
    if (user.role === Role.UNIVERSITY_ADMIN) {
      const dept = await this.departmentsService.findOne(id) as any;
      if (dept?.universityId !== user.universityId) throw new ForbiddenException('Cannot modify another university\'s department');
      delete dto.universityId;
    }
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  delete(@Param('id') id: string) {
    return this.departmentsService.delete(id);
  }
}
