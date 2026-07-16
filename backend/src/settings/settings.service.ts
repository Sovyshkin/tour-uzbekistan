import { Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicSettings(locale: Locale = Locale.ru) {
    const settings = await this.prisma.siteSetting.findMany({
      where: { isPublic: true },
      include: {
        translations: {
          where: { locale },
          take: 1,
        },
      },
    });

    return settings.reduce<Record<string, string>>((acc, setting) => {
      const value = setting.translations[0]?.textValue;

      if (value) {
        acc[setting.key] = value;
      }

      return acc;
    }, {});
  }
}
