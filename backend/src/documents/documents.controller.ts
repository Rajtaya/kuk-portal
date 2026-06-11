import { Controller, Get, Post, Delete, Param, Query, Res, UseGuards, UseInterceptors, UploadedFile, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { DocumentType, Role } from '@prisma/client';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post(':employeeId')
  @Roles(Role.UNIVERSITY_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, ALLOWED_MIMES.includes(file.mimetype));
    },
  }))
  async upload(
    @Param('employeeId') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: DocumentType = DocumentType.OTHER,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('Only PDF, JPEG, PNG, and WebP files are allowed');
    await this.documentsService.verifyEmployeeOwnership(employeeId, user.universityId);
    return this.documentsService.upload(employeeId, file, type);
  }

  @Get(':employeeId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_USER, Role.UNIVERSITY_ADMIN)
  async findByEmployee(@Param('employeeId') employeeId: string, @CurrentUser() user: any) {
    if (user.role === Role.UNIVERSITY_ADMIN) {
      await this.documentsService.verifyEmployeeOwnership(employeeId, user.universityId);
    }
    return this.documentsService.findByEmployee(employeeId);
  }

  @Get('download/:id')
  @Roles(Role.SUPER_ADMIN, Role.STATE_USER, Role.UNIVERSITY_ADMIN)
  async download(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    if (user.role === Role.UNIVERSITY_ADMIN) {
      await this.documentsService.verifyDocumentOwnership(id, user.universityId);
    }
    const { filePath, fileName, mimeType } = await this.documentsService.getFileForDownload(id);
    res.set({
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Content-Type-Options': 'nosniff',
    });
    res.sendFile(filePath);
  }

  @Delete(':id')
  @Roles(Role.UNIVERSITY_ADMIN)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.documentsService.verifyDocumentOwnership(id, user.universityId);
    return this.documentsService.delete(id);
  }
}
