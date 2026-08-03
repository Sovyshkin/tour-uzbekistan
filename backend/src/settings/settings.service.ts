import { Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';

import { pickTranslation } from '../common/translation.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicSettings(locale: Locale = Locale.ru) {
    const settings = await this.prisma.siteSetting.findMany({
      where: { isPublic: true },
      include: {
        translations: true,
      },
    });

    return settings.reduce<Record<string, string>>((acc, setting) => {
      const value = pickTranslation(setting.translations, locale)?.textValue;

      if (value) {
        acc[setting.key] = value;
      }

      return acc;
    }, {});
  }
}
