import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Masters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('masters')
export class MastersController {
  constructor(private mastersService: MastersService) {}

  @Get('subjects')
  getSubjects() {
    return this.mastersService.getSubjects();
  }

  @Post('subjects')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  createSubject(@Body('name') name: string) {
    return this.mastersService.createSubject(name);
  }

  @Put('subjects/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  updateSubject(@Param('id') id: string, @Body('name') name: string) {
    return this.mastersService.updateSubject(id, name);
  }

  @Delete('subjects/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  deleteSubject(@Param('id') id: string) {
    return this.mastersService.deleteSubject(id);
  }

  @Get('designations')
  getDesignations() {
    return this.mastersService.getDesignations();
  }

  @Post('designations')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  createDesignation(@Body('name') name: string) {
    return this.mastersService.createDesignation(name);
  }

  @Delete('designations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  deleteDesignation(@Param('id') id: string) {
    return this.mastersService.deleteDesignation(id);
  }
}
