import { BadRequestException, Injectable } from '@nestjs/common';
import { AudienceType, ContentStatus, LeadType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLead(dto: CreateLeadDto) {
    await this.ensureReferencesExist(dto);

    const lead = await this.prisma.lead.create({
      data: {
        type: this.resolveLeadType(dto),
        status: 'NEW',
        audience: AudienceType.B2C,
        locale: dto.language,
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        sourcePagePath: dto.sourcePage,
        countryId: dto.countryId,
        tourId: dto.tourId,
        serviceId: dto.serviceId,
        translations: {
          create: [
            {
              locale: dto.language,
              message: dto.message,
            },
          ],
        },
      },
    });

    return {
      id: lead.id,
      type: lead.type,
      status: lead.status,
      language: lead.locale,
      createdAt: lead.createdAt.toISOString(),
    };
  }

  private async ensureReferencesExist(dto: CreateLeadDto) {
    const [tour, country, service] = await Promise.all([
      dto.tourId
        ? this.prisma.tour.findFirst({
            where: {
              id: dto.tourId,
              status: ContentStatus.PUBLISHED,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      dto.countryId
        ? this.prisma.country.findFirst({
            where: {
              id: dto.countryId,
              status: ContentStatus.PUBLISHED,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      dto.serviceId
        ? this.prisma.service.findFirst({
            where: {
              id: dto.serviceId,
              status: ContentStatus.PUBLISHED,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (dto.tourId && !tour) {
      throw new BadRequestException('Tour not found');
    }

    if (dto.countryId && !country) {
      throw new BadRequestException('Country not found');
    }

    if (dto.serviceId && !service) {
      throw new BadRequestException('Service not found');
    }
  }

  private resolveLeadType(dto: CreateLeadDto): LeadType {
    if (dto.tourId) {
      return LeadType.TOUR;
    }

    if (dto.serviceId) {
      return LeadType.SERVICE;
    }

    if (dto.countryId) {
      return LeadType.COUNTRY;
    }

    return LeadType.GENERAL;
  }
}
