import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getServices(
    locale: Locale = Locale.ru,
    page = 1,
    pageSize = 9,
  ) {
    const skip = (page - 1) * pageSize;

    const [total, services] = await Promise.all([
      this.prisma.service.count({
        where: { status: ContentStatus.PUBLISHED },
      }),
      this.prisma.service.findMany({
        where: { status: ContentStatus.PUBLISHED },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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
      items: services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.translations[0]?.name ?? '',
        title: service.translations[0]?.title ?? null,
        subtitle: service.translations[0]?.subtitle ?? null,
        shortDescription: service.translations[0]?.shortDescription ?? null,
        previewImage: service.previewImage,
        isFeatured: service.isFeatured,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getServiceBySlug(slug: string, locale: Locale = Locale.ru) {
    const service = await this.prisma.service.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
      },
    });

    if (!service) {
      return null;
    }

    const translation = service.translations[0];

    return {
      id: service.id,
      slug: service.slug,
      name: translation?.name ?? '',
      title: translation?.title ?? null,
      subtitle: translation?.subtitle ?? null,
      shortDescription: translation?.shortDescription ?? null,
      heroImage: service.heroImage,
      previewImage: service.previewImage,
      content: this.readStringArray(translation?.content),
      seoTitle: translation?.seoTitle ?? null,
      seoDescription: translation?.seoDescription ?? null,
      leadFormEnabled: service.leadFormEnabled,
    };
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
