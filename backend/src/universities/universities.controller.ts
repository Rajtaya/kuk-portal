import { Controller, Get, Post, Put, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UniversitiesService } from './universities.service';
import { CreateUniversityDto, UpdateUniversityDto } from './dto/create-university.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Universities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('universities')
export class UniversitiesController {
  constructor(private universitiesService: UniversitiesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateUniversityDto) {
    return this.universitiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.universitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role === Role.UNIVERSITY_ADMIN && id !== user.universityId) {
      throw new ForbiddenException('Cannot view another university');
    }
    return this.universitiesService.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role === Role.UNIVERSITY_ADMIN && id !== user.universityId) {
      throw new ForbiddenException('Cannot view another university\'s stats');
    }
    return this.universitiesService.getStats(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUniversityDto) {
    return this.universitiesService.update(id, dto);
  }
}
