import { BadRequestException, Injectable } from '@nestjs/common';
import { AudienceType, ContentStatus, LeadType, Locale, Prisma, UserRole, UserStatus } from '@prisma/client';
import { Request } from 'express';

import { AdminAuditService } from '../admin/audit/admin-audit.service';
import {
  SamoClaimPayload,
  SamoIncomingResult,
  SamoIncomingService,
} from '../integrations/samo-incoming/samo-incoming.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, CreatePartnerRequestDto } from './dto/create-lead.dto';

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

  async createPartnerRequest(
    dto: CreatePartnerRequestDto,
    userId: string,
    role: string,
    request?: Request,
  ) {
    if (role !== UserRole.PARTNER) {
      throw new BadRequestException('Only PARTNER can create partner requests');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        partner: {
          include: {
            translations: {
              where: { locale: dto.language },
              take: 1,
            },
          },
        },
      },
    });

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.partnerId ||
      user.partner?.isActive !== true
    ) {
      throw new BadRequestException('Partner account is pending admin approval');
    }

    await this.ensureReferencesExist({
      language: dto.language,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email,
      email: user.email,
      message: dto.message || 'Partner request',
      sourcePage: dto.sourcePage,
      sourcePageTitle: dto.sourcePageTitle,
      tourId: dto.tourId,
      travelDate: dto.travelDate,
    });

    const partnerName =
      user.partner?.translations[0]?.name ||
      `${user.firstName} ${user.lastName}`.trim() ||
      user.email;
    const peopleText = [
      `${dto.adultCount ?? 1} adult(s)`,
      `${dto.childCount ?? 0} child(ren)`,
      dto.childAges ? `child ages: ${dto.childAges}` : null,
      dto.departureCity ? `from: ${dto.departureCity}` : null,
      dto.travelDate ? `date: ${dto.travelDate}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    const message = [dto.message, `Search: ${peopleText}`].filter(Boolean).join('\n');

    const lead = await this.prisma.lead.create({
      data: {
        type: dto.tourId ? LeadType.TOUR : LeadType.GENERAL,
        status: 'NEW',
        audience: AudienceType.B2B,
        locale: dto.language,
        name: partnerName,
        email: user.partner?.email || user.email,
        phone: user.partner?.phone || user.phone,
        company: partnerName,
        partnerId: user.partnerId,
        sourcePagePath: dto.sourcePage,
        sourcePageTitle: dto.sourcePageTitle,
        tourId: dto.tourId,
        metadata: {
          partnerRequest: {
            adultCount: dto.adultCount ?? 1,
            childCount: dto.childCount ?? 0,
            childAges: dto.childAges ?? null,
            departureCity: dto.departureCity ?? null,
            travelDate: dto.travelDate ?? null,
          },
          samoIncoming: {
            enabled: null,
            sent: false,
            skippedReason: 'Partner request is manual and was not sent to SAMO automatically',
            checkedAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
        translations: {
          create: [
            {
              locale: dto.language,
              message,
            },
          ],
        },
      },
    });

    await this.adminAuditService.log({
      user: {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      request,
      action: 'CREATE',
      entityType: 'record:leads',
      entityId: lead.id,
      entityTitle: lead.name,
      metadata: {
        partnerRequest: {
          partnerId: user.partnerId,
          tourId: dto.tourId ?? null,
          adultCount: dto.adultCount ?? 1,
          childCount: dto.childCount ?? 0,
          childAges: dto.childAges ?? null,
          departureCity: dto.departureCity ?? null,
          travelDate: dto.travelDate ?? null,
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
            incomingTourId: lead.tour.incomingTourId ?? null,
            incomingHotelCode: lead.tour.incomingHotelCode ?? null,
            incomingHotelName: lead.tour.incomingHotelName ?? null,
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
      travelDate: dto.travelDate ? new Date(dto.travelDate) : undefined,
      groupSize: 1,
      incomingTourId: lead.tour?.incomingTourId ?? null,
      incomingHotelCode: lead.tour?.incomingHotelCode ?? null,
      incomingHotelName: lead.tour?.incomingHotelName ?? null,
      source: {
        audience: lead.audience,
        pagePath: lead.sourcePagePath ?? dto.sourcePage ?? null,
        pageTitle: lead.sourcePageTitle ?? dto.sourcePageTitle ?? null,
      },
      linkedEntity: this.buildLeadLinkedEntity(lead),
      specialRequests: lead.translations[0]?.message ?? dto.message,
      person: {
        firstName: firstName || lead.name,
        lastName: lastNameParts.join(' ') || 'Tourist',
        email: lead.email,
        phone: lead.phone,
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

  private buildLeadLinkedEntity(
    lead: Prisma.LeadGetPayload<{
      include: {
        country: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        tour: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        service: { include: { translations: { where: { locale: Locale }; take: 1 } } };
        translations: { where: { locale: Locale }; take: 1 };
      };
    }>,
  ) {
    if (lead.tour) {
      return {
        type: 'tour',
        id: lead.tour.id,
        slug: lead.tour.slug,
        title: lead.tour.translations[0]?.title ?? null,
      };
    }

    if (lead.service) {
      return {
        type: 'service',
        id: lead.service.id,
        slug: lead.service.slug,
        title: lead.service.translations[0]?.name ?? null,
      };
    }

    if (lead.country) {
      return {
        type: 'country',
        id: lead.country.id,
        slug: lead.country.slug,
        title: lead.country.translations[0]?.name ?? null,
      };
    }

    return undefined;
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
      requestXml: result.requestXml?.slice(0, 5000),
      rawResponse: result.rawResponse?.slice(0, 2000),
      checkedAt: new Date().toISOString(),
    };
  }

  private isPlainObject(value: unknown): value is Record<string, Prisma.JsonValue> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
