import { Injectable } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { pickTranslation } from '../common/translation.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCountries(locale: Locale = Locale.ru) {
    const countries = await this.prisma.country.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        translations: true,
      },
    });

    return countries.map((country) => {
      const translation = pickTranslation(country.translations, locale);

      return {
        id: country.id,
        slug: country.slug,
        isoCode: country.isoCode,
        heroImage: country.heroImage,
        heroImageSettings: country.heroImageSettings,
        flagImage: country.flagImage,
        name: translation?.name ?? '',
        welcomeTitle: translation?.welcomeTitle ?? null,
        intro: translation?.intro ?? null,
        isFeatured: country.isFeatured,
      };
    });
  }

  async getCountryBySlug(slug: string, locale: Locale = Locale.ru) {
    const country = await this.prisma.country.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        translations: true,
      },
    });

    if (!country) {
      return null;
    }

    const translation = pickTranslation(country.translations, locale);

    return {
      id: country.id,
      slug: country.slug,
      isoCode: country.isoCode,
      heroImage: country.heroImage,
      heroImageSettings: country.heroImageSettings,
      flagImage: country.flagImage,
      name: translation?.name ?? '',
      welcomeTitle: translation?.welcomeTitle ?? null,
      intro: translation?.intro ?? null,
      sidebarTitle: translation?.sidebarTitle ?? null,
      cities: this.readJsonArray(translation?.cities),
      toc: this.readJsonArray(translation?.toc),
      sections: this.readJsonArray(translation?.sections),
      seoTitle: translation?.seoTitle ?? null,
      seoDescription: translation?.seoDescription ?? null,
    };
  }

  private readJsonArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item) => {
      return typeof item === 'object' && item !== null && !Array.isArray(item);
    }) as Array<Record<string, unknown>>;
  }
}
