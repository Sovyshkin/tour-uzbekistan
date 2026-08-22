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

  async getCalendar(
    query: ToursQueryDto,
    viewer?: { sub: string; role: string } | null,
  ) {
    const canViewPrices = await this.canViewPartnerPrices(viewer);
    if (!canViewPrices) {
      return { items: [] };
    }

    const locale = query.locale ?? Locale.ru;
    const adults = query.adults ?? 2;
    const children = query.children ?? 0;
    const childAges = this.parseChildAges(query.childAges);
    const where = this.buildWhere({ ...query, travelDate: undefined }, locale, false);
    const [tours, linkedPlacements] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 100,
        include: {
          translations: true,
        },
      }),
      this.getLinkedIncomingPlacements(true),
    ]);
    const grouped = new Map<string, { date: string; tourCount: number; minPrice: number | null; currency: string | null }>();

    await Promise.all(
      tours.map(async (tour) => {
        const incomingOccupancy = this.resolveIncomingOccupancyForPlacements(
          adults,
          children,
          childAges,
          linkedPlacements,
        );
        const matchingPlacement = linkedPlacements.find((placement) =>
          placement.adultCount === incomingOccupancy.adults &&
          placement.childCount === incomingOccupancy.children &&
          this.matchesChildAgeRanges(
            placement.label,
            incomingOccupancy.childAges,
            incomingOccupancy.children,
          ),
        );

        if (!matchingPlacement) {
          return;
        }

        const translation = pickTranslation(tour.translations, locale);
        const departures = await this.samoIncomingService.listTourDepartures({
          bookingId: tour.id,
          bookingNumber: `QUOTE-${tour.id}`,
          createdAt: new Date(),
          adultCount: incomingOccupancy.adults,
          childCount: incomingOccupancy.children,
          childAges: incomingOccupancy.childAges,
          incomingTourId: tour.incomingTourId,
          incomingHotelCode: tour.incomingHotelCode,
          incomingHotelName: tour.incomingHotelName,
          person: {
            firstName: 'Quote',
            lastName: 'Request',
          },
          tour: {
            title: translation?.title ?? tour.slug,
            durationDays: tour.durationDays,
            durationNights: tour.durationNights,
            includedServices: [],
          },
        });

        for (const option of departures) {
          if (!this.matchesTourDepartureWeekday(option.date, tour.departureWeekdays)) {
            continue;
          }

          const current = grouped.get(option.date);
          if (!current) {
            grouped.set(option.date, {
              date: option.date,
              tourCount: 1,
              minPrice: option.price,
              currency: option.currency ?? tour.currency ?? null,
            });
            continue;
          }

          current.tourCount += 1;
          if (current.minPrice === null || option.price < current.minPrice) {
            current.minPrice = option.price;
            current.currency = option.currency ?? tour.currency ?? current.currency;
          }
        }
      }),
    );

    return {
      items: [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getTourBySlug(
    slug: string,
    query: ToursQueryDto,
    viewer?: { sub: string; role: string } | null,
  ) {
    const locale = query.locale ?? Locale.ru;
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

    return this.mapTourDetail(tour, canViewPrices, locale, linkedPlacements, query);
  }

  async getTourDepartures(
    slug: string,
    query: ToursQueryDto,
    viewer?: { sub: string; role: string } | null,
  ) {
    const canViewPrices = await this.canViewPartnerPrices(viewer);
    if (!canViewPrices) {
      return { items: [] };
    }

    const tour = await this.prisma.tour.findFirst({
      where: {
        status: ContentStatus.PUBLISHED,
        OR: [
          { slug },
          ...(this.isUuid(slug) ? [{ id: slug }] : []),
        ],
      },
      include: {
        translations: true,
      },
    });

    if (!tour) {
      return null;
    }

    const locale = query.locale ?? Locale.ru;
    const translation = pickTranslation(tour.translations, locale);
    const adults = Math.max(1, query.adults ?? 2);
    const children = Math.max(0, query.children ?? 0);
    const childAges = this.parseChildAges(query.childAges);
    const linkedPlacements = await this.getLinkedIncomingPlacements(true);
    const incomingOccupancy = this.resolveIncomingOccupancyForPlacements(
      adults,
      children,
      childAges,
      linkedPlacements,
    );
    const lookup = await this.samoIncomingService.listTourDeparturesWithDebug({
      bookingId: tour.id,
      bookingNumber: `QUOTE-${tour.id}`,
      createdAt: new Date(),
      adultCount: incomingOccupancy.adults,
      childCount: incomingOccupancy.children,
      childAges: incomingOccupancy.childAges,
      incomingTourId: tour.incomingTourId,
      incomingHotelCode: tour.incomingHotelCode,
      incomingHotelName: tour.incomingHotelName,
      person: {
        firstName: 'Quote',
        lastName: 'Request',
      },
      tour: {
        title: translation?.title ?? tour.slug,
        durationDays: tour.durationDays,
        durationNights: tour.durationNights,
        includedServices: [],
      },
    });
    return {
      items: lookup.items,
      debug: {
        ...lookup.debug,
        tourDepartureWeekdays: tour.departureWeekdays,
        beforeWeekdayFilterCount: lookup.items.length,
        afterWeekdayFilterCount: lookup.items.length,
        weekdayFilterSkippedForBooking: true,
      },
    };
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
      departureWeekdays: tour.departureWeekdays,
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
      const incomingOccupancy = this.resolveIncomingOccupancyForPlacements(
        adults,
        children,
        childAges,
        linkedPlacements,
      );
      const matchingPlacement = linkedPlacements.find((placement) =>
        placement.adultCount === incomingOccupancy.adults &&
        placement.childCount === incomingOccupancy.children &&
        this.matchesChildAgeRanges(
          placement.label,
          incomingOccupancy.childAges,
          incomingOccupancy.children,
        ),
      );
      const shouldQuote = Boolean(
        query?.adults !== undefined ||
          query?.children !== undefined ||
          query?.childAges,
      );
      const requestedTravelDate = this.parseTravelDate(query?.travelDate);
      const matchesRequestedWeekday = !requestedTravelDate ||
        this.matchesTourDepartureWeekday(
          requestedTravelDate.toISOString().slice(0, 10),
          tour.departureWeekdays,
        );

      payload.incomingPlacements = linkedPlacements;
      payload.hasMatchingPlacement = Boolean(matchingPlacement);

      if (matchingPlacement && shouldQuote && matchesRequestedWeekday) {
        const quote = await this.samoIncomingService.quoteTourPrice({
          bookingId: tour.id,
          bookingNumber: `QUOTE-${tour.id}`,
          createdAt: new Date(),
          travelDate: requestedTravelDate,
          adultCount: incomingOccupancy.adults,
          childCount: incomingOccupancy.children,
          childAges: incomingOccupancy.childAges,
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
            durationNights: tour.durationNights,
            includedServices: [],
          },
        });

        payload.priceQuote = quote;
        if (quote.amount) {
          payload.priceFrom = String(quote.amount);
          payload.currency = quote.currency ?? tour.currency ?? null;
        }
      } else if ((!shouldQuote || matchingPlacement) && tour.priceFrom) {
        payload.priceFrom = tour.priceFrom.toString();
        payload.currency = tour.currency ?? null;
      }
    }

    return payload;
  }

  private async mapTourDetail(
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
      departureWeekdays: tour.departureWeekdays,
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

    if (isAuthorized) {
      payload.incomingPlacements = linkedPlacements;
      const adults = query?.adults ?? 2;
      const children = query?.children ?? 0;
      const childAges = this.parseChildAges(query?.childAges);
      const incomingOccupancy = this.resolveIncomingOccupancyForPlacements(
        adults,
        children,
        childAges,
        linkedPlacements,
      );
      const matchingPlacement = linkedPlacements.find((placement) =>
        placement.adultCount === incomingOccupancy.adults &&
        placement.childCount === incomingOccupancy.children &&
        this.matchesChildAgeRanges(
          placement.label,
          incomingOccupancy.childAges,
          incomingOccupancy.children,
        ),
      );

      payload.hasMatchingPlacement = Boolean(matchingPlacement);
      const shouldQuote = Boolean(
        query?.adults !== undefined ||
          query?.children !== undefined ||
          query?.childAges,
      );
      const requestedTravelDate = this.parseTravelDate(query?.travelDate);
      const matchesRequestedWeekday = !requestedTravelDate ||
        this.matchesTourDepartureWeekday(
          requestedTravelDate.toISOString().slice(0, 10),
          tour.departureWeekdays,
        );

      if (matchingPlacement && shouldQuote && matchesRequestedWeekday) {
        const quote = await this.samoIncomingService.quoteTourPrice({
          bookingId: tour.id,
          bookingNumber: `QUOTE-${tour.id}`,
          createdAt: new Date(),
          travelDate: requestedTravelDate,
          adultCount: incomingOccupancy.adults,
          childCount: incomingOccupancy.children,
          childAges: incomingOccupancy.childAges,
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
            durationNights: tour.durationNights,
            includedServices: [],
          },
        });

        payload.priceQuote = quote;
        if (quote.amount) {
          payload.priceFrom = String(quote.amount);
          payload.currency = quote.currency ?? tour.currency ?? null;
        }
      } else if ((!shouldQuote || matchingPlacement) && tour.priceFrom) {
        payload.priceFrom = tour.priceFrom.toString();
        payload.currency = tour.currency ?? null;
      }
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
      .filter((age) => Number.isFinite(age) && age >= 0 && age <= 18);
  }

  private parseTravelDate(value?: string) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }

    const dottedMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dottedMatch) {
      return new Date(
        Date.UTC(
          Number(dottedMatch[3]),
          Number(dottedMatch[2]) - 1,
          Number(dottedMatch[1]),
        ),
      );
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(
        Date.UTC(
          Number(isoMatch[1]),
          Number(isoMatch[2]) - 1,
          Number(isoMatch[3]),
        ),
      );
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private resolveIncomingOccupancyForPlacements(
    adults: number,
    children: number,
    childAges: number[],
    placements: Array<{ adultCount: number; childCount: number; label: string }>,
  ) {
    if (
      children === 0 ||
      childAges.length !== children ||
      placements.some(
        (placement) =>
          placement.adultCount === adults &&
          placement.childCount === children &&
          this.matchesChildAgeRanges(placement.label, childAges, children),
      )
    ) {
      return { adults, children, childAges };
    }

    const originalCompositionRanges = placements
      .filter(
        (placement) =>
          placement.adultCount === adults && placement.childCount === children,
      )
      .flatMap((placement) => this.extractChildAgeRanges(placement.label));

    if (!originalCompositionRanges.length) {
      return { adults, children, childAges };
    }

    const maxChildAge = Math.max(...originalCompositionRanges.map((range) => range.to));
    const adultLikeChildren = childAges.filter((age) => age > maxChildAge).length;
    const remainingChildAges = childAges.filter((age) => age <= maxChildAge);

    if (!adultLikeChildren) {
      return { adults, children, childAges };
    }

    return {
      adults: adults + adultLikeChildren,
      children: remainingChildAges.length,
      childAges: remainingChildAges,
    };
  }

  private matchesChildAgeRanges(label: string, childAges: number[], childCount: number) {
    if (childCount === 0 || childAges.length !== childCount) {
      return true;
    }

    const ranges = this.extractChildAgeRanges(label);

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

  private extractChildAgeRanges(label: string) {
    return [...label.matchAll(/\((\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)[^)]*\)/g)]
      .map((match) => ({
        from: Number(match[1].replace(',', '.')),
        to: Number(match[2].replace(',', '.')),
      }))
      .filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to));
  }

  private matchesTourDepartureWeekday(date: string, weekdays: number[] | null | undefined) {
    if (!Array.isArray(weekdays) || weekdays.length === 0) {
      return true;
    }

    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return true;
    }

    return weekdays.includes(parsed.getUTCDay() || 7);
  }
}
