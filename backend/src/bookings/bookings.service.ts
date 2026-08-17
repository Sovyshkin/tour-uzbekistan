import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Locale, Prisma, UserRole, UserStatus } from '@prisma/client';
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

type BookingTravelerSnapshot = {
  type: 'adult' | 'child';
  firstName: string;
  lastName: string;
  sex?: string | null;
  birthDate?: string | null;
  nationality?: string | null;
  documentType?: string | null;
  documentSeries?: string | null;
  documentNumber?: string | null;
  documentIssuedAt?: string | null;
  documentValidUntil?: string | null;
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
    const partnerUser = await this.getPartnerUser(userId, role, true);
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

    const adultCount = dto.adultCount ?? Math.max(1, dto.groupSize ?? 1);
    const childCount = dto.childCount ?? 0;
    const groupSize = adultCount + childCount;
    this.validateTravelerCounts(adultCount, childCount, tour);
    const travelers = this.normalizeTravelers(dto, adultCount, childCount);
    const primaryTraveler = travelers[0];

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber: this.generateBookingNumber(),
        status: 'PENDING',
        audience: 'B2B',
        locale,
        tourId: tour.id,
        partnerId: partnerUser.partnerId,
        countryId: tour.countryId,
        firstName: primaryTraveler.firstName,
        lastName: primaryTraveler.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        sex: primaryTraveler.sex ?? undefined,
        birthDate: primaryTraveler.birthDate ? new Date(primaryTraveler.birthDate) : undefined,
        nationality: primaryTraveler.nationality ?? undefined,
        documentType: primaryTraveler.documentType ?? undefined,
        documentSeries: primaryTraveler.documentSeries ?? undefined,
        documentNumber: primaryTraveler.documentNumber ?? undefined,
        documentIssuedAt: primaryTraveler.documentIssuedAt
          ? new Date(primaryTraveler.documentIssuedAt)
          : undefined,
        documentValidUntil: primaryTraveler.documentValidUntil
          ? new Date(primaryTraveler.documentValidUntil)
          : undefined,
        travelDate: dto.travelDate ? new Date(dto.travelDate) : undefined,
        adultCount,
        childCount,
        groupSize,
        hotelName: dto.hotelName,
        totalPrice: tour.priceFrom ?? undefined,
        currency: tour.currency ?? undefined,
        sourcePagePath: dto.sourcePage,
        includedServicesSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        metadata: {
          travelers,
          childAges: this.parseChildAges(dto.childAges),
        } as Prisma.InputJsonValue,
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
      this.buildSamoClaimPayload(booking, snapshot, dto, tour),
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
    const partnerUser = await this.getPartnerUser(userId, role, false);

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

  private async getPartnerUser(
    userId: string,
    role: string,
    requireApproved: boolean,
  ) {
    if (role !== UserRole.PARTNER) {
      throw new ForbiddenException('Only PARTNER can access bookings');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        partnerId: true,
        preferredLocale: true,
        partner: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!user || user.role !== UserRole.PARTNER || !user.partnerId) {
      throw new ForbiddenException('Only PARTNER can access bookings');
    }

    if (
      requireApproved &&
      (user.status !== UserStatus.ACTIVE || user.partner?.isActive !== true)
    ) {
      throw new ForbiddenException('Partner account is pending admin approval');
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
      travelDate: booking.travelDate?.toISOString() ?? null,
      adultCount: booking.adultCount ?? null,
      childCount: booking.childCount ?? null,
      groupSize: booking.groupSize ?? null,
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

  private parseChildAges(value?: string) {
    return String(value ?? '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((age) => Number.isFinite(age) && age >= 0 && age < 18);
  }

  private readChildAges(value: Prisma.JsonValue | null | undefined) {
    if (!this.isPlainObject(value) || !Array.isArray(value.childAges)) {
      return [];
    }

    return value.childAges.filter((age): age is number => typeof age === 'number');
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
        adultCount: booking.adultCount ?? null,
        childCount: booking.childCount ?? null,
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
    tour: {
      slug: string;
      durationDays: number;
      incomingTourId: string | null;
      incomingHotelCode: string | null;
      incomingHotelName: string | null;
    },
  ): SamoClaimPayload {
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      createdAt: booking.createdAt,
      travelDate: booking.travelDate,
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      childAges: this.readChildAges(booking.metadata),
      groupSize: booking.groupSize,
      hotelName: booking.hotelName,
      incomingTourId: tour.incomingTourId,
      incomingHotelCode: tour.incomingHotelCode,
      incomingHotelName: tour.incomingHotelName,
      source: {
        audience: booking.audience,
        pagePath: booking.sourcePagePath ?? dto.sourcePage ?? null,
        pageTitle: snapshot.title,
      },
      linkedEntity: {
        type: 'tour',
        id: snapshot.tourId,
        slug: tour.slug,
        title: snapshot.title,
      },
      specialRequests: booking.translations[0]?.specialRequests ?? dto.specialRequests,
      person: {
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        phone: booking.phone,
        sex: booking.sex,
        birthDate: booking.birthDate,
        nationality: booking.nationality,
        documentSeries: booking.documentSeries,
        documentNumber: booking.documentNumber,
        documentIssuedAt: booking.documentIssuedAt,
        documentValidUntil: booking.documentValidUntil,
      },
      travelers: this.readTravelers(booking.metadata),
      tour: {
        title: snapshot.title,
        durationDays: tour.durationDays,
        price: snapshot.price,
        currency: snapshot.currency,
        transport: snapshot.transport,
        hotels: snapshot.hotels,
        includedServices: snapshot.includedServices,
      },
    };
  }

  private validateTravelerCounts(
    adultCount: number,
    childCount: number,
    tour: {
      minAdultCount: number | null;
      maxAdultCount: number | null;
      minChildCount: number | null;
      maxChildCount: number | null;
    },
  ) {
    if (tour.minAdultCount !== null && adultCount < tour.minAdultCount) {
      throw new BadRequestException(`Adults cannot be less than ${tour.minAdultCount}`);
    }

    if (tour.maxAdultCount !== null && adultCount > tour.maxAdultCount) {
      throw new BadRequestException(`Adults cannot be more than ${tour.maxAdultCount}`);
    }

    if (tour.minChildCount !== null && childCount < tour.minChildCount) {
      throw new BadRequestException(`Children cannot be less than ${tour.minChildCount}`);
    }

    if (tour.maxChildCount !== null && childCount > tour.maxChildCount) {
      throw new BadRequestException(`Children cannot be more than ${tour.maxChildCount}`);
    }
  }

  private normalizeTravelers(
    dto: CreateBookingDto,
    adultCount: number,
    childCount: number,
  ): BookingTravelerSnapshot[] {
    const expectedCount = adultCount + childCount;
    const sourceTravelers =
      Array.isArray(dto.travelers) && dto.travelers.length > 0
        ? dto.travelers
        : Array.from({ length: expectedCount }, (_, index) => ({
            type: index < adultCount ? ('adult' as const) : ('child' as const),
            firstName: index === 0 ? dto.firstName : `Traveler ${index + 1}`,
            lastName: index === 0 ? dto.lastName : 'Tourist',
            sex: index === 0 ? dto.sex : index < adultCount ? 'MR' : 'CHD',
            birthDate: index === 0 ? dto.birthDate : undefined,
            nationality: index === 0 ? dto.nationality : undefined,
            documentType: index === 0 ? dto.documentType : undefined,
            documentSeries: index === 0 ? dto.documentSeries : undefined,
            documentNumber: index === 0 ? dto.documentNumber : undefined,
            documentIssuedAt: index === 0 ? dto.documentIssuedAt : undefined,
            documentValidUntil: index === 0 ? dto.documentValidUntil : undefined,
          }));

    if (sourceTravelers.length !== expectedCount) {
      throw new BadRequestException(`Travelers count must be ${expectedCount}`);
    }

    return sourceTravelers.map((traveler, index) => {
      const type: 'adult' | 'child' = index < adultCount ? 'adult' : 'child';
      const firstName = traveler.firstName?.trim();
      const lastName = traveler.lastName?.trim();

      if (!firstName || !lastName) {
        throw new BadRequestException(`Traveler ${index + 1} first name and last name are required`);
      }

      return {
        type,
        firstName,
        lastName,
        sex: traveler.sex?.trim() || (type === 'child' ? 'CHD' : 'MR'),
        birthDate: traveler.birthDate || null,
        nationality: traveler.nationality?.trim() || null,
        documentType: traveler.documentType?.trim() || null,
        documentSeries: traveler.documentSeries?.trim() || null,
        documentNumber: traveler.documentNumber?.trim() || null,
        documentIssuedAt: traveler.documentIssuedAt || null,
        documentValidUntil: traveler.documentValidUntil || null,
      };
    });
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

  private readIntegration(value: Prisma.JsonValue | null | undefined) {
    if (!this.isPlainObject(value) || !this.isPlainObject(value.samoIncoming)) {
      return null;
    }

    return value.samoIncoming;
  }

  private readTravelers(value: Prisma.JsonValue | null | undefined) {
    if (!this.isPlainObject(value) || !Array.isArray(value.travelers)) {
      return undefined;
    }

    return value.travelers
      .filter((traveler): traveler is Record<string, Prisma.JsonValue> => this.isPlainObject(traveler))
      .map((traveler) => ({
        type: typeof traveler.type === 'string' ? traveler.type : null,
        firstName: typeof traveler.firstName === 'string' ? traveler.firstName : '',
        lastName: typeof traveler.lastName === 'string' ? traveler.lastName : '',
        sex: typeof traveler.sex === 'string' ? traveler.sex : null,
        birthDate:
          typeof traveler.birthDate === 'string' && traveler.birthDate
            ? new Date(traveler.birthDate)
            : null,
        nationality: typeof traveler.nationality === 'string' ? traveler.nationality : null,
        documentSeries:
          typeof traveler.documentSeries === 'string' ? traveler.documentSeries : null,
        documentNumber:
          typeof traveler.documentNumber === 'string' ? traveler.documentNumber : null,
        documentIssuedAt:
          typeof traveler.documentIssuedAt === 'string' && traveler.documentIssuedAt
            ? new Date(traveler.documentIssuedAt)
            : null,
        documentValidUntil:
          typeof traveler.documentValidUntil === 'string' && traveler.documentValidUntil
            ? new Date(traveler.documentValidUntil)
            : null,
      }));
  }

  private isPlainObject(value: unknown): value is Record<string, Prisma.JsonValue> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
