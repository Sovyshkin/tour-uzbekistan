import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { pickTranslation } from '../common/translation.util';
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
          translations: true,
        },
      }),
    ]);

    return {
      items: services.map((service) => {
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
          isFeatured: service.isFeatured,
        };
      }),
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
        translations: true,
      },
    });

    if (!service) {
      return null;
    }

    const translation = pickTranslation(service.translations, locale);

    return {
      id: service.id,
      slug: service.slug,
      name: translation?.name ?? '',
      title: translation?.title ?? null,
      subtitle: translation?.subtitle ?? translation?.shortDescription ?? null,
      shortDescription: translation?.shortDescription ?? translation?.subtitle ?? null,
      heroImage: service.heroImage,
      previewImage: service.previewImage,
      previewImageSettings: service.previewImageSettings,
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
