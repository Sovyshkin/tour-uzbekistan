import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, UserRole, UserStatus } from '@prisma/client';

import { pickTranslation } from '../common/translation.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(
    locale: Locale = Locale.ru,
    viewer?: { sub: string; role: string } | null,
  ) {
    const canViewPrices = await this.canViewPartnerPrices(viewer);
    const canViewB2BNews = await this.canViewB2BNews(viewer);
    const newsAudienceWhere = canViewB2BNews ? { syncToB2B: true } : { syncToB2C: true };
    const [banners, countries, recommendedTours, services, whyWe, latestNews, siteSettings] =
      await Promise.all([
        this.prisma.homeBanner.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: true,
          },
        }),
        this.prisma.country.findMany({
          where: {
            isFeatured: true,
            status: ContentStatus.PUBLISHED,
            tours: {
              some: {
                status: ContentStatus.PUBLISHED,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            translations: true,
          },
        }),
        this.prisma.tour.findMany({
          where: {
            status: ContentStatus.PUBLISHED,
            isFeatured: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            country: {
              include: {
                translations: true,
              },
            },
            translations: true,
          },
          take: 8,
        }),
        this.prisma.service.findMany({
          where: {
            status: ContentStatus.PUBLISHED,
            isFeatured: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            translations: true,
          },
          take: 6,
        }),
        this.prisma.whyCategory.findMany({
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: true,
            facts: {
              where: { status: ContentStatus.PUBLISHED },
              orderBy: { sortOrder: 'asc' },
              include: {
                translations: true,
              },
            },
          },
          take: 4,
        }),
        this.prisma.news.findMany({
          where: { status: ContentStatus.PUBLISHED, ...newsAudienceWhere },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            translations: true,
          },
          take: 6,
        }),
        this.prisma.siteSetting.findMany({
          where: { isPublic: true },
          include: {
            translations: true,
          },
        }),
      ]);

    return {
      settings: siteSettings.reduce<Record<string, unknown>>((acc, setting) => {
        const translation = pickTranslation(setting.translations, locale);
        acc[setting.key] = translation?.textValue ?? setting.value ?? null;
        return acc;
      }, {}),
      banners: banners.map((banner) => {
        const translation = pickTranslation(banner.translations, locale);

        return {
          id: banner.id,
          slug: banner.slug,
          imageUrl: banner.imageUrl,
          imageSettings: banner.imageSettings,
          mobileImageUrl: banner.mobileImageUrl,
          linkUrl: banner.linkUrl,
          title: translation?.title ?? '',
          subtitle: translation?.subtitle ?? null,
          buttonLabel: translation?.buttonLabel ?? null,
          altText: translation?.altText ?? null,
        };
      }),
      countries: countries.map((country) => {
        const translation = pickTranslation(country.translations, locale);

        return {
          id: country.id,
          slug: country.slug,
          heroImage: country.heroImage,
          heroImageSettings: country.heroImageSettings,
          flagImage: country.flagImage,
          name: translation?.name ?? '',
          intro: translation?.intro ?? null,
        };
      }),
      recommendedTours: recommendedTours.map((tour) => {
        const translation = pickTranslation(tour.translations, locale);
        const countryTranslation = pickTranslation(tour.country.translations, locale);

        return {
          id: tour.id,
          slug: tour.slug,
          title: translation?.title ?? '',
          subtitle: translation?.subtitle ?? null,
          route: translation?.route ?? '',
          image: tour.mainImage,
          imageSettings: tour.mainImageSettings,
          durationDays: tour.durationDays,
          durationNights: tour.durationNights,
          countrySlug: tour.country.slug,
          country: countryTranslation?.name ?? null,
          priceFrom: canViewPrices ? tour.priceFrom?.toString() ?? null : null,
          currency: canViewPrices ? tour.currency ?? null : null,
          sortOrder: tour.sortOrder,
        };
      }),
      services: services.map((service) => {
        const translation = pickTranslation(service.translations, locale);

        return {
          id: service.id,
          slug: service.slug,
          name: translation?.name ?? '',
          title: translation?.title ?? null,
          subtitle: translation?.subtitle ?? translation?.shortDescription ?? null,
          shortDescription: translation?.shortDescription ?? translation?.subtitle ?? null,
          previewImage: service.previewImage,
          previewImageSettings: service.previewImageSettings,
        };
      }),
      whyWe: whyWe.map((category) => {
        const translation = pickTranslation(category.translations, locale);

        return {
          id: category.id,
          slug: category.slug,
          title: translation?.title ?? '',
          subtitle: translation?.subtitle ?? null,
          description: translation?.description ?? null,
          facts: category.facts.map((fact) => {
            const factTranslation = pickTranslation(fact.translations, locale);

            return {
              id: fact.id,
              title: factTranslation?.title ?? '',
              subtitle: factTranslation?.subtitle ?? null,
              description: factTranslation?.description ?? '',
              imageUrl: fact.imageUrl,
              imageSettings: fact.imageSettings,
            };
          }),
        };
      }),
      latestNews: latestNews.map((news) => {
        const translation = this.getTranslation(news.translations, locale);

        return {
          id: news.id,
          slug: news.slug,
          title: translation?.title ?? '',
          excerpt: translation?.excerpt ?? null,
          previewImage: news.previewImage,
          previewImageSettings: news.previewImageSettings,
          publishedAt: news.publishedAt?.toISOString() ?? null,
        };
      }),
    };
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

  private getTranslation<
    TTranslation extends {
      locale: Locale;
    },
  >(translations: TTranslation[], locale: Locale) {
    return (
      translations.find((translation) => translation.locale === locale) ||
      translations.find((translation) => translation.locale === Locale.ru) ||
      translations[0]
    );
  }

  private async canViewB2BNews(viewer?: { sub: string; role: string } | null) {
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

    return user?.status !== UserStatus.SUSPENDED && user?.partner?.isActive === true;
  }
}
