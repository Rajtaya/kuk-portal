import { BadRequestException } from '@nestjs/common';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4E, 0x47] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46] }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [{ bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/vnd.ms-excel': [{ bytes: [0xD0, 0xCF, 0x11, 0xE0] }],
};

export function validateFileSignature(
  buffer: Buffer,
  declaredMime: string,
  label = 'file',
): void {
  const sigs = SIGNATURES[declaredMime];
  if (!sigs) return;

  for (const sig of sigs) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) {
      throw new BadRequestException(`Uploaded ${label} is too small or corrupted`);
    }
    const match = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (!match) {
      throw new BadRequestException(`Uploaded ${label} content does not match its declared type`);
    }
  }

  // .xlsx is just a ZIP, so the PK signature also matches jars, apks, zip bombs, etc.
  // Confirm it is genuinely an Office Open XML package by looking for its structural
  // markers near the start of the archive (the first local file headers).
  if (declaredMime === XLSX_MIME) {
    const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('latin1');
    if (!head.includes('[Content_Types].xml') && !head.includes('_rels/.rels')) {
      throw new BadRequestException(`Uploaded ${label} is not a valid Excel workbook`);
    }
  }
}
