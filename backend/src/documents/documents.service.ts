import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DocumentType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private uploadDir = process.env.UPLOAD_DIR || './uploads';

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(employeeId: string, file: Express.Multer.File, type: DocumentType) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.document.create({
      data: {
        employeeId,
        type,
        fileName: file.originalname,
        fileUrl: `/uploads/${fileName}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  findByEmployee(employeeId: string) {
    return this.prisma.document.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const filePath = path.join(this.uploadDir, path.basename(doc.fileUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return this.prisma.document.delete({ where: { id } });
  }
}
