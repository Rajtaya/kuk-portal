import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SanctionedPostsService } from './sanctioned-posts.service';
import { CreateSanctionedPostDto } from './dto/sanctioned-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sanctioned Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sanctioned-posts')
export class SanctionedPostsController {
  constructor(private service: SanctionedPostsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  create(@Body() dto: CreateSanctionedPostDto, @CurrentUser() user: any) {
    if (user.role === Role.UNIVERSITY_ADMIN) dto.universityId = user.universityId;
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('universityId') universityId?: string, @CurrentUser() user?: any) {
    const uniId = user?.role === Role.UNIVERSITY_ADMIN ? user.universityId : universityId;
    return this.service.findAll(uniId);
  }

  @Get('vacancy-report')
  vacancyReport(@Query('universityId') universityId?: string, @CurrentUser() user?: any) {
    const uniId = user?.role === Role.UNIVERSITY_ADMIN ? user.universityId : universityId;
    return this.service.getVacancyReport(uniId);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateSanctionedPostDto>, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.delete(id, user);
  }

  @Post('bulk-upload')
  @Roles(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN)
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

    return this.service.bulkImport(rows as Record<string, any>[], uniId);
  }
}
