import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma, UserRole, UserStatus } from '@prisma/client';

import { pickTranslation } from '../common/translation.util';
import { SamoIncomingService } from '../integrations/samo-incoming/samo-incoming.service';
import { PrismaService } from '../prisma/prisma.service';
import { ToursQueryDto } from './dto/tours-query.dto';

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly samoIncomingService: SamoIncomingService,
  ) {}

  async getTours(
    query: ToursQueryDto,
    viewer?: { sub: string; role: string } | null,
  ) {
    const locale = query.locale ?? Locale.ru;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 9;
    const skip = (page - 1) * pageSize;
    const canViewPrices = await this.canViewPartnerPrices(viewer);
    const where = this.buildWhere(query, locale, canViewPrices);

    const [total, tours, linkedPlacements] = await Promise.all([
      this.prisma.tour.count({ where }),
      this.prisma.tour.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: this.buildInclude(),
      }),
      this.getLinkedIncomingPlacements(canViewPrices),
    ]);

    const items = await Promise.all(
      tours.map((tour) =>
        this.mapTourSummary(tour, canViewPrices, locale, linkedPlacements, query),
      ),
    );

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getTourBySlug(
    slug: string,
    locale: Locale = Locale.ru,
    viewer?: { sub: string; role: string } | null,
  ) {
    const canViewPrices = await this.canViewPartnerPrices(viewer);
    const tour = await this.prisma.tour.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
      },
      include: this.buildInclude(),
    });

    if (!tour) {
      return null;
    }

    const linkedPlacements = await this.getLinkedIncomingPlacements(canViewPrices);

    return this.mapTourDetail(tour, canViewPrices, locale, linkedPlacements);
  }

  private buildWhere(
    query: ToursQueryDto,
    locale: Locale,
    canFilterByPrice: boolean,
  ): Prisma.TourWhereInput {
    const where: Prisma.TourWhereInput = {
      status: ContentStatus.PUBLISHED,
    };

    if (query.country) {
      where.country = {
        slug: query.country,
        status: ContentStatus.PUBLISHED,
      };
    }

    if (query.from) {
      where.departureCity = {
        equals: query.from,
        mode: 'insensitive',
      };
    }

    if (query.adults !== undefined || query.children !== undefined) {
      const adults = query.adults ?? 1;
      const children = query.children ?? 0;
      const totalTourists = adults + children;
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: [{ minAdultCount: null }, { minAdultCount: { lte: adults } }] },
        { OR: [{ maxAdultCount: null }, { maxAdultCount: { gte: adults } }] },
        { OR: [{ minChildCount: null }, { minChildCount: { lte: children } }] },
        { OR: [{ maxChildCount: null }, { maxChildCount: { gte: children } }] },
        { OR: [{ maxTouristCount: null }, { maxTouristCount: { gte: totalTourists } }] },
      ];
    }

    if (query.minDuration !== undefined || query.maxDuration !== undefined) {
      where.durationDays = {};

      if (query.minDuration !== undefined) {
        where.durationDays.gte = query.minDuration;
      }

      if (query.maxDuration !== undefined) {
        where.durationDays.lte = query.maxDuration;
      }
    }

    if (query.minStars !== undefined || query.maxStars !== undefined) {
      where.comfortLevel = {};

      if (query.minStars !== undefined) {
        where.comfortLevel.gte = query.minStars;
      }

      if (query.maxStars !== undefined) {
        where.comfortLevel.lte = query.maxStars;
      }
    }

    if (
      canFilterByPrice &&
      (query.minPrice !== undefined || query.maxPrice !== undefined)
    ) {
      where.priceFrom = {};

      if (query.minPrice !== undefined) {
        where.priceFrom.gte = query.minPrice;
      }

      if (query.maxPrice !== undefined) {
        where.priceFrom.lte = query.maxPrice;
      }
    }

    if (query.search) {
      const searchLocales = locale === Locale.ru ? [locale] : [locale, Locale.ru];

      where.OR = [
        {
          translations: {
            some: {
              locale: { in: searchLocales },
              title: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          translations: {
            some: {
              locale: { in: searchLocales },
              route: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          translations: {
            some: {
              locale: { in: searchLocales },
              description: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    return where;
  }

  private buildInclude() {
    return {
      country: {
        include: {
          translations: true,
        },
      },
      translations: true,
      images: {
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        include: {
          translations: true,
        },
      },
      days: {
        orderBy: { dayNumber: 'asc' },
        include: {
          translations: true,
        },
      },
    } satisfies Prisma.TourInclude;
  }

  private async mapTourSummary(
    tour: Prisma.TourGetPayload<{ include: ReturnType<ToursService['buildInclude']> }>,
    isAuthorized: boolean,
    locale: Locale,
    linkedPlacements: Array<{ adultCount: number; childCount: number; label: string }>,
    query?: ToursQueryDto,
  ) {
    const translation = pickTranslation(tour.translations, locale);
    const countryTranslation = pickTranslation(tour.country.translations, locale);
    const payload = {
      id: tour.id,
      slug: tour.slug,
      title: translation?.title ?? '',
      subtitle: translation?.subtitle ?? null,
      route: translation?.route ?? '',
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      minAdultCount: tour.minAdultCount,
      maxAdultCount: tour.maxAdultCount,
      minChildCount: tour.minChildCount,
      maxChildCount: tour.maxChildCount,
      maxTouristCount: tour.maxTouristCount,
      departureCity: tour.departureCity,
      country: countryTranslation?.name ?? null,
      heroImage: tour.heroImage,
      mainImage: tour.mainImage,
      mainImageSettings: tour.mainImageSettings,
      routeMapImage: tour.routeMapImage,
      routeMapImageSettings: tour.routeMapImageSettings,
      comfortLevel: tour.comfortLevel,
      transportInfo: translation?.transportInfo ?? null,
      hotelsInfo: translation?.hotelsInfo ?? null,
      included: this.readStringArray(translation?.included),
      images: tour.images.map((image) => {
        const imageTranslation = pickTranslation(image.translations, locale);

        return {
          id: image.id,
          imageUrl: image.imageUrl,
          isCover: image.isCover,
          altText: imageTranslation?.altText ?? null,
          caption: imageTranslation?.caption ?? null,
        };
      }),
      program: tour.days.map((day) => {
        const dayTranslation = pickTranslation(day.translations, locale);

        return {
          id: day.id,
          dayNumber: day.dayNumber,
          overnightAt: day.overnightAt,
          image: day.image,
          title: dayTranslation?.title ?? '',
          shortTitle: dayTranslation?.shortTitle ?? null,
          description: dayTranslation?.description ?? '',
          inclusions: this.readStringArray(dayTranslation?.inclusions),
        };
      }),
    } as Record<string, unknown>;

    if (isAuthorized) {
      const adults = query?.adults ?? 2;
      const children = query?.children ?? 0;
      const childAges = this.parseChildAges(query?.childAges);
      const matchingPlacement = linkedPlacements.find((placement) =>
        placement.adultCount === adults &&
        placement.childCount === children &&
        this.matchesChildAgeRanges(placement.label, childAges, children),
      );
      const shouldQuote = Boolean(
        query?.adults !== undefined ||
          query?.children !== undefined ||
          query?.childAges,
      );

      payload.incomingPlacements = linkedPlacements;
      payload.hasMatchingPlacement = Boolean(matchingPlacement);

      if (matchingPlacement && shouldQuote) {
        const quote = await this.samoIncomingService.quoteTourPrice({
          bookingId: tour.id,
          bookingNumber: `QUOTE-${tour.id}`,
          createdAt: new Date(),
          adultCount: adults,
          childCount: children,
          childAges,
          incomingTourId: tour.incomingTourId,
          incomingHotelCode: tour.incomingHotelCode,
          incomingHotelName: tour.incomingHotelName,
          person: {
            firstName: 'Quote',
            lastName: 'Request',
          },
          tour: {
            title: translation?.title ?? '',
            durationDays: tour.durationDays,
            includedServices: [],
          },
        });

        payload.priceQuote = quote;
        if (quote.amount) {
          payload.priceFrom = String(quote.amount);
          payload.currency = quote.currency ?? tour.currency ?? null;
        }
      } else if (matchingPlacement && tour.priceFrom) {
        payload.priceFrom = tour.priceFrom.toString();
        payload.currency = tour.currency ?? null;
      }
    }

    return payload;
  }

  private mapTourDetail(
    tour: Prisma.TourGetPayload<{ include: ReturnType<ToursService['buildInclude']> }>,
    isAuthorized: boolean,
    locale: Locale,
    linkedPlacements: Array<{ adultCount: number; childCount: number; label: string }>,
  ) {
    const translation = pickTranslation(tour.translations, locale);
    const countryTranslation = pickTranslation(tour.country.translations, locale);
    const payload = {
      id: tour.id,
      slug: tour.slug,
      title: translation?.title ?? '',
      subtitle: translation?.subtitle ?? null,
      route: translation?.route ?? '',
      description: translation?.description ?? '',
      detailsInfo: translation?.detailsInfo ?? null,
      routesInfo: translation?.routesInfo ?? null,
      reviewsInfo: translation?.reviewsInfo ?? null,
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      minGroupSize: tour.minGroupSize,
      maxGroupSize: tour.maxGroupSize,
      minAdultCount: tour.minAdultCount,
      maxAdultCount: tour.maxAdultCount,
      minChildCount: tour.minChildCount,
      maxChildCount: tour.maxChildCount,
      maxTouristCount: tour.maxTouristCount,
      departureCity: tour.departureCity,
      country: countryTranslation?.name ?? null,
      heroImage: tour.heroImage,
      mainImage: tour.mainImage,
      mainImageSettings: tour.mainImageSettings,
      routeMapImage: tour.routeMapImage,
      routeMapImageSettings: tour.routeMapImageSettings,
      comfortLevel: tour.comfortLevel,
      transportInfo: translation?.transportInfo ?? null,
      hotelsInfo: translation?.hotelsInfo ?? null,
      countriesInfo: translation?.countriesInfo ?? null,
      included: this.readStringArray(translation?.included),
      excluded: this.readStringArray(translation?.excluded),
      images: tour.images.map((image) => {
        const imageTranslation = pickTranslation(image.translations, locale);

        return {
          id: image.id,
          imageUrl: image.imageUrl,
          isCover: image.isCover,
          altText: imageTranslation?.altText ?? null,
          caption: imageTranslation?.caption ?? null,
        };
      }),
      program: tour.days.map((day) => {
        const dayTranslation = pickTranslation(day.translations, locale);

        return {
          id: day.id,
          dayNumber: day.dayNumber,
          overnightAt: day.overnightAt,
          image: day.image,
          title: dayTranslation?.title ?? '',
          shortTitle: dayTranslation?.shortTitle ?? null,
          description: dayTranslation?.description ?? '',
          inclusions: this.readStringArray(dayTranslation?.inclusions),
        };
      }),
    } as Record<string, unknown>;

    if (isAuthorized && tour.priceFrom) {
      payload.priceFrom = tour.priceFrom.toString();
      payload.currency = tour.currency ?? null;
      payload.incomingPlacements = linkedPlacements;
    }

    return payload;
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private async canViewPartnerPrices(viewer?: { sub: string; role: string } | null) {
    if (!viewer?.sub || viewer.role !== UserRole.PARTNER) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: viewer.sub },
      select: {
        status: true,
        partner: {
          select: {
            isActive: true,
          },
        },
      },
    });

    return user?.status === UserStatus.ACTIVE && user.partner?.isActive === true;
  }

  private async getLinkedIncomingPlacements(isAuthorized: boolean) {
    if (!isAuthorized) {
      return [];
    }

    const placements = await this.prisma.incomingMapping.findMany({
      where: {
        type: 'placement',
        isActive: true,
        adultCount: { not: null },
        childCount: { not: null },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        adultCount: true,
        childCount: true,
        samoName: true,
        cmsLabel: true,
      },
    });

    return placements
      .filter(
        (placement): placement is typeof placement & { adultCount: number; childCount: number } =>
          placement.adultCount !== null && placement.childCount !== null,
      )
      .map((placement) => ({
        adultCount: placement.adultCount,
        childCount: placement.childCount,
        label: placement.samoName || placement.cmsLabel,
      }));
  }

  private parseChildAges(value?: string) {
    return String(value ?? '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((age) => Number.isFinite(age) && age >= 0 && age < 18);
  }

  private matchesChildAgeRanges(label: string, childAges: number[], childCount: number) {
    if (childCount === 0 || childAges.length !== childCount) {
      return true;
    }

    const ranges = [...label.matchAll(/\((\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\)/g)]
      .map((match) => ({
        from: Number(match[1].replace(',', '.')),
        to: Number(match[2].replace(',', '.')),
      }))
      .filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to));

    if (ranges.length < childCount) {
      return false;
    }

    const used = new Set<number>();
    return [...childAges].sort((a, b) => a - b).every((age) => {
      const index = ranges.findIndex(
        (range, rangeIndex) =>
          !used.has(rangeIndex) && age >= range.from && age <= range.to,
      );
      if (index === -1) {
        return false;
      }
      used.add(index);
      return true;
    });
  }
}
