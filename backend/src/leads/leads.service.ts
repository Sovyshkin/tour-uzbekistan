import { BadRequestException, Injectable } from '@nestjs/common';
import { AudienceType, ContentStatus, LeadType, Locale, Prisma } from '@prisma/client';
import { Request } from 'express';

import { AdminAuditService } from '../admin/audit/admin-audit.service';
import {
  SamoClaimPayload,
  SamoIncomingResult,
  SamoIncomingService,
} from '../integrations/samo-incoming/samo-incoming.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuditService: AdminAuditService,
    private readonly samoIncomingService: SamoIncomingService,
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
        metadata: {
          samoIncoming: {
            enabled: null,
            sent: false,
            skippedReason: 'SAMO Incoming sync has not started yet',
            checkedAt: new Date().toISOString(),
          },
        },
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

    const samoResult = await this.safeSendSamoLead(lead, dto);

    const leadWithIntegration = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...(this.isPlainObject(lead.metadata) ? lead.metadata : {}),
          samoIncoming: this.toSafeSamoMetadata(samoResult),
        } as Prisma.InputJsonValue,
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
      entityId: leadWithIntegration.id,
      entityTitle: leadWithIntegration.name,
      metadata: this.buildLeadAuditMetadata(leadWithIntegration, dto, samoResult),
    });

    return {
      id: leadWithIntegration.id,
      type: leadWithIntegration.type,
      status: leadWithIntegration.status,
      language: leadWithIntegration.locale,
      createdAt: leadWithIntegration.createdAt.toISOString(),
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
    samoResult?: SamoIncomingResult,
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
      samoIncoming: samoResult ? this.toSafeSamoMetadata(samoResult) : undefined,
    };
  }

  private buildSamoClaimPayload(
    lead: Prisma.LeadGetPayload<{
      include: {
        country: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        tour: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        service: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        translations: { where: { locale: Locale }; take: 1 };
      };
    }>,
    dto: CreateLeadDto,
  ): SamoClaimPayload {
    const [firstName, ...lastNameParts] = lead.name.trim().split(/\s+/);
    const tourTitle =
      lead.tour?.translations[0]?.title ??
      lead.service?.translations[0]?.name ??
      lead.country?.translations[0]?.name ??
      lead.sourcePageTitle ??
      'B2C website lead';

    return {
      bookingId: lead.id,
      bookingNumber: `LD-${lead.createdAt.getTime()}`,
      createdAt: lead.createdAt,
      groupSize: 1,
      specialRequests: lead.translations[0]?.message ?? dto.message,
      person: {
        firstName: firstName || lead.name,
        lastName: lastNameParts.join(' ') || 'Tourist',
      },
      tour: {
        title: tourTitle,
        durationDays: lead.tour?.durationDays ?? 1,
        transport: lead.tour?.translations[0]?.transportInfo ?? null,
        hotels: lead.tour?.translations[0]?.hotelsInfo ?? null,
        includedServices: this.readStringArray(lead.tour?.translations[0]?.included),
      },
    };
  }

  private async safeSendSamoLead(
    lead: Prisma.LeadGetPayload<{
      include: {
        country: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        tour: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        service: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        translations: { where: { locale: Locale }; take: 1 };
      };
    }>,
    dto: CreateLeadDto,
  ): Promise<SamoIncomingResult> {
    try {
      return await this.samoIncomingService.sendBooking(
        this.buildSamoClaimPayload(lead, dto),
      );
    } catch (error) {
      return {
        enabled: true,
        sent: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private toSafeSamoMetadata(result: SamoIncomingResult) {
    const { requestXml: _requestXml, ...safeResult } = result;
    return {
      ...safeResult,
      rawResponse: result.rawResponse?.slice(0, 2000),
      checkedAt: new Date().toISOString(),
    };
  }

  private isPlainObject(value: unknown): value is Record<string, Prisma.JsonValue> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
