import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(
    locale: Locale = Locale.ru,
    viewer?: { sub: string; role: string } | null,
  ) {
    const canViewPrices = await this.canViewPartnerPrices(viewer);
    const newsAudienceWhere = canViewPrices ? { syncToB2B: true } : { syncToB2C: true };
    const [banners, countries, recommendedTours, services, whyWe, latestNews, siteSettings] =
      await Promise.all([
        this.prisma.homeBanner.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
          },
        }),
        this.prisma.country.findMany({
          where: {
            isFeatured: true,
            status: ContentStatus.PUBLISHED,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
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
            translations: {
              where: { locale },
              take: 1,
            },
          },
          take: 6,
        }),
        this.prisma.whyCategory.findMany({
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
            facts: {
              where: { status: ContentStatus.PUBLISHED },
              orderBy: { sortOrder: 'asc' },
              include: {
                translations: {
                  where: { locale },
                  take: 1,
                },
              },
            },
          },
          take: 4,
        }),
        this.prisma.news.findMany({
          where: { status: ContentStatus.PUBLISHED, ...newsAudienceWhere },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
          },
          take: 6,
        }),
        this.prisma.siteSetting.findMany({
          where: { isPublic: true },
          include: {
            translations: {
              where: { locale },
              take: 1,
            },
          },
        }),
      ]);

    return {
      settings: siteSettings.reduce<Record<string, unknown>>((acc, setting) => {
        const translation = setting.translations[0];
        acc[setting.key] = translation?.textValue ?? setting.value ?? null;
        return acc;
      }, {}),
      banners: banners.map((banner) => ({
        id: banner.id,
        slug: banner.slug,
        imageUrl: banner.imageUrl,
        imageSettings: banner.imageSettings,
        mobileImageUrl: banner.mobileImageUrl,
        linkUrl: banner.linkUrl,
        title: banner.translations[0]?.title ?? '',
        subtitle: banner.translations[0]?.subtitle ?? null,
        buttonLabel: banner.translations[0]?.buttonLabel ?? null,
        altText: banner.translations[0]?.altText ?? null,
      })),
      countries: countries.map((country) => ({
        id: country.id,
        slug: country.slug,
        heroImage: country.heroImage,
        heroImageSettings: country.heroImageSettings,
        flagImage: country.flagImage,
        name: country.translations[0]?.name ?? '',
        intro: country.translations[0]?.intro ?? null,
      })),
      recommendedTours: recommendedTours.map((tour) => ({
        id: tour.id,
        slug: tour.slug,
        title: tour.translations[0]?.title ?? '',
        subtitle: tour.translations[0]?.subtitle ?? null,
        route: tour.translations[0]?.route ?? '',
        image: tour.mainImage,
        imageSettings: tour.mainImageSettings,
        durationDays: tour.durationDays,
        durationNights: tour.durationNights,
        countrySlug: tour.country.slug,
        country: tour.country.translations[0]?.name ?? null,
        priceFrom: canViewPrices ? tour.priceFrom?.toString() ?? null : null,
        currency: canViewPrices ? tour.currency ?? null : null,
        sortOrder: tour.sortOrder,
      })),
      services: services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.translations[0]?.name ?? '',
        title: service.translations[0]?.title ?? null,
        subtitle: service.translations[0]?.subtitle ?? service.translations[0]?.shortDescription ?? null,
        shortDescription: service.translations[0]?.shortDescription ?? service.translations[0]?.subtitle ?? null,
        previewImage: service.previewImage,
        previewImageSettings: service.previewImageSettings,
      })),
      whyWe: whyWe.map((category) => ({
        id: category.id,
        slug: category.slug,
        title: category.translations[0]?.title ?? '',
        subtitle: category.translations[0]?.subtitle ?? null,
        description: category.translations[0]?.description ?? null,
        facts: category.facts.map((fact) => ({
          id: fact.id,
          title: fact.translations[0]?.title ?? '',
          subtitle: fact.translations[0]?.subtitle ?? null,
          description: fact.translations[0]?.description ?? '',
          imageUrl: fact.imageUrl,
          imageSettings: fact.imageSettings,
        })),
      })),
      latestNews: latestNews.map((news) => ({
        id: news.id,
        slug: news.slug,
        title: news.translations[0]?.title ?? '',
        excerpt: news.translations[0]?.excerpt ?? null,
        previewImage: news.previewImage,
        previewImageSettings: news.previewImageSettings,
        publishedAt: news.publishedAt?.toISOString() ?? null,
      })),
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
}
