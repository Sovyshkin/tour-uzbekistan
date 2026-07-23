import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Locale, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminContentCreateDto } from './dto/admin-content-create.dto';
import { AdminContentType } from './dto/admin-content-query.dto';
import { AdminContentUpdateDto } from './dto/admin-content-update.dto';

type ContentTranslation = {
  locale: Locale;
  [key: string]: unknown;
};

type AdminContentRecord = {
  id: string;
  type: AdminContentType;
  slug: string;
  title: string;
  status?: ContentStatus;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  countryId?: string;
  durationDays?: number;
  durationNights?: number;
  minGroupSize?: number | null;
  maxGroupSize?: number | null;
  comfortLevel?: number | null;
  priceFrom?: string | null;
  currency?: string | null;
  tourType?: string;
  image?: string | null;
  images?: Record<string, string | null>;
  translations: Record<Locale, Record<string, unknown>>;
  whyFacts?: AdminWhyFactRecord[];
};

type AdminWhyFactRecord = {
  id: string;
  sortOrder: number;
  status: ContentStatus;
  imageUrl: string | null;
  translations: Record<Locale, Record<string, unknown>>;
};

const LOCALES = [Locale.ru, Locale.en, Locale.uz];

const decodePossiblyMojibake = (value: string) => {
  if (!/[ÃÐÑ]/.test(value)) {
    return value;
  }

  try {
    const decoded = Buffer.from(value, 'latin1').toString('utf8');
    return decoded.includes('�') ? value : decoded;
  } catch {
    return value;
  }
};

const isEmptyJsonContent = (value: unknown) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return !value.trim();
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
};

const TRANSLATION_FIELDS: Record<AdminContentType, string[]> = {
  [AdminContentType.PAGES]: [
    'title',
    'menuLabel',
    'heroTitle',
    'heroSubtitle',
    'content',
    'seoTitle',
    'seoDescription',
  ],
  [AdminContentType.SITE_SETTINGS]: ['label', 'textValue', 'description'],
  [AdminContentType.MEDIA]: ['altText'],
  [AdminContentType.HOME_BANNERS]: ['title', 'subtitle', 'buttonLabel', 'altText'],
  [AdminContentType.COUNTRIES]: [
    'name',
    'welcomeTitle',
    'intro',
    'sidebarTitle',
    'seoTitle',
    'seoDescription',
  ],
  [AdminContentType.TOURS]: [
    'title',
    'subtitle',
    'route',
    'description',
    'detailsInfo',
    'routesInfo',
    'reviewsInfo',
    'hotelsInfo',
    'transportInfo',
    'countriesInfo',
    'seoTitle',
    'seoDescription',
  ],
  [AdminContentType.SERVICES]: [
    'name',
    'title',
    'subtitle',
    'shortDescription',
    'seoTitle',
    'seoDescription',
  ],
  [AdminContentType.WHY_CATEGORIES]: [
    'title',
    'subtitle',
    'description',
    'seoTitle',
    'seoDescription',
  ],
  [AdminContentType.NEWS]: ['title', 'excerpt', 'seoTitle', 'seoDescription'],
};

type DefaultPageSeed = {
  slug: string;
  path: string;
  sortOrder: number;
  translations: Record<Locale, {
    title: string;
    menuLabel: string;
    heroTitle: string;
    heroSubtitle: string;
    seoTitle: string;
    seoDescription: string;
  }>;
  content?: Record<Locale, Prisma.InputJsonValue>;
};

type DefaultSiteSettingSeed = {
  key: string;
  group: string;
  label: string;
  textValue: Record<Locale, string>;
  description?: Record<Locale, string>;
};

