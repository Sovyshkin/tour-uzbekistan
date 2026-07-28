import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(locale: Locale = Locale.ru) {
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
              take: 2,
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
          where: { status: ContentStatus.PUBLISHED },
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
        durationDays: tour.durationDays,
        durationNights: tour.durationNights,
        countrySlug: tour.country.slug,
        country: tour.country.translations[0]?.name ?? null,
        priceFrom: tour.priceFrom?.toString() ?? null,
        currency: tour.currency ?? null,
        sortOrder: tour.sortOrder,
      })),
      services: services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.translations[0]?.name ?? '',
        title: service.translations[0]?.title ?? null,
        shortDescription: service.translations[0]?.shortDescription ?? null,
        previewImage: service.previewImage,
      })),
      whyWe: whyWe.map((category) => ({
        id: category.id,
        slug: category.slug,
        title: category.translations[0]?.title ?? '',
        description: category.translations[0]?.description ?? null,
        facts: category.facts.map((fact) => ({
          id: fact.id,
          title: fact.translations[0]?.title ?? '',
          subtitle: fact.translations[0]?.subtitle ?? null,
          description: fact.translations[0]?.description ?? '',
          imageUrl: fact.imageUrl,
        })),
      })),
      latestNews: latestNews.map((news) => ({
        id: news.id,
        slug: news.slug,
        title: news.translations[0]?.title ?? '',
        excerpt: news.translations[0]?.excerpt ?? null,
        previewImage: news.previewImage,
        publishedAt: news.publishedAt?.toISOString() ?? null,
      })),
    };
  }
}
