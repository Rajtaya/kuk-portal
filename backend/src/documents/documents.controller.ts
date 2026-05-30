import { Controller, Get, Post, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post(':employeeId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('employeeId') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: DocumentType = DocumentType.OTHER,
  ) {
    return this.documentsService.upload(employeeId, file, type);
  }

  @Get(':employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.documentsService.findByEmployee(employeeId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
