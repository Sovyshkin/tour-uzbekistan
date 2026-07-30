import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNews(
    locale: Locale = Locale.ru,
    page = 1,
    pageSize = 9,
  ) {
    const skip = (page - 1) * pageSize;

    const [total, news] = await Promise.all([
      this.prisma.news.count({
        where: { status: ContentStatus.PUBLISHED, syncToB2C: true },
      }),
      this.prisma.news.findMany({
        where: { status: ContentStatus.PUBLISHED, syncToB2C: true },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: {
          translations: {
            where: { locale },
            take: 1,
          },
        },
      }),
    ]);

    return {
      items: news.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.translations[0]?.title ?? '',
        excerpt: item.translations[0]?.excerpt ?? null,
        previewImage: item.previewImage,
        previewImageSettings: item.previewImageSettings,
        publishedAt: item.publishedAt?.toISOString() ?? null,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getNewsBySlug(slug: string, locale: Locale = Locale.ru) {
    const news = await this.prisma.news.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
        syncToB2C: true,
      },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
      },
    });

    if (!news) {
      return null;
    }

    const translation = news.translations[0];

    return {
      id: news.id,
      slug: news.slug,
      title: translation?.title ?? '',
      excerpt: translation?.excerpt ?? null,
      heroImage: news.heroImage,
      previewImage: news.previewImage,
      previewImageSettings: news.previewImageSettings,
      publishedAt: news.publishedAt?.toISOString() ?? null,
      content: this.readStringArray(translation?.content),
      seoTitle: translation?.seoTitle ?? null,
      seoDescription: translation?.seoDescription ?? null,
    };
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
