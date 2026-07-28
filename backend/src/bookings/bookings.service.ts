import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Locale, Prisma, UserRole } from '@prisma/client';
import { Request } from 'express';

import { AdminAuditService } from '../admin/audit/admin-audit.service';
import {
  SamoClaimPayload,
  SamoIncomingResult,
  SamoIncomingService,
} from '../integrations/samo-incoming/samo-incoming.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

type TourSnapshot = {
  tourId: string;
  title: string;
  price: string | null;
  currency: string | null;
  program: Array<{
    dayNumber: number;
    title: string;
    description: string;
  }>;
  transport: string | null;
  hotels: string | null;
  includedServices: string[];
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuditService: AdminAuditService,
    private readonly samoIncomingService: SamoIncomingService,
  ) {}

  async createBooking(
    dto: CreateBookingDto,
    userId: string,
    role: string,
    request?: Request,
  ) {
    const partnerUser = await this.getPartnerUser(userId, role);
    const locale = dto.locale ?? partnerUser.preferredLocale ?? Locale.ru;

    const tour = await this.prisma.tour.findFirst({
      where: {
        id: dto.tourId,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
          },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const translation = tour.translations[0];
    const snapshot: TourSnapshot = {
      tourId: tour.id,
      title: translation?.title ?? '',
      price: tour.priceFrom?.toString() ?? null,
      currency: tour.currency ?? null,
      program: tour.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.translations[0]?.title ?? '',
        description: day.translations[0]?.description ?? '',
      })),
      transport: translation?.transportInfo ?? null,
      hotels: translation?.hotelsInfo ?? null,
      includedServices: this.readStringArray(translation?.included),
    };

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber: this.generateBookingNumber(),
        status: 'PENDING',
        audience: 'B2B',
        locale,
        tourId: tour.id,
        partnerId: partnerUser.partnerId,
        countryId: tour.countryId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        sex: dto.sex,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        nationality: dto.nationality,
        documentType: dto.documentType,
        documentSeries: dto.documentSeries,
        documentNumber: dto.documentNumber,
        documentIssuedAt: dto.documentIssuedAt
          ? new Date(dto.documentIssuedAt)
          : undefined,
        documentValidUntil: dto.documentValidUntil
          ? new Date(dto.documentValidUntil)
          : undefined,
        travelDate: dto.travelDate ? new Date(dto.travelDate) : undefined,
        groupSize: dto.groupSize,
        hotelName: dto.hotelName,
        totalPrice: tour.priceFrom ?? undefined,
        currency: tour.currency ?? undefined,
        sourcePagePath: dto.sourcePage,
        includedServicesSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        translations: {
          create: [
            {
              locale,
              packageTitle: snapshot.title,
              packageSummary: `${tour.durationDays} days / ${tour.durationNights} nights`,
              specialRequests: dto.specialRequests,
            },
          ],
        },
      },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
      },
    });

    const samoResult = await this.samoIncomingService.sendBooking(
      this.buildSamoClaimPayload(booking, snapshot, dto, tour.durationDays),
    );

    const bookingWithIntegration = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        metadata: {
          ...(this.isPlainObject(booking.metadata) ? booking.metadata : {}),
          samoIncoming: this.toSafeSamoMetadata(samoResult),
        } as Prisma.InputJsonValue,
      },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
      },
    });

    await this.adminAuditService.log({
      user: {
        sub: partnerUser.id,
        email: partnerUser.email,
        role: partnerUser.role,
      },
      request,
      action: 'CREATE',
      entityType: 'record:bookings',
      entityId: bookingWithIntegration.id,
      entityTitle: bookingWithIntegration.bookingNumber,
      metadata: this.buildBookingAuditMetadata(
        bookingWithIntegration,
        snapshot,
        dto,
        samoResult,
      ),
    });

    return this.mapBooking(bookingWithIntegration, snapshot);
  }

  async getMyBookings(userId: string, role: string) {
    const partnerUser = await this.getPartnerUser(userId, role);

    const bookings = await this.prisma.booking.findMany({
      where: {
        partnerId: partnerUser.partnerId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        translations: {
          where: { locale: partnerUser.preferredLocale },
          take: 1,
        },
      },
    });

    return bookings.map((booking) =>
      this.mapBooking(booking, this.readSnapshot(booking.includedServicesSnapshot)),
    );
  }

  private async getPartnerUser(userId: string, role: string) {
    if (role !== UserRole.PARTNER) {
      throw new ForbiddenException('Only PARTNER can access bookings');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        partnerId: true,
        preferredLocale: true,
      },
    });

    if (!user || user.role !== UserRole.PARTNER || !user.partnerId) {
      throw new ForbiddenException('Only PARTNER can access bookings');
    }

    return user;
  }

  private mapBooking(
    booking: Prisma.BookingGetPayload<{
      include: { translations: { where: { locale: Locale }; take: 1 } };
    }>,
    snapshot: TourSnapshot,
  ) {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      locale: booking.locale,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone ?? null,
      sourcePage: booking.sourcePagePath ?? null,
      specialRequests: booking.translations[0]?.specialRequests ?? null,
      integration: this.readIntegration(booking.metadata),
      snapshot,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private readSnapshot(value: Prisma.JsonValue | null | undefined): TourSnapshot {
    const snapshot = (value ?? {}) as Partial<TourSnapshot>;

    return {
      tourId: snapshot.tourId ?? '',
      title: snapshot.title ?? '',
      price: snapshot.price ?? null,
      currency: snapshot.currency ?? null,
      program: Array.isArray(snapshot.program) ? snapshot.program : [],
      transport: snapshot.transport ?? null,
      hotels: snapshot.hotels ?? null,
      includedServices: Array.isArray(snapshot.includedServices)
        ? snapshot.includedServices.filter(
            (item): item is string => typeof item === 'string',
          )
        : [],
    };
  }

  private generateBookingNumber() {
    return `BK-${Date.now()}`;
  }

  private buildBookingAuditMetadata(
    booking: Prisma.BookingGetPayload<{
      include: { translations: { where: { locale: Locale }; take: 1 } };
    }>,
    snapshot: TourSnapshot,
    dto: CreateBookingDto,
    samoResult?: SamoIncomingResult,
  ) {
    return {
      booking: {
        number: booking.bookingNumber,
        status: booking.status,
        audience: booking.audience,
        locale: booking.locale,
        sourcePage: booking.sourcePagePath ?? null,
        travelDate: booking.travelDate?.toISOString() ?? null,
        groupSize: booking.groupSize ?? null,
      },
      customer: {
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        phone: booking.phone ?? null,
      },
      tour: {
        id: snapshot.tourId,
        title: snapshot.title,
        price: snapshot.price,
        currency: snapshot.currency,
        transport: snapshot.transport,
        hotels: snapshot.hotels,
        requestedHotel: dto.hotelName ?? null,
        includedServices: snapshot.includedServices,
        program: snapshot.program.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
        })),
      },
      samoIncoming: samoResult ? this.toSafeSamoMetadata(samoResult) : undefined,
    };
  }

  private buildSamoClaimPayload(
    booking: Prisma.BookingGetPayload<{
      include: { translations: { where: { locale: Locale }; take: 1 } };
    }>,
    snapshot: TourSnapshot,
    dto: CreateBookingDto,
    durationDays: number,
  ): SamoClaimPayload {
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      createdAt: booking.createdAt,
      travelDate: booking.travelDate,
      groupSize: booking.groupSize,
      hotelName: booking.hotelName,
      specialRequests: booking.translations[0]?.specialRequests ?? dto.specialRequests,
      person: {
        firstName: booking.firstName,
        lastName: booking.lastName,
        sex: booking.sex,
        birthDate: booking.birthDate,
        documentSeries: booking.documentSeries,
        documentNumber: booking.documentNumber,
      },
      tour: {
        title: snapshot.title,
        durationDays,
        transport: snapshot.transport,
        hotels: snapshot.hotels,
        includedServices: snapshot.includedServices,
      },
    };
  }

  private toSafeSamoMetadata(result: SamoIncomingResult) {
    const { requestXml: _requestXml, ...safeResult } = result;
    return {
      ...safeResult,
      rawResponse: result.rawResponse?.slice(0, 2000),
    };
  }

  private readIntegration(value: Prisma.JsonValue | null | undefined) {
    if (!this.isPlainObject(value) || !this.isPlainObject(value.samoIncoming)) {
      return null;
    }

    return value.samoIncoming;
  }

  private isPlainObject(value: unknown): value is Record<string, Prisma.JsonValue> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
