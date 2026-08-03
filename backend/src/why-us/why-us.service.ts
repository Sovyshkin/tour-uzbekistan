import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale } from '@prisma/client';

import { pickTranslation } from '../common/translation.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhyUsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(locale: Locale = Locale.ru) {
    const categories = await this.prisma.whyCategory.findMany({
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
    });

    return categories.map((category) => {
      const translation = pickTranslation(category.translations, locale);

      return {
        id: category.id,
        slug: category.slug,
        heroImage: category.heroImage,
        heroImageSettings: category.heroImageSettings,
        title: translation?.title ?? '',
        subtitle: translation?.subtitle ?? null,
        description: translation?.description ?? null,
        facts: category.facts.map((fact) => {
          const factTranslation = pickTranslation(fact.translations, locale);

          return {
            id: fact.id,
            imageUrl: fact.imageUrl,
            imageSettings: fact.imageSettings,
            title: factTranslation?.title ?? '',
            subtitle: factTranslation?.subtitle ?? null,
            description: factTranslation?.description ?? '',
          };
        }),
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
        translations: true,
        facts: {
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: true,
          },
        },
      },
    });

    if (!category) {
      return null;
    }

    const translation = pickTranslation(category.translations, locale);

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
      facts: category.facts.map((fact) => {
        const factTranslation = pickTranslation(fact.translations, locale);

        return {
          id: fact.id,
          imageUrl: fact.imageUrl,
          imageSettings: fact.imageSettings,
          title: factTranslation?.title ?? '',
          subtitle: factTranslation?.subtitle ?? null,
          description: factTranslation?.description ?? '',
        };
      }),
    };
  }
}
