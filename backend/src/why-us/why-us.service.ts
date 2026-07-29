import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhyUsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(locale: Locale = Locale.ru) {
    const categories = await this.prisma.whyCategory.findMany({
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
    });

    return categories.map((category) => {
      const translation = category.translations[0];

      return {
        id: category.id,
        slug: category.slug,
        heroImage: category.heroImage,
        heroImageSettings: category.heroImageSettings,
        title: translation?.title ?? '',
        subtitle: translation?.subtitle ?? null,
        description: translation?.description ?? null,
        facts: category.facts.map((fact) => ({
          id: fact.id,
          imageUrl: fact.imageUrl,
          imageSettings: fact.imageSettings,
          title: fact.translations[0]?.title ?? '',
          subtitle: fact.translations[0]?.subtitle ?? null,
          description: fact.translations[0]?.description ?? '',
        })),
      };
    });
  }

  async getCategoryBySlug(slug: string, locale: Locale = Locale.ru) {
    const category = await this.prisma.whyCategory.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
      },
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
    });

    if (!category) {
      return null;
    }

    const translation = category.translations[0];

    return {
      id: category.id,
      slug: category.slug,
      heroImage: category.heroImage,
      heroImageSettings: category.heroImageSettings,
      title: translation?.title ?? '',
      subtitle: translation?.subtitle ?? null,
      description: translation?.description ?? null,
      seoTitle: translation?.seoTitle ?? null,
      seoDescription: translation?.seoDescription ?? null,
      facts: category.facts.map((fact) => ({
        id: fact.id,
        imageUrl: fact.imageUrl,
        imageSettings: fact.imageSettings,
        title: fact.translations[0]?.title ?? '',
        subtitle: fact.translations[0]?.subtitle ?? null,
        description: fact.translations[0]?.description ?? '',
      })),
    };
  }
}
