import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

import { PrismaService } from '../../prisma/prisma.service';

type UploadedFile = {
  originalname: string;
  mimetype?: string;
  buffer?: Buffer;
  size?: number;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'application/pdf',
]);

const decodeOriginalName = (value: string) => {
  try {
    const decoded = Buffer.from(value, 'latin1').toString('utf8');
    return decoded.includes('�') ? value : decoded;
  } catch {
    return value;
  }
};

@Injectable()
export class AdminMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(file: UploadedFile, group = 'general', altText?: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    if (file.size && file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File is too large');
    }

    if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'media');
    await mkdir(uploadDir, { recursive: true });

    const originalName = decodeOriginalName(file.originalname);
    const extension = extname(originalName).toLowerCase();
    const baseName = originalName
      .replace(extension, '')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    const fileName = `${Date.now()}-${baseName || 'media'}${extension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, file.buffer);

    return this.prisma.mediaAsset.create({
      data: {
        fileName: originalName,
        url: `/uploads/media/${fileName}`,
        mimeType: file.mimetype,
        altText,
        group,
      },
    });
  }
}