const DEFAULT_PAGES: DefaultPageSeed[] = [
  {
    slug: 'home',
    path: '/',
    sortOrder: 0,
    translations: {
      ru: {
        title: 'Главная',
        menuLabel: 'Главная',
        heroTitle: 'Centrum Holidays',
        heroSubtitle: 'Национальный туроператор Узбекистана',
        seoTitle: 'Главная - Centrum Holidays',
        seoDescription: 'Главная страница Centrum Holidays.',
      },
      en: {
        title: 'Home',
        menuLabel: 'Home',
        heroTitle: 'Centrum Holidays',
        heroSubtitle: 'National tour operator of Uzbekistan',
        seoTitle: 'Home - Centrum Holidays',
        seoDescription: 'Centrum Holidays home page.',
      },
      uz: {
        title: 'Bosh sahifa',
        menuLabel: 'Bosh sahifa',
        heroTitle: 'Centrum Holidays',
        heroSubtitle: 'O‘zbekiston milliy turoperatori',
        seoTitle: 'Bosh sahifa - Centrum Holidays',
        seoDescription: 'Centrum Holidays bosh sahifasi.',
      },
    },
  },
  {
    slug: 'about',
    path: '/about',
    sortOrder: 10,
    translations: {
      ru: {
        title: 'О нас',
        menuLabel: 'О нас',
        heroTitle: 'CENTRUM HOLIDAYS',
        heroSubtitle: 'Национальный туроператор Узбекистана',
        seoTitle: 'О нас - Centrum Holidays',
        seoDescription: 'Информация о компании Centrum Holidays.',
      },
      en: {
        title: 'About us',
        menuLabel: 'About us',
        heroTitle: 'CENTRUM HOLIDAYS',
        heroSubtitle: 'National tour operator of Uzbekistan',
        seoTitle: 'About us - Centrum Holidays',
        seoDescription: 'Information about Centrum Holidays.',
      },
      uz: {
        title: 'Biz haqimizda',
        menuLabel: 'Biz haqimizda',
        heroTitle: 'CENTRUM HOLIDAYS',
        heroSubtitle: 'O‘zbekiston milliy turoperatori',
        seoTitle: 'Biz haqimizda - Centrum Holidays',
        seoDescription: 'Centrum Holidays haqida ma’lumot.',
      },
    },
    content: {
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
  },
  {
    slug: 'directions',
    path: '/directions',
    sortOrder: 20,
    translations: {
      ru: {
        title: 'Направления',
        menuLabel: 'Направления',
        heroTitle: 'Направления Centrum Holidays',
        heroSubtitle: 'Маршруты по Узбекистану и соседним странам',
        seoTitle: 'Направления - Centrum Holidays',
        seoDescription: 'Туристические направления Centrum Holidays.',
      },
      en: {
        title: 'Directions',
        menuLabel: 'Directions',
        heroTitle: 'Centrum Holidays Directions',
        heroSubtitle: 'Routes across Uzbekistan and neighboring countries',
        seoTitle: 'Directions - Centrum Holidays',
        seoDescription: 'Centrum Holidays travel directions.',
      },
      uz: {
        title: 'Yo‘nalishlar',
        menuLabel: 'Yo‘nalishlar',
        heroTitle: 'Centrum Holidays Yo‘nalishlari',
        heroSubtitle: 'O‘zbekiston va qo‘shni mamlakatlar bo‘ylab marshrutlar',
        seoTitle: 'Yo‘nalishlar - Centrum Holidays',
        seoDescription: 'Centrum Holidays sayohat yo‘nalishlari.',
      },
    },
    content: {
      ru: [
        {
          title: 'Наше направление в Centrum Holidays DMC',
          text: 'Развитие Centrum Holidays DMC строится вокруг ясного видения: укреплять позиции Узбекистана как качественного, конкурентоспособного и профессионально управляемого направления, одновременно становясь надежным destination management партнером для международных рынков.',
        },
        {
          title: 'Четкое стратегическое видение',
          text: 'Наша стратегия роста основана на долгосрочной устойчивости, а не на краткосрочном расширении. Мы укрепляем фундамент: операционное совершенство, экспертизу направления и надежные партнерства, чтобы каждый этап развития приносил ценность клиентам, партнерам и самому направлению.',
        },
        {
          title: 'Укрепление лидерства направления',
          text: 'Centrum Holidays DMC стремится играть активную роль в развитии туристического ландшафта Узбекистана. Постоянно создавая новые маршруты, впечатления и сервисные форматы, мы способствуем диверсификации направления, сохраняя культурную аутентичность и высокий уровень сервиса.',
        },
        {
          title: 'Фокус на технологии и инновации',
          text: 'Наше развитие тесно связано с технологичными решениями. Мы продолжаем инвестировать в цифровую инфраструктуру, API-интеграции и data-driven подходы, чтобы повышать эффективность, прозрачность и масштабируемость.',
        },
        {
          title: 'Расширение глобальных партнерств',
          text: 'Развитие международных рынков остается одним из наших ключевых приоритетов. Мы усиливаем присутствие на разных source markets, выстраивая долгосрочные отношения с туроператорами, агентствами и корпоративными партнерами.',
        },
        {
          title: 'Развитие команды и культуры',
          text: 'Наше будущее создают люди. Centrum Holidays DMC инвестирует в развитие профессиональных, мотивированных и глобально мыслящих команд.',
        },
        {
          title: 'Ответственный и устойчивый рост',
          text: 'По мере роста мы сохраняем приверженность ответственному туризму. В наш вектор развития входит поддержка локальных сообществ, работа с надежными поставщиками и продвижение устойчивых операционных практик.',
        },
        {
          title: 'Наше обязательство',
          text: 'Направление развития Centrum Holidays DMC определяется ясностью, последовательностью и смыслом. Объединяя стратегический рост, инновации и глубокую экспертизу направления, мы создаем DMC, который приносит долгосрочную ценность уже сегодня и формирует будущее туризма в Узбекистане.',
        },
      ],
      en: [
        {
          title: 'Our Direction at Centrum Holidays DMC',
          text: 'At Centrum Holidays DMC, our direction is shaped by a clear vision: to position Uzbekistan as a well-managed, high-quality, and globally competitive destination while becoming a trusted destination management partner for international markets.',
        },
        {
          title: 'A Clear Strategic Vision',
          text: 'Our growth strategy is built on long-term sustainability rather than short-term expansion. We focus on developing strong foundations: operational excellence, destination expertise, and reliable partnerships.',
        },
        {
          title: 'Strengthening Destination Leadership',
          text: 'Centrum Holidays DMC aims to play an active role in shaping Uzbekistan\'s tourism landscape. By continuously developing new routes, experiences, and service concepts, we contribute to destination diversification.',
        },
        {
          title: 'Technology and Innovation Focus',
          text: 'Our direction is firmly aligned with technology-driven solutions. We continue to invest in digital infrastructure, API integrations, and data-driven decision-making to improve efficiency, transparency, and scalability.',
        },
        {
          title: 'Expanding Global Partnerships',
          text: 'International market development is a key priority. We aim to strengthen our presence across diverse source markets by building long-term relationships with tour operators, travel agencies, and corporate partners.',
        },
        {
          title: 'Talent and Culture Development',
          text: 'Our future is powered by people. Centrum Holidays DMC is committed to developing skilled, motivated, and globally minded teams.',
        },
        {
          title: 'Responsible and Sustainable Growth',
          text: 'As we grow, we remain committed to responsible tourism practices. Our direction includes supporting local communities, working with trusted suppliers, and promoting sustainable operations.',
        },
        {
          title: 'Our Commitment',
          text: 'Centrum Holidays DMC\'s direction is guided by clarity, consistency, and purpose. By combining strategic growth, innovation, and destination expertise, we are building a DMC that delivers long-term value.',
        },
      ],
      uz: [
        {
          title: 'Centrum Holidays DMC yo‘nalishi',
          text: 'Centrum Holidays DMC rivoji aniq qarashga tayangan: O‘zbekistonni sifatli, raqobatbardosh va professional boshqariladigan yo‘nalish sifatida mustahkamlash hamda xalqaro bozorlar uchun ishonchli destination management hamkoriga aylanish.',
        },
        {
          title: 'Aniq strategik qarash',
          text: 'Bizning o‘sish strategiyamiz qisqa muddatli kengayish emas, balki uzoq muddatli barqarorlikka asoslanadi. Biz operatsion mukammallik, yo‘nalish ekspertizasi va ishonchli hamkorliklarni mustahkamlaymiz.',
        },
        {
          title: 'Yo‘nalish yetakchiligini kuchaytirish',
          text: 'Centrum Holidays DMC O‘zbekiston turizm manzarasini shakllantirishda faol rol o‘ynashni maqsad qiladi. Yangi marshrutlar, taassurotlar va servis konsepsiyalarini doimiy ishlab chiqamiz.',
        },
        {
          title: 'Texnologiya va innovatsiyaga e’tibor',
          text: 'Bizning rivojlanishimiz texnologik yechimlar bilan chambarchas bog‘liq. Biz raqamli infratuzilma, API integratsiyalari va ma’lumotlarga tayangan qarorlar qabul qilishga sarmoya kiritishda davom etamiz.',
        },
        {
          title: 'Global hamkorliklarni kengaytirish',
          text: 'Xalqaro bozorlarni rivojlantirish bizning asosiy ustuvorliklarimizdan biridir. Biz tur operatorlari, agentliklar va korporativ hamkorlar bilan uzoq muddatli aloqalar o‘rnatamiz.',
        },
        {
          title: 'Jamoa va madaniyatni rivojlantirish',
          text: 'Bizning kelajagimizni odamlar yaratadi. Centrum Holidays DMC professional, motivatsiyalangan va global fikrlaydigan jamoalarni rivojlantirishga sarmoya kiritadi.',
        },
        {
          title: 'Mas’uliyatli va barqaror o‘sish',
          text: 'O‘sish jarayonida biz mas’uliyatli turizm tamoyillariga sodiq qolamiz. Mahalliy hamjamiyatlarni qo‘llab-quvvatlash va barqaror amaliyotlarni ilgari surish muhim yo‘nalishimizdir.',
        },
        {
          title: 'Bizning majburiyatimiz',
          text: 'Centrum Holidays DMC rivojlanish yo‘nalishi aniqlik, izchillik va maqsad bilan belgilanadi. Strategik o‘sish, innovatsiya va chuqur yo‘nalish ekspertizasini birlashtiramiz.',
        },
      ],
    },
  },
  {
    slug: 'services',
    path: '/services',
    sortOrder: 30,
    translations: {
      ru: {
        title: 'Услуги',
        menuLabel: 'Услуги',
        heroTitle: 'Услуги',
        heroSubtitle: 'Полный комплекс туристических услуг',
        seoTitle: 'Услуги - Centrum Holidays',
        seoDescription: 'Услуги Centrum Holidays.',
      },
      en: {
        title: 'Services',
        menuLabel: 'Services',
        heroTitle: 'Services',
        heroSubtitle: 'End-to-end travel services',
        seoTitle: 'Services - Centrum Holidays',
        seoDescription: 'Centrum Holidays services.',
      },
      uz: {
        title: 'Xizmatlar',
        menuLabel: 'Xizmatlar',
        heroTitle: 'Xizmatlar',
        heroSubtitle: 'Kompleks turistik xizmatlar',
        seoTitle: 'Xizmatlar - Centrum Holidays',
        seoDescription: 'Centrum Holidays xizmatlari.',
      },
    },
  },
  {
    slug: 'tours',
    path: '/tours',
    sortOrder: 40,
    translations: {
      ru: {
        title: 'Туры',
        menuLabel: 'Туры',
        heroTitle: 'Туры',
        heroSubtitle: 'Авторские и групповые туры',
        seoTitle: 'Туры - Centrum Holidays',
        seoDescription: 'Туры Centrum Holidays.',
      },
      en: {
        title: 'Tours',
        menuLabel: 'Tours',
        heroTitle: 'Tours',
        heroSubtitle: 'Private and group tours',
        seoTitle: 'Tours - Centrum Holidays',
        seoDescription: 'Centrum Holidays tours.',
      },
      uz: {
        title: 'Turlar',
        menuLabel: 'Turlar',
        heroTitle: 'Turlar',
        heroSubtitle: 'Individual va guruh turlari',
        seoTitle: 'Turlar - Centrum Holidays',
        seoDescription: 'Centrum Holidays turlari.',
      },
    },
  },
  {
    slug: 'why-we',
    path: '/why-we',
    sortOrder: 50,
    translations: {
      ru: {
        title: 'Почему мы',
        menuLabel: 'Почему мы',
        heroTitle: 'Почему мы',
        heroSubtitle: 'Причины выбрать Centrum Holidays',
        seoTitle: 'Почему мы - Centrum Holidays',
        seoDescription: 'Преимущества Centrum Holidays.',
      },
      en: {
        title: 'Why us',
        menuLabel: 'Why us',
        heroTitle: 'Why us',
        heroSubtitle: 'Reasons to choose Centrum Holidays',
        seoTitle: 'Why us - Centrum Holidays',
        seoDescription: 'Centrum Holidays advantages.',
      },
      uz: {
        title: 'Nega biz',
        menuLabel: 'Nega biz',
        heroTitle: 'Nega biz',
        heroSubtitle: 'Centrum Holidays tanlash sabablari',
        seoTitle: 'Nega biz - Centrum Holidays',
        seoDescription: 'Centrum Holidays afzalliklari.',
      },
    },
  },
  {
    slug: 'news',
    path: '/news',
    sortOrder: 60,
    translations: {
      ru: {
        title: 'Новости',
        menuLabel: 'Новости',
        heroTitle: 'Новости',
        heroSubtitle: 'Последние новости компании',
        seoTitle: 'Новости - Centrum Holidays',
        seoDescription: 'Новости Centrum Holidays.',
      },
      en: {
        title: 'News',
        menuLabel: 'News',
        heroTitle: 'News',
        heroSubtitle: 'Latest company news',
        seoTitle: 'News - Centrum Holidays',
        seoDescription: 'Centrum Holidays news.',
      },
      uz: {
        title: 'Yangiliklar',
        menuLabel: 'Yangiliklar',
        heroTitle: 'Yangiliklar',
        heroSubtitle: 'Kompaniyaning so‘nggi yangiliklari',
        seoTitle: 'Yangiliklar - Centrum Holidays',
        seoDescription: 'Centrum Holidays yangiliklari.',
      },
    },
  },
  {
    slug: 'for-agent',
    path: '/for-agent',
    sortOrder: 70,
    translations: {
      ru: {
        title: 'Агентам',
        menuLabel: 'Агентам',
        heroTitle: 'Для агентов',
        heroSubtitle: 'Партнерская регистрация и условия работы',
        seoTitle: 'Агентам - Centrum Holidays',
        seoDescription: 'Информация для туристических агентов.',
      },
      en: {
        title: 'For Agent',
        menuLabel: 'For Agent',
        heroTitle: 'For agents',
        heroSubtitle: 'Partner registration and cooperation terms',
        seoTitle: 'For Agent - Centrum Holidays',
        seoDescription: 'Information for travel agents.',
      },
      uz: {
        title: 'Agentlar uchun',
        menuLabel: 'Agentlar uchun',
        heroTitle: 'Agentlar uchun',
        heroSubtitle: 'Hamkorlik ro‘yxatdan o‘tishi va shartlari',
        seoTitle: 'Agentlar uchun - Centrum Holidays',
        seoDescription: 'Turistik agentlar uchun ma’lumot.',
      },
    },
  },
  {
    slug: 'register',
    path: '/register',
    sortOrder: 80,
    translations: {
      ru: {
        title: 'Регистрация',
        menuLabel: 'Регистрация',
        heroTitle: 'Регистрация партнера',
        heroSubtitle: 'Заполните форму для подключения к системе',
        seoTitle: 'Регистрация - Centrum Holidays',
        seoDescription: 'Регистрация партнера Centrum Holidays.',
      },
      en: {
        title: 'Registration',
        menuLabel: 'Registration',
        heroTitle: 'Partner registration',
        heroSubtitle: 'Fill in the form to join the system',
        seoTitle: 'Registration - Centrum Holidays',
        seoDescription: 'Centrum Holidays partner registration.',
      },
      uz: {
        title: 'Ro‘yxatdan o‘tish',
        menuLabel: 'Ro‘yxatdan o‘tish',
        heroTitle: 'Hamkor ro‘yxatdan o‘tishi',
        heroSubtitle: 'Tizimga ulanish uchun formani to‘ldiring',
        seoTitle: 'Ro‘yxatdan o‘tish - Centrum Holidays',
        seoDescription: 'Centrum Holidays hamkor ro‘yxatdan o‘tishi.',
      },
    },
  },
];

const DEFAULT_SITE_SETTINGS: DefaultSiteSettingSeed[] = [
  {
    key: 'contacts.main',
    group: 'contacts',
    label: 'Контакты',
    textValue: {
      ru: 'Телефон, email и ссылки мессенджеров',
      en: 'Phone, email and messenger links',
      uz: 'Telefon, email va messenjer havolalari',
    },
    description: {
      ru: 'Основные контактные данные сайта',
      en: 'Main website contact details',
      uz: 'Saytning asosiy kontakt ma’lumotlari',
    },
  },
  {
    key: 'nav.about',
    group: 'navigation',
    label: 'Меню: О нас',
    textValue: { ru: 'О нас', en: 'About us', uz: 'Biz haqimizda' },
  },
  {
    key: 'nav.directions',
    group: 'navigation',
    label: 'Меню: Направления',
    textValue: { ru: 'Направления', en: 'Directions', uz: 'Yo‘nalishlar' },
  },
  {
    key: 'nav.services',
    group: 'navigation',
    label: 'Меню: Услуги',
    textValue: { ru: 'Услуги', en: 'Services', uz: 'Xizmatlar' },
  },
  {
    key: 'nav.why_we',
    group: 'navigation',
    label: 'Меню: Почему мы',
    textValue: { ru: 'Почему мы?', en: 'Why us?', uz: 'Nega biz?' },
  },
  {
    key: 'nav.countries',
    group: 'navigation',
    label: 'Меню: Страны',
    textValue: { ru: 'Страны', en: 'Countries', uz: 'Davlatlar' },
  },
  {
    key: 'nav.tours',
    group: 'navigation',
    label: 'Меню: Туры',
    textValue: { ru: 'Туры', en: 'Tours', uz: 'Turlar' },
  },
  {
    key: 'nav.for_agent',
    group: 'navigation',
    label: 'Меню: Агентам',
    textValue: { ru: 'Агентам', en: 'For Agent', uz: 'Agentlar uchun' },
  },
  {
    key: 'about.contact_title',
    group: 'forms',
    label: 'Форма: заголовок',
    textValue: {
      ru: 'Свяжитесь с нами сегодня, чтобы узнать больше о наших уникальных предложениях',
      en: 'Contact us today to learn more about our unique offers',
      uz: 'Noyob takliflarimiz haqida ko‘proq bilish uchun bugun biz bilan bog‘laning',
    },
  },
  {
    key: 'about.name',
    group: 'forms',
    label: 'Форма: поле имени',
    textValue: { ru: 'Имя', en: 'Name', uz: 'Ism' },
  },
  {
    key: 'about.phone',
    group: 'forms',
    label: 'Форма: поле телефона',
    textValue: { ru: 'Телефон', en: 'Phone', uz: 'Telefon' },
  },
  {
    key: 'about.email',
    group: 'forms',
    label: 'Форма: поле email',
    textValue: { ru: 'Email', en: 'Email', uz: 'Email' },
  },
  {
    key: 'about.send',
    group: 'forms',
    label: 'Форма: кнопка отправки',
    textValue: { ru: 'Отправить', en: 'Send', uz: 'Yuborish' },
  },
  {
    key: 'about.consent',
    group: 'forms',
    label: 'Форма: согласие',
    textValue: {
      ru: 'Нажимая кнопку «Отправить», вы даете согласие на обработку персональных данных',
      en: "By clicking the 'Send' button, you consent to the processing of personal data",
      uz: '«Yuborish» tugmasini bosish orqali shaxsiy ma’lumotlarni qayta ishlashga rozilik bildirasiz',
    },
  },
  {
    key: 'legal.personal_data_processing',
    group: 'legal',
    label: 'Документ: обработка персональных данных',
    textValue: { ru: '', en: '', uz: '' },
    description: {
      ru: 'Загрузите файл согласия на обработку персональных данных. Ссылка используется на странице регистрации.',
      en: 'Upload the personal data processing consent file. The link is used on the registration page.',
      uz: 'Shaxsiy ma’lumotlarni qayta ishlash roziligi faylini yuklang. Havola ro‘yxatdan o‘tish sahifasida ishlatiladi.',
    },
  },
  {
    key: 'legal.privacy_policy',
    group: 'legal',
    label: 'Документ: политика конфиденциальности',
    textValue: { ru: '', en: '', uz: '' },
    description: {
      ru: 'Загрузите файл политики конфиденциальности. Ссылка используется на странице регистрации.',
      en: 'Upload the privacy policy file. The link is used on the registration page.',
      uz: 'Maxfiylik siyosati faylini yuklang. Havola ro‘yxatdan o‘tish sahifasida ishlatiladi.',
    },
  },
  {
    key: 'legal.partner_agreement',
    group: 'legal',
    label: 'Документ: партнерское соглашение',
    textValue: { ru: '', en: '', uz: '' },
    description: {
      ru: 'Загрузите файл договора или условий для партнеров. Ссылка используется на странице регистрации.',
      en: 'Upload the partner agreement or terms file. The link is used on the registration page.',
      uz: 'Hamkorlik shartnomasi yoki shartlari faylini yuklang. Havola ro‘yxatdan o‘tish sahifasida ishlatiladi.',
    },
  },
  {
    key: 'pages.about.hero_image',
    group: 'pages',
    label: 'О нас: hero изображение',
    textValue: {
      ru: '/assets/icons/about-us.webp',
      en: '/assets/icons/about-us.webp',
      uz: '/assets/icons/about-us.webp',
    },
  },
  {
    key: 'pages.directions.hero_image',
    group: 'pages',
    label: 'Направления: hero изображение',
    textValue: {
      ru: '/assets/icons/directions.webp',
      en: '/assets/icons/directions.webp',
      uz: '/assets/icons/directions.webp',
    },
  },
  {
    key: 'pages.services.hero_image',
    group: 'pages',
    label: 'Услуги: hero изображение',
    textValue: {
      ru: '/assets/icons/services.webp',
      en: '/assets/icons/services.webp',
      uz: '/assets/icons/services.webp',
    },
  },
  {
    key: 'pages.tours.hero_image',
    group: 'pages',
    label: 'Туры: hero изображение',
    textValue: {
      ru: '/assets/icons/tours.webp',
      en: '/assets/icons/tours.webp',
      uz: '/assets/icons/tours.webp',
    },
  },
  {
    key: 'breadcrumbs.main',
    group: 'pages',
    label: 'Хлебные крошки: Главная',
    textValue: { ru: 'Главная', en: 'Home', uz: 'Bosh sahifa' },
  },
  {
    key: 'breadcrumbs.about',
    group: 'pages',
    label: 'Хлебные крошки: О нас',
    textValue: { ru: 'О нас', en: 'About us', uz: 'Biz haqimizda' },
  },
  {
    key: 'breadcrumbs.directions',
    group: 'pages',
    label: 'Хлебные крошки: Направления',
    textValue: { ru: 'Направления', en: 'Directions', uz: 'Yo‘nalishlar' },
  },
  {
    key: 'breadcrumbs.services',
    group: 'pages',
    label: 'Хлебные крошки: Услуги',
    textValue: { ru: 'Услуги', en: 'Services', uz: 'Xizmatlar' },
  },
  {
    key: 'breadcrumbs.why_we',
    group: 'pages',
    label: 'Хлебные крошки: Почему мы',
    textValue: { ru: 'Почему мы?', en: 'Why us?', uz: 'Nega biz?' },
  },
  {
    key: 'breadcrumbs.news',
    group: 'pages',
    label: 'Хлебные крошки: Новости',
    textValue: { ru: 'Новости', en: 'News', uz: 'Yangiliklar' },
  },
  {
    key: 'breadcrumbs.tours',
    group: 'pages',
    label: 'Хлебные крошки: Туры',
    textValue: { ru: 'Туры', en: 'Tours', uz: 'Turlar' },
  },
  {
    key: 'services.title',
    group: 'services',
    label: 'Услуги: заголовок страницы',
    textValue: {
      ru: 'Услуги Centrum Holidays DMC',
      en: 'Services of Centrum Holidays DMC',
      uz: 'Centrum Holidays DMC Xizmatlari',
    },
  },
  {
    key: 'services.subtitle',
    group: 'services',
    label: 'Услуги: вводный текст',
    textValue: {
      ru: 'Centrum Holidays DMC предоставляет полный спектр услуг по управлению направлениями в Узбекистане, разработанных для международных туроператоров, агентств и корпоративных клиентов:',
      en: 'Centrum Holidays DMC provides end-to-end destination management services in Uzbekistan, designed for international tour operators, agencies, and corporate clients:',
      uz: 'Centrum Holidays DMC O‘zbekistonda xalqaro sayyohlik operatorlari, agentliklari va korporativ mijozlar uchun mo‘ljallangan to‘liq turizm xizmatlarini taqdim etadi:',
    },
  },
  {
    key: 'services.bottom_text',
    group: 'services',
    label: 'Услуги: нижний текст',
    textValue: {
      ru: 'Centrum Holidays DMC сочетает локальные знания направления, операционное совершенство и гибкие модели обслуживания для предоставления надежных и масштабируемых туристических решений.',
      en: 'Centrum Holidays DMC combines local destination knowledge, operational excellence, and flexible service models to deliver reliable and scalable travel solutions.',
      uz: 'Centrum Holidays DMC mahalliy yo‘nalish bilimi, operatsion mukammallik va moslashuvchan xizmat modellarini birlashtirib, ishonchli va kengaytiriladigan sayohat yechimlarini taqdim etadi.',
    },
  },
  {
    key: 'countryPage.welcome_prefix',
    group: 'countries',
    label: 'Страны: приветствие',
    textValue: { ru: 'Добро пожаловать в', en: 'Welcome to', uz: 'Xush kelibsiz' },
  },
  {
    key: 'countryPage.search_where',
    group: 'countries',
    label: 'Страны: поиск куда',
    textValue: { ru: 'Куда', en: 'Where to', uz: 'Qayerga' },
  },
  {
    key: 'countryPage.search_when',
    group: 'countries',
    label: 'Страны: поиск когда',
    textValue: { ru: 'Когда', en: 'When', uz: 'Qachon' },
  },
  {
    key: 'countryPage.search_people',
    group: 'countries',
    label: 'Страны: поиск людей',
    textValue: { ru: 'Кол-во', en: 'People', uz: 'Odamlar' },
  },
  {
    key: 'countryPage.search_people_full',
    group: 'countries',
    label: 'Страны: поиск людей полностью',
    textValue: { ru: 'Кол-во человек', en: 'Number of people', uz: 'Odamlar soni' },
  },
  {
    key: 'countryPage.search_days',
    group: 'countries',
    label: 'Страны: поиск дней',
    textValue: { ru: 'Дни', en: 'Days', uz: 'Kunlar' },
  },
  {
    key: 'countryPage.search_duration',
    group: 'countries',
    label: 'Страны: длительность',
    textValue: { ru: 'Длительность', en: 'Duration', uz: 'Davomiyligi' },
  },
  {
    key: 'countryPage.search_button',
    group: 'countries',
    label: 'Страны: кнопка поиска',
    textValue: { ru: 'Поиск', en: 'Search', uz: 'Qidirish' },
  },
  {
    key: 'countryPage.search_days_unit',
    group: 'countries',
    label: 'Страны: единица дней',
    textValue: { ru: 'дн', en: 'days', uz: 'kun' },
  },
  {
    key: 'countryPage.search_people_unit',
    group: 'countries',
    label: 'Страны: единица людей',
    textValue: { ru: 'чел', en: 'pers', uz: 'kishi' },
  },
  {
    key: 'countryPage.sidebar_title_prefix',
    group: 'countries',
    label: 'Страны: заголовок сайдбара',
    textValue: { ru: 'Туристические места', en: 'Tourist attractions of', uz: 'ning turistik joylari' },
  },
  {
    key: 'countryPage.modal_title_prefix',
    group: 'countries',
    label: 'Страны: заголовок модального окна',
    textValue: { ru: 'Туристические места', en: 'Tourist attractions of', uz: 'ning turistik joylari' },
  },
  {
    key: 'countryPage.close',
    group: 'countries',
    label: 'Страны: закрыть',
    textValue: { ru: 'Закрыть', en: 'Close', uz: 'Yopish' },
  },
  {
    key: 'countryPage.content_title',
    group: 'countries',
    label: 'Страны: содержание',
    textValue: { ru: 'Содержание:', en: 'Contents:', uz: 'Mundarija:' },
  },
  {
    key: 'toursPage.search_where',
    group: 'tours',
    label: 'Туры: поиск куда',
    textValue: { ru: 'Куда', en: 'Where to', uz: 'Qayerga' },
  },
  {
    key: 'toursPage.search_when',
    group: 'tours',
    label: 'Туры: поиск когда',
    textValue: { ru: 'Когда', en: 'When', uz: 'Qachon' },
  },
  {
    key: 'toursPage.search_people',
    group: 'tours',
    label: 'Туры: поиск людей',
    textValue: { ru: 'Кол-во', en: 'People', uz: 'Odamlar' },
  },
  {
    key: 'toursPage.search_people_full',
    group: 'tours',
    label: 'Туры: поиск людей полностью',
    textValue: { ru: 'Кол-во человек', en: 'Number of people', uz: 'Odamlar soni' },
  },
  {
    key: 'toursPage.search_days',
    group: 'tours',
    label: 'Туры: поиск дней',
    textValue: { ru: 'Дни', en: 'Days', uz: 'Kunlar' },
  },
  {
    key: 'toursPage.search_duration',
    group: 'tours',
    label: 'Туры: длительность',
    textValue: { ru: 'Длительность', en: 'Duration', uz: 'Davomiyligi' },
  },
  {
    key: 'toursPage.search_button',
    group: 'tours',
    label: 'Туры: кнопка поиска',
    textValue: { ru: 'Поиск', en: 'Search', uz: 'Qidirish' },
  },
  {
    key: 'toursPage.search_people_unit',
    group: 'tours',
    label: 'Туры: единица людей',
    textValue: { ru: 'чел', en: 'pers', uz: 'kishi' },
  },
  {
    key: 'toursPage.search_days_unit',
    group: 'tours',
    label: 'Туры: единица дней',
    textValue: { ru: 'дн', en: 'days', uz: 'kun' },
  },
  {
    key: 'toursPage.price',
    group: 'tours',
    label: 'Туры: цена',
    textValue: { ru: 'Цена $', en: 'Price $', uz: 'Narxi $' },
  },
  {
    key: 'toursPage.duration_label',
    group: 'tours',
    label: 'Туры: фильтр длительности',
    textValue: { ru: 'Длительность', en: 'Duration', uz: 'Davomiyligi' },
  },
  {
    key: 'toursPage.days_label',
    group: 'tours',
    label: 'Туры: дней',
    textValue: { ru: 'Дней', en: 'Days', uz: 'Kun' },
  },
  {
    key: 'toursPage.season',
    group: 'tours',
    label: 'Туры: сезон',
    textValue: { ru: 'По сезону', en: 'By season', uz: 'Mavsum bo‘yicha' },
  },
  {
    key: 'toursPage.winter',
    group: 'tours',
    label: 'Туры: зима',
    textValue: { ru: 'Зимний', en: 'Winter', uz: 'Qishki' },
  },
  {
    key: 'toursPage.spring',
    group: 'tours',
    label: 'Туры: весна',
    textValue: { ru: 'Весенний', en: 'Spring', uz: 'Bahorgi' },
  },
  {
    key: 'toursPage.summer',
    group: 'tours',
    label: 'Туры: лето',
    textValue: { ru: 'Летний', en: 'Summer', uz: 'Yozgi' },
  },
  {
    key: 'toursPage.autumn',
    group: 'tours',
    label: 'Туры: осень',
    textValue: { ru: 'Осенний', en: 'Autumn', uz: 'Kuzgi' },
  },
  {
    key: 'toursPage.tour_type',
    group: 'tours',
    label: 'Туры: тип тура',
    textValue: { ru: 'По типу тура', en: 'By tour type', uz: 'Tur turi bo‘yicha' },
  },
  {
    key: 'toursPage.short',
    group: 'tours',
    label: 'Туры: короткие',
    textValue: { ru: 'Короткие', en: 'Short', uz: 'Qisqa' },
  },
  {
    key: 'toursPage.oneday',
    group: 'tours',
    label: 'Туры: однодневные',
    textValue: { ru: 'Однодневные', en: 'One day', uz: 'Bir kunlik' },
  },
  {
    key: 'toursPage.multiday',
    group: 'tours',
    label: 'Туры: многодневные',
    textValue: { ru: 'Многодневные', en: 'Multi-day', uz: 'Ko‘p kunlik' },
  },
  {
    key: 'toursPage.comfort',
    group: 'tours',
    label: 'Туры: комфорт',
    textValue: { ru: 'Комфорт', en: 'Comfort', uz: 'Qulaylik' },
  },
  {
    key: 'toursPage.stars_3',
    group: 'tours',
    label: 'Туры: 3 звезды',
    textValue: { ru: 'Три звезды', en: '3 stars', uz: '3 yulduz' },
  },
  {
    key: 'toursPage.stars_4',
    group: 'tours',
    label: 'Туры: 4 звезды',
    textValue: { ru: 'Четыре звезды', en: '4 stars', uz: '4 yulduz' },
  },
  {
    key: 'toursPage.stars_5',
    group: 'tours',
    label: 'Туры: 5 звезд',
    textValue: { ru: 'Пять звезд', en: '5 stars', uz: '5 yulduz' },
  },
  {
    key: 'toursPage.reset_filters',
    group: 'tours',
    label: 'Туры: сброс фильтров',
    textValue: { ru: 'Сбросить фильтры', en: 'Reset filters', uz: 'Filtrlarni tozalash' },
  },
  {
    key: 'toursPage.tours_title',
    group: 'tours',
    label: 'Туры: заголовок списка',
    textValue: { ru: 'Туры в Узбекистан', en: 'Tours in Uzbekistan', uz: 'O‘zbekistondagi turlar' },
  },
  {
    key: 'toursPage.filter',
    group: 'tours',
    label: 'Туры: фильтр',
    textValue: { ru: 'Фильтр', en: 'Filter', uz: 'Filter' },
  },
  {
    key: 'toursPage.filter_modal_title',
    group: 'tours',
    label: 'Туры: заголовок фильтров',
    textValue: { ru: 'Фильтры', en: 'Filters', uz: 'Filterlar' },
  },
  {
    key: 'toursPage.close',
    group: 'tours',
    label: 'Туры: закрыть',
    textValue: { ru: 'Закрыть', en: 'Close', uz: 'Yopish' },
  },
  {
    key: 'toursPage.no_tours',
    group: 'tours',
    label: 'Туры: пустой список',
    textValue: { ru: 'Нет туров по выбранным фильтрам', en: 'No tours found for selected filters', uz: 'Tanlangan filtrlar bo‘yicha turlar yo‘q' },
  },
  {
    key: 'footer.email',
    group: 'footer',
    label: 'Footer: email',
    textValue: {
      ru: 'info@centrumholidaysdmc.uz',
      en: 'info@centrumholidaysdmc.uz',
      uz: 'info@centrumholidaysdmc.uz',
    },
  },
  {
    key: 'footer.phone',
    group: 'footer',
    label: 'Footer: телефон',
    textValue: { ru: '+998(77) 290-08-80', en: '+998(77) 290-08-80', uz: '+998(77) 290-08-80' },
  },
  {
    key: 'home.cards.about.description',
    group: 'home',
    label: 'Главная: описание О нас',
    textValue: {
      ru: 'Centrum Holidays DMC - принимающая компания в Узбекистане с молодой динамичной командой, которая развивается и делает акцент на инновациях и высоких стандартах сервиса.',
      en: 'Centrum Holidays DMC is a destination management company in Uzbekistan with a young, dynamic team, steadily growing and focused on innovation and high service standards.',
      uz: 'Centrum Holidays DMC - O‘zbekistondagi destination management kompaniyasi bo‘lib, yosh va faol jamoa bilan xizmat standartlarini rivojlantiradi.',
    },
  },
  {
    key: 'home.cards.directions.description',
    group: 'home',
    label: 'Главная: описание Направления',
    textValue: {
      ru: 'Мы создаем маршруты по Узбекистану и соседним направлениям для индивидуальных туристов, групп и корпоративных клиентов.',
      en: 'We create routes across Uzbekistan and neighboring destinations for individual travelers, groups, and corporate clients.',
      uz: 'Biz individual sayyohlar, guruhlar va korporativ mijozlar uchun O‘zbekiston va qo‘shni yo‘nalishlar bo‘yicha marshrutlar yaratamiz.',
    },
  },
  {
    key: 'home.cards.services.description',
    group: 'home',
    label: 'Главная: описание Услуги',
    textValue: {
      ru: 'Мы предоставляем полный комплекс услуг: трансферы, визовую поддержку, размещение, экскурсии, медицинский туризм и индивидуальные программы.',
      en: 'We provide end-to-end services for individual and group tourism, from airport transfers and visa support to accommodation, health tourism, cultural tours, and tailored programmes.',
      uz: 'Biz transferlar, viza yordami, joylashtirish, sog‘liq turizmi, madaniy turlar va individual dasturlarni o‘z ichiga olgan kompleks xizmatlarni taqdim etamiz.',
    },
  },
  {
    key: 'home.cards.why.description',
    group: 'home',
    label: 'Главная: описание Почему мы',
    textValue: {
      ru: 'Мы берем на себя организацию поездки от планирования до завершения, чтобы каждый этап был понятным, надежным и удобным.',
      en: 'Because this approach makes the entire process effortless for you. From the planning stage of your trip to its completion, it offers a comprehensive and reliable solution that you can confidently utilise at every step.',
      uz: 'Biz sayohatni rejalashtirishdan yakunigacha tashkil etamiz, shunda har bir bosqich aniq, ishonchli va qulay bo‘ladi.',
    },
  },
  {
    key: 'home.services_text',
    group: 'home',
    label: 'Главная: текст услуг',
    textValue: {
      ru: 'Centrum Holidays DMC предоставляет полный комплекс destination management услуг в Узбекистане для международных туроператоров, агентств и корпоративных клиентов.',
      en: 'Centrum Holidays DMC provides end-to-end destination management services in Uzbekistan, designed for international tour operators, agencies, and corporate clients.',
      uz: 'Centrum Holidays DMC xalqaro turoperatorlar, agentliklar va korporativ mijozlar uchun O‘zbekistonda kompleks destination management xizmatlarini taqdim etadi.',
    },
  },
  {
    key: 'home.why_text',
    group: 'home',
    label: 'Главная: текст Почему мы',
    textValue: {
      ru: 'Мы объединяем локальную экспертизу, надежную сеть поставщиков и внимательную операционную поддержку для стабильного результата.',
      en: 'We combine local expertise, a reliable supplier network, and attentive operational support to deliver a stable result.',
      uz: 'Biz mahalliy tajriba, ishonchli hamkorlar tarmog‘i va puxta operatsion yordamni birlashtiramiz.',
    },
  },
  {
    key: 'common.send',
    group: 'common',
    label: 'Кнопка: Отправить',
    textValue: { ru: 'Отправить', en: 'Send', uz: 'Yuborish' },
  },
  {
    key: 'common.more',
    group: 'common',
    label: 'Кнопка: Подробнее',
    textValue: { ru: 'Подробнее', en: 'Learn more', uz: 'Batafsil' },
  },
];

@Injectable()
export class AdminContentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type: AdminContentType) {
    switch (type) {
      case AdminContentType.PAGES:
        return this.listPages();
      case AdminContentType.SITE_SETTINGS:
        return this.listSiteSettings();
      case AdminContentType.MEDIA:
        return this.listMedia();
      case AdminContentType.HOME_BANNERS:
        return this.listHomeBanners();
      case AdminContentType.COUNTRIES:
        return this.listCountries();
      case AdminContentType.TOURS:
        return this.listTours();
      case AdminContentType.SERVICES:
        return this.listServices();
      case AdminContentType.WHY_CATEGORIES:
        return this.listWhyCategories();
      case AdminContentType.NEWS:
        return this.listNews();
      default:
        throw new BadRequestException('Unsupported content type');
    }
  }

  async update(type: AdminContentType, id: string, dto: AdminContentUpdateDto) {
    switch (type) {
      case AdminContentType.PAGES:
        await this.updatePage(id, dto);
        break;
      case AdminContentType.SITE_SETTINGS:
        await this.updateSiteSetting(id, dto);
        break;
      case AdminContentType.MEDIA:
        await this.updateMedia(id, dto);
        break;
      case AdminContentType.HOME_BANNERS:
        await this.updateHomeBanner(id, dto);
        break;
      case AdminContentType.COUNTRIES:
        await this.updateCountry(id, dto);
        break;
      case AdminContentType.TOURS:
        await this.updateTour(id, dto);
        break;
      case AdminContentType.SERVICES:
        await this.updateService(id, dto);
        break;
      case AdminContentType.WHY_CATEGORIES:
        await this.updateWhyCategory(id, dto);
        break;
      case AdminContentType.NEWS:
        await this.updateNews(id, dto);
        break;
      default:
        throw new BadRequestException('Unsupported content type');
    }

    const items = await this.list(type);
    const updated = items.find((item) => item.id === id);

    if (!updated) {
      throw new NotFoundException('Content item not found');
    }

    return updated;
  }

  async create(type: AdminContentType, dto: AdminContentCreateDto) {
    switch (type) {
      case AdminContentType.PAGES:
        return this.createPage(dto);
      case AdminContentType.SITE_SETTINGS:
        return this.createSiteSetting(dto);
      case AdminContentType.COUNTRIES:
        return this.createCountry(dto);
      case AdminContentType.TOURS:
        return this.createTour(dto);
      case AdminContentType.SERVICES:
        return this.createService(dto);
      case AdminContentType.NEWS:
        return this.createNews(dto);
      default:
        throw new BadRequestException('Create is not supported for this content type yet');
    }
  }

  private async createPage(dto: AdminContentCreateDto) {
    const record = await this.prisma.page.create({
      data: {
        slug: dto.slug,
        path: `/${dto.slug}`,
        status: dto.status ?? ContentStatus.DRAFT,
        sortOrder: dto.sortOrder ?? 0,
        translations: {
          create: LOCALES.map((locale) => {
            const fields = this.getCreateFields(dto, locale);

            return {
              locale,
              title: this.readString(fields.title, `Новая страница ${locale}`),
              menuLabel: this.readNullableString(fields.menuLabel),
              heroTitle: this.readNullableString(fields.heroTitle),
              heroSubtitle: this.readNullableString(fields.heroSubtitle),
              content: this.readJson(fields.content ?? DEFAULT_PAGES.find((page) => page.slug === dto.slug)?.content?.[locale]),
              seoTitle: this.readNullableString(fields.seoTitle),
              seoDescription: this.readNullableString(fields.seoDescription),
            };
          }),
        },
      },
    });

    const items = await this.list(AdminContentType.PAGES);
    return items.find((item) => item.id === record.id);
  }

  private async createSiteSetting(dto: AdminContentCreateDto) {
    const record = await this.prisma.siteSetting.create({
      data: {
        key: dto.slug,
        group: dto.group ?? 'general',
        isPublic: dto.isActive ?? true,
        translations: {
          create: LOCALES.map((locale) => {
            const fields = this.getCreateFields(dto, locale);

            return {
              locale,
              label: this.readString(fields.label, dto.slug),
              textValue: this.readNullableString(fields.textValue),
              description: this.readNullableString(fields.description),
            };
          }),
        },
      },
    });

    const items = await this.list(AdminContentType.SITE_SETTINGS);
    return items.find((item) => item.id === record.id);
  }

  async archive(type: AdminContentType, id: string) {
    switch (type) {
      case AdminContentType.PAGES:
        await this.archivePage(id);
        break;
      case AdminContentType.SITE_SETTINGS:
        await this.disableSiteSetting(id);
        break;
      case AdminContentType.MEDIA:
        await this.deleteMedia(id);
        break;
      case AdminContentType.HOME_BANNERS:
        await this.disableHomeBanner(id);
        break;
      case AdminContentType.COUNTRIES:
        await this.archiveCountry(id);
        break;
      case AdminContentType.TOURS:
        await this.archiveTour(id);
        break;
      case AdminContentType.SERVICES:
        await this.archiveService(id);
        break;
      case AdminContentType.WHY_CATEGORIES:
        await this.archiveWhyCategory(id);
        break;
      case AdminContentType.NEWS:
        await this.archiveNews(id);
        break;
      default:
        throw new BadRequestException('Unsupported content type');
    }

    return this.list(type);
  }

  private async createCountry(dto: AdminContentCreateDto) {
    const record = await this.prisma.country.create({
      data: {
        slug: dto.slug,
        status: dto.status ?? ContentStatus.DRAFT,
        sortOrder: dto.sortOrder ?? 0,
        isFeatured: dto.isFeatured ?? false,
        heroImage: dto.heroImage,
        translations: {
          create: LOCALES.map((locale) => {
            const fields = this.getCreateFields(dto, locale);

            return {
              locale,
              name: this.readString(fields.name, `Новая страна ${locale}`),
              welcomeTitle: this.readNullableString(fields.welcomeTitle),
              intro: this.readNullableString(fields.intro),
              sidebarTitle: this.readNullableString(fields.sidebarTitle),
              seoTitle: this.readNullableString(fields.seoTitle),
              seoDescription: this.readNullableString(fields.seoDescription),
            };
          }),
        },
      },
    });

    const items = await this.list(AdminContentType.COUNTRIES);
    return items.find((item) => item.id === record.id);
  }

  private async createTour(dto: AdminContentCreateDto) {
    if (!dto.countryId) {
      throw new BadRequestException('Country is required for tour creation');
    }

    await this.ensureExists(this.prisma.country.count({ where: { id: dto.countryId } }));

    const previewImage = dto.mainImage ?? dto.heroImage ?? null;

    const record = await this.prisma.tour.create({
      data: {
        countryId: dto.countryId,
        slug: dto.slug,
        type: dto.type ?? 'PRIVATE',
        durationDays: dto.durationDays ?? 1,
        durationNights: dto.durationNights ?? 0,
        minGroupSize: dto.minGroupSize,
        maxGroupSize: dto.maxGroupSize,
        comfortLevel: dto.comfortLevel,
        priceFrom: dto.priceFrom,
        currency: dto.currency ?? 'USD',
        status: dto.status ?? ContentStatus.DRAFT,
        isFeatured: dto.isFeatured ?? false,
        heroImage: previewImage,
        mainImage: previewImage,
        routeMapImage: dto.routeMapImage,
        translations: {
          create: LOCALES.map((locale) => {
            const fields = this.getCreateFields(dto, locale);

            return {
              locale,
              title: this.readString(fields.title, `Новый тур ${locale}`),
              subtitle: this.readNullableString(fields.subtitle),
              route: this.readString(fields.route, 'Маршрут уточняется'),
              description: this.readString(fields.description, 'Описание будет добавлено позже.'),
              detailsInfo: this.readNullableString(fields.detailsInfo),
              routesInfo: this.readNullableString(fields.routesInfo),
              reviewsInfo: this.readNullableString(fields.reviewsInfo),
              hotelsInfo: this.readNullableString(fields.hotelsInfo),
              transportInfo: this.readNullableString(fields.transportInfo),
              countriesInfo: this.readNullableString(fields.countriesInfo),
              seoTitle: this.readNullableString(fields.seoTitle),
              seoDescription: this.readNullableString(fields.seoDescription),
            };
          }),
        },
      },
    });

    const items = await this.list(AdminContentType.TOURS);
    return items.find((item) => item.id === record.id);
  }

  private async createService(dto: AdminContentCreateDto) {
    const previewImage = dto.previewImage ?? dto.heroImage ?? null;

    const record = await this.prisma.service.create({
      data: {
        slug: dto.slug,
        status: dto.status ?? ContentStatus.DRAFT,
        sortOrder: dto.sortOrder ?? 0,
        isFeatured: dto.isFeatured ?? false,
        heroImage: previewImage,
        previewImage,
        translations: {
          create: LOCALES.map((locale) => {
            const fields = this.getCreateFields(dto, locale);
            const name = this.readString(fields.name, `Новая услуга ${locale}`);

            return {
              locale,
              name,
              title: this.readString(fields.title, name),
              subtitle: this.readNullableString(fields.subtitle),
              shortDescription: this.readNullableString(fields.shortDescription),
              seoTitle: this.readNullableString(fields.seoTitle),
              seoDescription: this.readNullableString(fields.seoDescription),
            };
          }),
        },
      },
    });

    const items = await this.list(AdminContentType.SERVICES);
    return items.find((item) => item.id === record.id);
  }

  private async createNews(dto: AdminContentCreateDto) {
    const previewImage = dto.previewImage ?? dto.heroImage ?? null;

    const record = await this.prisma.news.create({
      data: {
        slug: dto.slug,
        status: dto.status ?? ContentStatus.DRAFT,
        heroImage: previewImage,
        previewImage,
        publishedAt: dto.status === ContentStatus.PUBLISHED ? new Date() : null,
        translations: {
          create: LOCALES.map((locale) => {
            const fields = this.getCreateFields(dto, locale);

            return {
              locale,
              title: this.readString(fields.title, `Новая новость ${locale}`),
              excerpt: this.readNullableString(fields.excerpt),
              seoTitle: this.readNullableString(fields.seoTitle),
              seoDescription: this.readNullableString(fields.seoDescription),
            };
          }),
        },
      },
    });

    const items = await this.list(AdminContentType.NEWS);
    return items.find((item) => item.id === record.id);
  }

  private async listPages() {
    await this.ensureDefaultPages();

    const records = await this.prisma.page.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.PAGES,
      slug: record.slug,
      title: this.getTitle(record.translations, 'title'),
      status: record.status,
      sortOrder: record.sortOrder,
      translations: this.mapTranslations(AdminContentType.PAGES, record.translations),
    }));
  }

  private async ensureDefaultPages() {
    const existingPages = await this.prisma.page.findMany({
      select: { slug: true, path: true },
    });
    const existingSlugs = new Set(existingPages.map((page) => page.slug));
    const existingPaths = new Set(existingPages.map((page) => page.path));

    const missingPages = DEFAULT_PAGES.filter(
      (page) => !existingSlugs.has(page.slug) && !existingPaths.has(page.path),
    );

    for (const page of missingPages) {
      await this.prisma.page.create({
        data: {
          slug: page.slug,
          path: page.path,
          status: ContentStatus.PUBLISHED,
          sortOrder: page.sortOrder,
          translations: {
            create: LOCALES.map((locale) => ({
              locale,
              title: page.translations[locale].title,
              menuLabel: page.translations[locale].menuLabel,
              heroTitle: page.translations[locale].heroTitle,
              heroSubtitle: page.translations[locale].heroSubtitle,
              content: page.content?.[locale] ?? Prisma.JsonNull,
              seoTitle: page.translations[locale].seoTitle,
              seoDescription: page.translations[locale].seoDescription,
            })),
          },
        },
      });
    }

    const pagesWithMissingContent = await this.prisma.page.findMany({
      where: { slug: { in: DEFAULT_PAGES.filter((page) => page.content).map((page) => page.slug) } },
      include: { translations: true },
    });

    for (const page of pagesWithMissingContent) {
      const defaultPage = DEFAULT_PAGES.find((item) => item.slug === page.slug);

      if (!defaultPage?.content) {
        continue;
      }

      for (const translation of page.translations) {
        if (!isEmptyJsonContent(translation.content)) {
          continue;
        }

        await this.prisma.pageTranslation.update({
          where: { id: translation.id },
          data: { content: defaultPage.content[translation.locale] },
        });
      }
    }
  }

  private async listSiteSettings() {
    await this.ensureDefaultSiteSettings();

    const records = await this.prisma.siteSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.SITE_SETTINGS,
      slug: record.key,
      title: this.getTitle(record.translations, 'label'),
      isActive: record.isPublic,
      translations: this.mapTranslations(AdminContentType.SITE_SETTINGS, record.translations),
    }));
  }

  private async ensureDefaultSiteSettings() {
    const existingSettings = await this.prisma.siteSetting.findMany({
      select: { key: true },
    });
    const existingKeys = new Set(existingSettings.map((setting) => setting.key));

    const missingSettings = DEFAULT_SITE_SETTINGS.filter((setting) => !existingKeys.has(setting.key));

    for (const setting of missingSettings) {
      await this.prisma.siteSetting.create({
        data: {
          key: setting.key,
          group: setting.group,
          isPublic: true,
          translations: {
            create: LOCALES.map((locale) => ({
              locale,
              label: locale === Locale.ru ? setting.label : setting.key,
              textValue: setting.textValue[locale],
              description: setting.description?.[locale],
            })),
          },
        },
      });
    }
  }

  private async listMedia() {
    const records = await this.prisma.mediaAsset.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map((record): AdminContentRecord => {
      const fileName = decodePossiblyMojibake(record.fileName);

      return {
      id: record.id,
      type: AdminContentType.MEDIA,
      slug: fileName,
      title: fileName,
      isActive: true,
      image: record.url,
      translations: {
        ru: { altText: record.altText ?? '' },
        en: { altText: record.altText ?? '' },
        uz: { altText: record.altText ?? '' },
      },
      };
    });
  }

  private async listHomeBanners() {
    const records = await this.prisma.homeBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.HOME_BANNERS,
      slug: record.slug,
      title: this.getTitle(record.translations, 'title'),
      sortOrder: record.sortOrder,
      isActive: record.isActive,
      image: record.imageUrl,
      images: { imageUrl: record.imageUrl },
      translations: this.mapTranslations(AdminContentType.HOME_BANNERS, record.translations),
    }));
  }

  private async listCountries() {
    const records = await this.prisma.country.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.COUNTRIES,
      slug: record.slug,
      title: this.getTitle(record.translations, 'name'),
      status: record.status,
      sortOrder: record.sortOrder,
      isFeatured: record.isFeatured,
      image: record.heroImage,
      images: { heroImage: record.heroImage },
      translations: this.mapTranslations(AdminContentType.COUNTRIES, record.translations),
    }));
  }

  private async listTours() {
    const records = await this.prisma.tour.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.TOURS,
      slug: record.slug,
      title: this.getTitle(record.translations, 'title'),
      status: record.status,
      isFeatured: record.isFeatured,
      countryId: record.countryId,
      durationDays: record.durationDays,
      durationNights: record.durationNights,
      minGroupSize: record.minGroupSize,
      maxGroupSize: record.maxGroupSize,
      comfortLevel: record.comfortLevel,
      priceFrom: record.priceFrom?.toString() ?? null,
      currency: record.currency,
      tourType: record.type,
      image: record.mainImage ?? record.heroImage,
      images: {
        mainImage: record.mainImage ?? record.heroImage,
        routeMapImage: record.routeMapImage,
      },
      translations: this.mapTranslations(AdminContentType.TOURS, record.translations),
    }));
  }

  private async listServices() {
    const records = await this.prisma.service.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.SERVICES,
      slug: record.slug,
      title: this.getTitle(record.translations, 'name'),
      status: record.status,
      sortOrder: record.sortOrder,
      isFeatured: record.isFeatured,
      image: record.previewImage,
      images: { previewImage: record.previewImage ?? record.heroImage },
      translations: this.mapTranslations(AdminContentType.SERVICES, record.translations),
    }));
  }

  private async listWhyCategories() {
    const records = await this.prisma.whyCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        translations: true,
        facts: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { translations: true },
        },
      },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.WHY_CATEGORIES,
      slug: record.slug,
      title: this.getTitle(record.translations, 'title'),
      status: record.status,
      sortOrder: record.sortOrder,
      image: record.heroImage,
      images: { heroImage: record.heroImage },
      translations: this.mapTranslations(AdminContentType.WHY_CATEGORIES, record.translations),
      whyFacts: record.facts.map((fact) => ({
        id: fact.id,
        sortOrder: fact.sortOrder,
        status: fact.status,
        imageUrl: fact.imageUrl,
        translations: this.mapWhyFactTranslations(fact.translations),
      })),
    }));
  }

  private async listNews() {
    const records = await this.prisma.news.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: { translations: true },
    });

    return records.map((record): AdminContentRecord => ({
      id: record.id,
      type: AdminContentType.NEWS,
      slug: record.slug,
      title: this.getTitle(record.translations, 'title'),
      status: record.status,
      image: record.previewImage,
      images: { previewImage: record.previewImage ?? record.heroImage },
      translations: this.mapTranslations(AdminContentType.NEWS, record.translations),
    }));
  }

  private async updateHomeBanner(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.homeBanner.count({ where: { id } }));
    await this.prisma.homeBanner.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.HOME_BANNERS, id, dto);
  }

  private async updatePage(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.page.count({ where: { id } }));
    await this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.path !== undefined ? { path: dto.path } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.PAGES, id, dto);
  }

  private async updateSiteSetting(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.siteSetting.count({ where: { id } }));
    await this.prisma.siteSetting.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { key: dto.slug } : {}),
        ...(dto.group !== undefined ? { group: dto.group } : {}),
        ...(dto.isActive !== undefined ? { isPublic: dto.isActive } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.SITE_SETTINGS, id, dto);
  }

  private async updateMedia(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.mediaAsset.count({ where: { id } }));
    const altText =
      dto.altText ??
      dto.translations?.find((translation) => translation.locale === Locale.ru)?.fields.altText;
    await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        ...(dto.fileName !== undefined ? { fileName: dto.fileName } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.mimeType !== undefined ? { mimeType: dto.mimeType } : {}),
        ...(dto.group !== undefined ? { group: dto.group } : {}),
        ...(typeof altText === 'string' ? { altText } : {}),
      },
    });
  }

  private async updateCountry(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.country.count({ where: { id } }));
    await this.prisma.country.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.heroImage !== undefined ? { heroImage: dto.heroImage } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.COUNTRIES, id, dto);
  }

  private async updateTour(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.tour.count({ where: { id } }));
    const previewImage = dto.mainImage ?? dto.heroImage;
    await this.prisma.tour.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays } : {}),
        ...(dto.durationNights !== undefined ? { durationNights: dto.durationNights } : {}),
        ...(dto.minGroupSize !== undefined ? { minGroupSize: dto.minGroupSize } : {}),
        ...(dto.maxGroupSize !== undefined ? { maxGroupSize: dto.maxGroupSize } : {}),
        ...(dto.comfortLevel !== undefined ? { comfortLevel: dto.comfortLevel } : {}),
        ...(dto.priceFrom !== undefined ? { priceFrom: dto.priceFrom } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.routeMapImage !== undefined ? { routeMapImage: dto.routeMapImage } : {}),
        ...(previewImage !== undefined ? { heroImage: previewImage, mainImage: previewImage } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.TOURS, id, dto);
  }

  private async updateService(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.service.count({ where: { id } }));
    const previewImage = dto.previewImage ?? dto.heroImage;
    await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(previewImage !== undefined ? { heroImage: previewImage, previewImage } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.SERVICES, id, dto);
  }

  private async updateWhyCategory(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.whyCategory.count({ where: { id } }));
    await this.prisma.whyCategory.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.heroImage !== undefined ? { heroImage: dto.heroImage } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.WHY_CATEGORIES, id, dto);
    await this.updateWhyFacts(id, dto);
  }

  private async updateWhyFacts(categoryId: string, dto: AdminContentUpdateDto) {
    if (!dto.whyFacts) {
      return;
    }

    for (const [index, fact] of dto.whyFacts.entries()) {
      const factId = fact.id;
      const baseData = {
        sortOrder: fact.sortOrder ?? index,
        status: fact.status ?? ContentStatus.PUBLISHED,
        imageUrl: fact.imageUrl ?? null,
      };

      const record = factId
        ? await this.prisma.whyFact.update({
            where: { id: factId },
            data: baseData,
          })
        : await this.prisma.whyFact.create({
            data: {
              whyCategoryId: categoryId,
              ...baseData,
              translations: {
                create: LOCALES.map((locale) => {
                  const fields = fact.translations?.find((translation) => translation.locale === locale)?.fields ?? {};

                  return {
                    locale,
                    title: this.readString(fields.title, `Факт ${index + 1}`),
                    subtitle: this.readNullableString(fields.subtitle),
                    description: this.readString(fields.description, 'Описание будет добавлено позже.'),
                  };
                }),
              },
            },
          });

      if (!factId || !fact.translations) {
        continue;
      }

      for (const translation of fact.translations) {
        await this.prisma.whyFactTranslation.upsert({
          where: {
            whyFactId_locale: {
              whyFactId: record.id,
              locale: translation.locale,
            },
          },
          create: {
            whyFactId: record.id,
            locale: translation.locale,
            title: this.readString(translation.fields.title, `Факт ${index + 1}`),
            subtitle: this.readNullableString(translation.fields.subtitle),
            description: this.readString(translation.fields.description, 'Описание будет добавлено позже.'),
          },
          update: {
            title: this.readString(translation.fields.title, `Факт ${index + 1}`),
            subtitle: this.readNullableString(translation.fields.subtitle),
            description: this.readString(translation.fields.description, 'Описание будет добавлено позже.'),
          },
        });
      }
    }
  }

  private async updateNews(id: string, dto: AdminContentUpdateDto) {
    await this.ensureExists(this.prisma.news.count({ where: { id } }));
    const previewImage = dto.previewImage ?? dto.heroImage;
    await this.prisma.news.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(previewImage !== undefined ? { heroImage: previewImage, previewImage } : {}),
      },
    });
    await this.updateTranslations(AdminContentType.NEWS, id, dto);
  }

  private async archivePage(id: string) {
    await this.ensureExists(this.prisma.page.count({ where: { id } }));
    await this.prisma.page.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
  }

  private async disableSiteSetting(id: string) {
    await this.ensureExists(this.prisma.siteSetting.count({ where: { id } }));
    await this.prisma.siteSetting.update({ where: { id }, data: { isPublic: false } });
  }

  private async deleteMedia(id: string) {
    await this.ensureExists(this.prisma.mediaAsset.count({ where: { id } }));
    await this.prisma.mediaAsset.delete({ where: { id } });
  }

  private async disableHomeBanner(id: string) {
    await this.ensureExists(this.prisma.homeBanner.count({ where: { id } }));
    await this.prisma.homeBanner.update({ where: { id }, data: { isActive: false } });
  }

  private async archiveCountry(id: string) {
    await this.ensureExists(this.prisma.country.count({ where: { id } }));
    await this.prisma.country.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
  }

  private async archiveTour(id: string) {
    await this.ensureExists(this.prisma.tour.count({ where: { id } }));
    await this.prisma.tour.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
  }

  private async archiveService(id: string) {
    await this.ensureExists(this.prisma.service.count({ where: { id } }));
    await this.prisma.service.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
  }

  private async archiveWhyCategory(id: string) {
    await this.ensureExists(this.prisma.whyCategory.count({ where: { id } }));
    await this.prisma.whyCategory.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
  }

  private async archiveNews(id: string) {
    await this.ensureExists(this.prisma.news.count({ where: { id } }));
    await this.prisma.news.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
  }

  private async updateTranslations(type: AdminContentType, id: string, dto: AdminContentUpdateDto) {
    const allowedFields = TRANSLATION_FIELDS[type];
    const translations = dto.translations ?? [];

    for (const translation of translations) {
      const data = this.pickAllowedFields(translation.fields, allowedFields);

      if (!Object.keys(data).length) {
        continue;
      }

      switch (type) {
        case AdminContentType.PAGES:
          await this.prisma.pageTranslation.updateMany({
            where: { pageId: id, locale: translation.locale },
            data: this.preparePageTranslationData(
              data,
            ) as Prisma.PageTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.SITE_SETTINGS:
          await this.prisma.siteSettingTranslation.updateMany({
            where: { siteSettingId: id, locale: translation.locale },
            data: data as Prisma.SiteSettingTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.MEDIA:
          break;
        case AdminContentType.HOME_BANNERS:
          await this.prisma.homeBannerTranslation.updateMany({
            where: { homeBannerId: id, locale: translation.locale },
            data: data as Prisma.HomeBannerTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.COUNTRIES:
          await this.prisma.countryTranslation.updateMany({
            where: { countryId: id, locale: translation.locale },
            data: data as Prisma.CountryTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.TOURS:
          await this.prisma.tourTranslation.updateMany({
            where: { tourId: id, locale: translation.locale },
            data: data as Prisma.TourTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.SERVICES:
          await this.prisma.serviceTranslation.updateMany({
            where: { serviceId: id, locale: translation.locale },
            data: data as Prisma.ServiceTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.WHY_CATEGORIES:
          await this.prisma.whyCategoryTranslation.updateMany({
            where: { whyCategoryId: id, locale: translation.locale },
            data: data as Prisma.WhyCategoryTranslationUpdateManyMutationInput,
          });
          break;
        case AdminContentType.NEWS:
          await this.prisma.newsTranslation.updateMany({
            where: { newsId: id, locale: translation.locale },
            data: data as Prisma.NewsTranslationUpdateManyMutationInput,
          });
          break;
      }
    }
  }

  private mapTranslations(
    type: AdminContentType,
    translations: ContentTranslation[],
  ): Record<Locale, Record<string, unknown>> {
    const fields = TRANSLATION_FIELDS[type];
    const result = LOCALES.reduce(
      (acc, locale) => ({ ...acc, [locale]: {} }),
      {} as Record<Locale, Record<string, unknown>>,
    );

    for (const translation of translations) {
      result[translation.locale] = this.pickAllowedFields(translation, fields);
    }

    return result;
  }

  private mapWhyFactTranslations(
    translations: ContentTranslation[],
  ): Record<Locale, Record<string, unknown>> {
    const result = LOCALES.reduce(
      (acc, locale) => ({ ...acc, [locale]: {} }),
      {} as Record<Locale, Record<string, unknown>>,
    );

    for (const translation of translations) {
      result[translation.locale] = this.pickAllowedFields(translation, ['title', 'subtitle', 'description']);
    }

    return result;
  }

  private getTitle(translations: ContentTranslation[], field: string) {
    const preferred =
      translations.find((translation) => translation.locale === Locale.ru) ??
      translations.find((translation) => translation.locale === Locale.en) ??
      translations[0];

    return typeof preferred?.[field] === 'string' ? preferred[field] : 'Без названия';
  }

  private pickAllowedFields(source: Record<string, unknown>, fields: string[]) {
    return fields.reduce<Record<string, unknown>>((acc, field) => {
      if (source[field] !== undefined) {
        acc[field] = source[field];
      }
      return acc;
    }, {});
  }

  private preparePageTranslationData(data: Record<string, unknown>) {
    if (typeof data.content !== 'string') {
      return data;
    }

    const rawContent = data.content.trim();

    if (!rawContent) {
      return { ...data, content: Prisma.JsonNull };
    }

    try {
      return { ...data, content: JSON.parse(rawContent) };
    } catch {
      return { ...data, content: [{ text: rawContent }] };
    }
  }

  private getCreateFields(dto: AdminContentCreateDto, locale: Locale) {
    return dto.translations.find((translation) => translation.locale === locale)?.fields ?? {};
  }

  private readString(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private readNullableString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readJson(value: unknown) {
    if (typeof value !== 'string') {
      return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
    }

    const rawValue = value.trim();

    if (!rawValue) {
      return Prisma.JsonNull;
    }

    try {
      return JSON.parse(rawValue) as Prisma.InputJsonValue;
    } catch {
      return [{ text: rawValue }] as Prisma.InputJsonValue;
    }
  }

  private async ensureExists(countPromise: Promise<number>) {
    const count = await countPromise;

    if (!count) {
      throw new NotFoundException('Content item not found');
    }
  }
}
