import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminDepartureCityDto } from './dto/admin-departure-city.dto';

@Injectable()
export class AdminDepartureCitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.departureCity.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: AdminDepartureCityDto) {
    return this.prisma.departureCity.create({
      data: this.normalizeDto(dto),
    });
  }

  async update(id: string, dto: AdminDepartureCityDto) {
    await this.ensureExists(id);
    return this.prisma.departureCity.update({
      where: { id },
      data: this.normalizeDto(dto),
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);
    await this.prisma.departureCity.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.departureCity.count({ where: { id } });
    if (!exists) {
      throw new BadRequestException('Departure city not found');
    }
  }

  private normalizeDto(dto: AdminDepartureCityDto) {
    const name = String(dto.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Departure city name is required');
    }

    return {
      name,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };
  }
}
