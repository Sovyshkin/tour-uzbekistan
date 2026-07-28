import { BadRequestException, Injectable } from '@nestjs/common';
import { AudienceType, ContentStatus, LeadType, Locale, Prisma } from '@prisma/client';
import { Request } from 'express';

import { AdminAuditService } from '../admin/audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async createLead(dto: CreateLeadDto, request?: Request) {
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
        sourcePageTitle: dto.sourcePageTitle,
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
      include: {
        country: { include: { translations: { where: { locale: dto.language }, take: 1 } } },
        tour: { include: { translations: { where: { locale: dto.language }, take: 1 } } },
        service: { include: { translations: { where: { locale: dto.language }, take: 1 } } },
        translations: { where: { locale: dto.language }, take: 1 },
      },
    });

    await this.adminAuditService.log({
      request,
      action: 'CREATE',
      entityType: 'record:leads',
      entityId: lead.id,
      entityTitle: lead.name,
      metadata: this.buildLeadAuditMetadata(lead, dto),
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

  private buildLeadAuditMetadata(
    lead: Prisma.LeadGetPayload<{
      include: {
        country: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        tour: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        service: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        translations: { where: { locale: Locale }; take: 1 };
      };
    }>,
    dto: CreateLeadDto,
  ) {
    return {
      lead: {
        id: lead.id,
        type: lead.type,
        status: lead.status,
        audience: lead.audience,
        locale: lead.locale,
      },
      source: {
        pagePath: lead.sourcePagePath ?? dto.sourcePage,
        pageTitle: lead.sourcePageTitle ?? dto.sourcePageTitle ?? null,
      },
      contact: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? null,
      },
      request: {
        message: lead.translations[0]?.message ?? dto.message,
      },
      tour: lead.tour
        ? {
            id: lead.tour.id,
            slug: lead.tour.slug,
            title: lead.tour.translations[0]?.title ?? null,
          }
        : null,
      service: lead.service
        ? {
            id: lead.service.id,
            slug: lead.service.slug,
            title: lead.service.translations[0]?.name ?? null,
          }
        : null,
      country: lead.country
        ? {
            id: lead.country.id,
            slug: lead.country.slug,
            title: lead.country.translations[0]?.name ?? null,
          }
        : null,
    };
  }
}
