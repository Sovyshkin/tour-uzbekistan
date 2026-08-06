import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminIncomingMappingDto } from './dto/admin-incoming-mapping.dto';

@Injectable()
export class AdminIncomingMappingsService {
  constructor(private readonly prisma: PrismaService) {}

  list(type?: string) {
    return this.prisma.incomingMapping.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { cmsLabel: 'asc' }],
    });
  }

  async create(dto: AdminIncomingMappingDto) {
    return this.prisma.incomingMapping.create({
      data: this.normalizeDto(dto),
    });
  }

  async update(id: string, dto: AdminIncomingMappingDto) {
    await this.ensureExists(id);
    return this.prisma.incomingMapping.update({
      where: { id },
      data: this.normalizeDto(dto),
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);
    await this.prisma.incomingMapping.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.incomingMapping.count({ where: { id } });
    if (!exists) {
      throw new BadRequestException('Incoming mapping not found');
    }
  }

  private normalizeDto(dto: AdminIncomingMappingDto) {
    return {
      type: dto.type,
      cmsKey: dto.cmsKey.trim(),
      cmsLabel: dto.cmsLabel.trim(),
      samoCode: dto.samoCode.trim(),
      samoName: dto.samoName.trim(),
      adultCount: dto.type === 'placement' ? dto.adultCount ?? null : null,
      childCount: dto.type === 'placement' ? dto.childCount ?? null : null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };
  }
}
