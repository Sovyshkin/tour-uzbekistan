import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNews(
    locale: Locale = Locale.ru,
    page = 1,
    pageSize = 9,
    viewer?: { sub: string; role: string } | null,
  ) {
    const skip = (page - 1) * pageSize;
    const canViewB2BNews = await this.canViewB2BNews(viewer);
    const where: Prisma.NewsWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(canViewB2BNews ? { syncToB2B: true } : { syncToB2C: true }),
    };

    const [total, news] = await Promise.all([
      this.prisma.news.count({
        where,
      }),
      this.prisma.news.findMany({
        where,
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

  async getNewsBySlug(
    slug: string,
    locale: Locale = Locale.ru,
    viewer?: { sub: string; role: string } | null,
  ) {
    const canViewB2BNews = await this.canViewB2BNews(viewer);
    const news = await this.prisma.news.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
        ...(canViewB2BNews ? { syncToB2B: true } : { syncToB2C: true }),
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

    return user?.status === UserStatus.ACTIVE && user.partner?.isActive === true;
  }
}
