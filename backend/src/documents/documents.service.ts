import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DocumentType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  private uploadDir = process.env.UPLOAD_DIR || './uploads';

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async verifyEmployeeOwnership(employeeId: string, universityId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { universityId: true } });
    if (!emp) throw new NotFoundException('Employee not found');
    if (emp.universityId !== universityId) throw new ForbiddenException('Cannot access another university\'s employee');
  }

  async verifyDocumentOwnership(documentId: string, universityId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { employee: { select: { universityId: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.employee.universityId !== universityId) throw new ForbiddenException('Cannot access another university\'s document');
  }

  private readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

  async upload(employeeId: string, file: Express.Multer.File, type: DocumentType) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ForbiddenException('File type not allowed');
    }
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filePath = path.join(this.uploadDir, safeName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.document.create({
      data: {
        employeeId,
        type,
        fileName: file.originalname,
        fileUrl: `/uploads/${safeName}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  async getFileForDownload(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    const filePath = path.resolve(this.uploadDir, path.basename(doc.fileUrl));
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found on disk');
    return { filePath, fileName: doc.fileName, mimeType: doc.mimeType };
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
