import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAGE_CONTENT: Partial<Record<string, Record<Locale, unknown[]>>> = {
  about: {
    ru: [
      {
        text: 'Компания была основана в 2024 году Абдулазизом Абдурахмановым как дочерняя структура Centrum Holding. Centrum Holding, флагманская компания группы, является одним из крупнейших туристических холдингов Республики Узбекистан и объединяет ведущие инвестиции страны в туризм и транспорт, включая Centrum Air, туроператора Centrum Holidays и Air Freightnet.',
      },
      {
        text: '<strong>Centrum Holidays DMC</strong> — это destination management компания, базирующаяся в Узбекистане и специализирующаяся на предоставлении комплексных туристических решений высокого уровня для международных партнеров и клиентов. Являясь частью экосистемы Centrum Holding, компания сочетает глубокую локальную экспертизу и международные стандарты сервиса, обеспечивая бесшовные leisure-, group- и MICE-путешествия.',
      },
      {
        text: 'Благодаря глубокому знанию направления, надежной сети поставщиков и технологичному подходу к операциям, Centrum Holidays DMC предоставляет полный цикл услуг: от индивидуальных маршрутов, размещения и транспорта до экскурсий и наземной координации. Компания позиционирует себя как надежный партнер по направлению, делая ставку на операционное качество, персонализированный сервис и долгосрочные партнерства, чтобы раскрывать потенциал Узбекистана как конкурентного и профессионально управляемого туристического направления.',
      },
    ],
    en: [
      {
        text: 'It was established in 2024 by Abdulaziz Abdurrahmanov as a subsidiary of Centrum Holding. Centrum Holding, the flagship company, is one of the largest tourism holdings in the Republic of Uzbekistan, encompassing the country\'s leading tourism and transportation investments, including Centrum Air, Centrum Holidays Tour Operator, and Air Freightnet.',
      },
      {
        text: '<strong>Centrum Holidays DMC</strong> is a destination management company based in Uzbekistan, specializing in delivering comprehensive, high-quality travel solutions for international partners and clients. As part of the Centrum Holding ecosystem, the company combines strong local expertise with global service standards to provide seamless leisure, group, and MICE travel experiences.',
      },
      {
        text: 'With in-depth destination knowledge, a reliable supplier network, and technology-driven operations, Centrum Holidays DMC offers end-to-end services including customized itineraries, hotels, transportation, tours, and on-ground coordination. Positioned as a trusted destination partner, the company focuses on operational excellence, tailored services, and long-term partnerships to showcase Uzbekistan as a competitive and well-managed travel destination.',
      },
    ],
    uz: [
      {
        text: 'Kompaniya 2024-yilda Abdulaziz Abdurahmanov tomonidan Centrum Holding tarkibidagi sho‘ba korxona sifatida tashkil etilgan. Centrum Holding guruhning flagman kompaniyasi bo‘lib, O‘zbekiston Respublikasidagi eng yirik turizm xoldinglaridan biri hisoblanadi va unga Centrum Air, Centrum Holidays turoperatori hamda Air Freightnet kabi turizm va transport yo‘nalishidagi yetakchi investitsiyalar kiradi.',
      },
      {
        text: '<strong>Centrum Holidays DMC</strong> O‘zbekistonda joylashgan destination management kompaniyasi bo‘lib, xalqaro hamkorlar va mijozlar uchun keng qamrovli, yuqori sifatli sayohat yechimlarini taqdim etishga ixtisoslashgan. Centrum Holding ekotizimining bir qismi sifatida kompaniya kuchli mahalliy tajribani global servis standartlari bilan uyg‘unlashtirib, leisure, group va MICE sayohatlarini uzluksiz tashkil etadi.',
      },
      {
        text: 'Yo‘nalishni chuqur bilish, ishonchli hamkorlar tarmog‘i va texnologiyaga tayangan operatsiyalar tufayli Centrum Holidays DMC individual marshrutlar, mehmonxonalar, transport, turlar va joydagi koordinatsiyani o‘z ichiga olgan to‘liq xizmatlar paketini taklif qiladi. Kompaniya o‘zini ishonchli destination partner sifatida ko‘rsatib, operatsion mukammallik, moslashtirilgan servis va uzoq muddatli hamkorliklarga tayangan holda O‘zbekistonni raqobatbardosh va professional boshqariladigan turistik yo‘nalish sifatida namoyon etadi.',
      },
    ],
  },
};

const isEmptyPageContent = (value: unknown) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'string') {
    return !value.trim();
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
};

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string, locale: Locale = Locale.ru) {
    const page = await this.prisma.page.findFirst({
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

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const translation = page.translations[0];
    const defaultContent = DEFAULT_PAGE_CONTENT[page.slug]?.[locale];
    const shouldUseDefaultContent = isEmptyPageContent(translation?.content) && defaultContent;
    const content = shouldUseDefaultContent ? defaultContent : (translation?.content ?? null);

    if (translation && shouldUseDefaultContent) {
      await this.prisma.pageTranslation.update({
        where: { id: translation.id },
        data: { content: defaultContent as Prisma.InputJsonValue },
      });
    }

    return {
      id: page.id,
      slug: page.slug,
      path: page.path,
      title: translation?.title ?? '',
      menuLabel: translation?.menuLabel ?? null,
      heroTitle: translation?.heroTitle ?? null,
      heroSubtitle: translation?.heroSubtitle ?? null,
      content,
      seoTitle: translation?.seoTitle ?? null,
      seoDescription: translation?.seoDescription ?? null,
    };
  }
}
