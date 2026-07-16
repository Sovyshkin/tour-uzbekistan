import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ToursQueryDto } from './dto/tours-query.dto';

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async getTours(query: ToursQueryDto, isAuthorized: boolean) {
    const locale = query.locale ?? Locale.ru;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 9;
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(query, locale);

    const [total, tours] = await Promise.all([
      this.prisma.tour.count({ where }),
      this.prisma.tour.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: this.buildInclude(locale),
      }),
    ]);

    return {
      items: tours.map((tour) => this.mapTourSummary(tour, isAuthorized)),
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
    isAuthorized = false,
  ) {
    const tour = await this.prisma.tour.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
      },
      include: this.buildInclude(locale),
    });

    if (!tour) {
      return null;
    }

    return this.mapTourDetail(tour, isAuthorized);
  }

  private buildWhere(query: ToursQueryDto, locale: Locale): Prisma.TourWhereInput {
    const where: Prisma.TourWhereInput = {
      status: ContentStatus.PUBLISHED,
    };

    if (query.country) {
      where.country = {
        slug: query.country,
        status: ContentStatus.PUBLISHED,
      };
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

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceFrom = {};

      if (query.minPrice !== undefined) {
        where.priceFrom.gte = query.minPrice;
      }

      if (query.maxPrice !== undefined) {
        where.priceFrom.lte = query.maxPrice;
      }
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              locale,
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
              locale,
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
              locale,
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

  private buildInclude(locale: Locale) {
    return {
      country: {
        include: {
          translations: {
            where: { locale },
            take: 1,
          },
        },
      },
      translations: {
        where: { locale },
        take: 1,
      },
      images: {
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        include: {
          translations: {
            where: { locale },
            take: 1,
          },
        },
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
    } satisfies Prisma.TourInclude;
  }

  private mapTourSummary(
    tour: Prisma.TourGetPayload<{ include: ReturnType<ToursService['buildInclude']> }>,
    isAuthorized: boolean,
  ) {
    const translation = tour.translations[0];
    const payload = {
      id: tour.id,
      slug: tour.slug,
      title: translation?.title ?? '',
      subtitle: translation?.subtitle ?? null,
      route: translation?.route ?? '',
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      country: tour.country.translations[0]?.name ?? null,
      heroImage: tour.heroImage,
      mainImage: tour.mainImage,
      routeMapImage: tour.routeMapImage,
      comfortLevel: tour.comfortLevel,
      transportInfo: translation?.transportInfo ?? null,
      hotelsInfo: translation?.hotelsInfo ?? null,
      included: this.readStringArray(translation?.included),
      images: tour.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        isCover: image.isCover,
        altText: image.translations[0]?.altText ?? null,
        caption: image.translations[0]?.caption ?? null,
      })),
      program: tour.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        overnightAt: day.overnightAt,
        image: day.image,
        title: day.translations[0]?.title ?? '',
        shortTitle: day.translations[0]?.shortTitle ?? null,
        description: day.translations[0]?.description ?? '',
        inclusions: this.readStringArray(day.translations[0]?.inclusions),
      })),
    } as Record<string, unknown>;

    if (isAuthorized && tour.priceFrom) {
      payload.priceFrom = tour.priceFrom.toString();
      payload.currency = tour.currency ?? null;
    }

    return payload;
  }

  private mapTourDetail(
    tour: Prisma.TourGetPayload<{ include: ReturnType<ToursService['buildInclude']> }>,
    isAuthorized: boolean,
  ) {
    const translation = tour.translations[0];
    const payload = {
      id: tour.id,
      slug: tour.slug,
      title: translation?.title ?? '',
      subtitle: translation?.subtitle ?? null,
      route: translation?.route ?? '',
      description: translation?.description ?? '',
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      country: tour.country.translations[0]?.name ?? null,
      heroImage: tour.heroImage,
      mainImage: tour.mainImage,
      routeMapImage: tour.routeMapImage,
      comfortLevel: tour.comfortLevel,
      transportInfo: translation?.transportInfo ?? null,
      hotelsInfo: translation?.hotelsInfo ?? null,
      countriesInfo: translation?.countriesInfo ?? null,
      included: this.readStringArray(translation?.included),
      excluded: this.readStringArray(translation?.excluded),
      images: tour.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        isCover: image.isCover,
        altText: image.translations[0]?.altText ?? null,
        caption: image.translations[0]?.caption ?? null,
      })),
      program: tour.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        overnightAt: day.overnightAt,
        image: day.image,
        title: day.translations[0]?.title ?? '',
        shortTitle: day.translations[0]?.shortTitle ?? null,
        description: day.translations[0]?.description ?? '',
        inclusions: this.readStringArray(day.translations[0]?.inclusions),
      })),
    } as Record<string, unknown>;

    if (isAuthorized && tour.priceFrom) {
      payload.priceFrom = tour.priceFrom.toString();
      payload.currency = tour.currency ?? null;
    }

    return payload;
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
