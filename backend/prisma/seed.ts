import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.pageTranslation.deleteMany();
  await prisma.page.deleteMany();
  await prisma.siteSettingTranslation.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.homeBannerTranslation.deleteMany();
  await prisma.homeBanner.deleteMany();
  await prisma.bookingTranslation.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.leadTranslation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.whyFactTranslation.deleteMany();
  await prisma.whyFact.deleteMany();
  await prisma.whyCategoryTranslation.deleteMany();
  await prisma.whyCategory.deleteMany();
  await prisma.newsTranslation.deleteMany();
  await prisma.news.deleteMany();
  await prisma.serviceTranslation.deleteMany();
  await prisma.service.deleteMany();
  await prisma.tourImageTranslation.deleteMany();
  await prisma.tourImage.deleteMany();
  await prisma.tourDayTranslation.deleteMany();
  await prisma.tourDay.deleteMany();
  await prisma.tourTranslation.deleteMany();
  await prisma.tour.deleteMany();
  await prisma.countryTranslation.deleteMany();
  await prisma.country.deleteMany();
  await prisma.userTranslation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.partnerTranslation.deleteMany();
  await prisma.partner.deleteMany();

  await prisma.page.create({
    data: {
      slug: 'about',
      path: '/about',
      status: 'PUBLISHED',
      sortOrder: 10,
      translations: {
        create: [
          {
            locale: 'ru',
            title: 'О нас',
            menuLabel: 'О нас',
            heroTitle: 'CENTRUM HOLIDAYS',
            heroSubtitle: 'Национальный туроператор Узбекистана',
            seoTitle: 'О нас - Centrum Holidays',
            seoDescription: 'Информация о компании Centrum Holidays.',
          },
          {
            locale: 'en',
            title: 'About us',
            menuLabel: 'About us',
            heroTitle: 'CENTRUM HOLIDAYS',
            heroSubtitle: 'National tour operator of Uzbekistan',
            seoTitle: 'About us - Centrum Holidays',
            seoDescription: 'Information about Centrum Holidays.',
          },
          {
            locale: 'uz',
            title: 'Biz haqimizda',
            menuLabel: 'Biz haqimizda',
            heroTitle: 'CENTRUM HOLIDAYS',
            heroSubtitle: 'O‘zbekiston milliy turoperatori',
            seoTitle: 'Biz haqimizda - Centrum Holidays',
            seoDescription: 'Centrum Holidays haqida ma’lumot.',
          },
        ],
      },
    },
  });

  await prisma.page.create({
    data: {
      slug: 'directions',
      path: '/directions',
      status: 'PUBLISHED',
      sortOrder: 20,
      translations: {
        create: [
          {
            locale: 'ru',
            title: 'Направления',
            menuLabel: 'Направления',
            heroTitle: 'Направления Centrum Holidays',
            heroSubtitle: 'Маршруты по Узбекистану и соседним странам',
            content: [
              {
                title: 'Индивидуальные и групповые маршруты',
                text: 'Мы проектируем маршруты под запрос агентств, компаний и путешественников.',
              },
              {
                title: 'Региональная экспертиза',
                text: 'Команда работает с Узбекистаном, Центральной Азией и комбинированными программами.',
              },
            ] as Prisma.InputJsonValue,
            seoTitle: 'Направления - Centrum Holidays',
            seoDescription: 'Туристические направления Centrum Holidays.',
          },
          {
            locale: 'en',
            title: 'Directions',
            menuLabel: 'Directions',
            heroTitle: 'Centrum Holidays Directions',
            heroSubtitle: 'Routes across Uzbekistan and neighboring countries',
            content: [
              {
                title: 'Private and group routes',
                text: 'We design routes for agencies, companies, and travelers.',
              },
              {
                title: 'Regional expertise',
                text: 'The team works with Uzbekistan, Central Asia, and combined programs.',
              },
            ] as Prisma.InputJsonValue,
            seoTitle: 'Directions - Centrum Holidays',
            seoDescription: 'Centrum Holidays travel directions.',
          },
          {
            locale: 'uz',
            title: 'Yo‘nalishlar',
            menuLabel: 'Yo‘nalishlar',
            heroTitle: 'Centrum Holidays Yo‘nalishlari',
            heroSubtitle: 'O‘zbekiston va qo‘shni mamlakatlar bo‘ylab marshrutlar',
            content: [
              {
                title: 'Individual va guruh marshrutlari',
                text: 'Biz agentliklar, kompaniyalar va sayyohlar uchun marshrutlar ishlab chiqamiz.',
              },
              {
                title: 'Mintaqaviy tajriba',
                text: 'Jamoa O‘zbekiston, Markaziy Osiyo va kombinatsiyalangan dasturlar bilan ishlaydi.',
              },
            ] as Prisma.InputJsonValue,
            seoTitle: 'Yo‘nalishlar - Centrum Holidays',
            seoDescription: 'Centrum Holidays sayohat yo‘nalishlari.',
          },
        ],
      },
    },
  });

  await prisma.siteSetting.create({
    data: {
      key: 'contacts.main',
      group: 'contacts',
      value: {
        phone: '+998(99) 229-75-75',
        email: 'info@centrum-holidays.test',
        whatsapp: 'https://wa.me/998992297575',
      } as Prisma.InputJsonValue,
      translations: {
        create: [
          {
            locale: 'ru',
            label: 'Контакты',
            textValue: 'Телефон, email и ссылки мессенджеров',
          },
          {
            locale: 'en',
            label: 'Contacts',
            textValue: 'Phone, email and messenger links',
          },
          {
            locale: 'uz',
            label: 'Kontaktlar',
            textValue: 'Telefon, email va messenjer havolalari',
          },
        ],
      },
    },
  });

  const homeTextSettings = [
    {
      key: 'nav.about',
      ru: 'О нас',
      en: 'About us',
      uz: 'Biz haqimizda',
    },
    {
      key: 'nav.directions',
      ru: 'Направления',
      en: 'Directions',
      uz: 'Yo‘nalishlar',
    },
    {
      key: 'nav.services',
      ru: 'Услуги',
      en: 'Services',
      uz: 'Xizmatlar',
    },
    {
      key: 'nav.why_we',
      ru: 'Почему мы?',
      en: 'Why us?',
      uz: 'Nega biz?',
    },
    {
      key: 'nav.countries',
      ru: 'Страны',
      en: 'Countries',
      uz: 'Davlatlar',
    },
    {
      key: 'nav.tours',
      ru: 'Туры',
      en: 'Tours',
      uz: 'Turlar',
    },
    {
      key: 'nav.for_agent',
      ru: 'Агентам',
      en: 'For Agent',
      uz: 'Agentlar uchun',
    },
    {
      key: 'footer.email',
      ru: 'info@centrumholidaysdmc.uz',
      en: 'info@centrumholidaysdmc.uz',
      uz: 'info@centrumholidaysdmc.uz',
    },
    {
      key: 'footer.phone',
      ru: '+998(77) 290-08-80',
      en: '+998(77) 290-08-80',
      uz: '+998(77) 290-08-80',
    },
    {
      key: 'home.cards.about.description',
      ru: 'Centrum Holidays DMC - принимающая компания в Узбекистане с молодой динамичной командой, которая развивается и делает акцент на инновациях и высоких стандартах сервиса.',
      en: 'Centrum Holidays DMC is a destination management company in Uzbekistan with a young, dynamic team, steadily growing and focused on innovation and high service standards.',
      uz: 'Centrum Holidays DMC - O‘zbekistondagi destination management kompaniyasi bo‘lib, yosh va faol jamoa bilan xizmat standartlarini rivojlantiradi.',
    },
    {
      key: 'home.cards.directions.description',
      ru: 'Мы создаем маршруты по Узбекистану и соседним направлениям для индивидуальных туристов, групп и корпоративных клиентов.',
      en: 'We create routes across Uzbekistan and neighboring destinations for individual travelers, groups, and corporate clients.',
      uz: 'Biz individual sayyohlar, guruhlar va korporativ mijozlar uchun O‘zbekiston va qo‘shni yo‘nalishlar bo‘yicha marshrutlar yaratamiz.',
    },
    {
      key: 'home.cards.services.description',
      ru: 'Мы предоставляем полный комплекс услуг: трансферы, визовую поддержку, размещение, экскурсии, медицинский туризм и индивидуальные программы.',
      en: 'We provide end-to-end services for individual and group tourism, from airport transfers and visa support to accommodation, health tourism, cultural tours, and tailored programmes.',
      uz: 'Biz transferlar, viza yordami, joylashtirish, sog‘liq turizmi, madaniy turlar va individual dasturlarni o‘z ichiga olgan kompleks xizmatlarni taqdim etamiz.',
    },
    {
      key: 'home.cards.why.description',
      ru: 'Мы берем на себя организацию поездки от планирования до завершения, чтобы каждый этап был понятным, надежным и удобным.',
      en: 'Because this approach makes the entire process effortless for you. From the planning stage of your trip to its completion, it offers a comprehensive and reliable solution that you can confidently utilise at every step.',
      uz: 'Biz sayohatni rejalashtirishdan yakunigacha tashkil etamiz, shunda har bir bosqich aniq, ishonchli va qulay bo‘ladi.',
    },
    {
      key: 'home.services_text',
      ru: 'Centrum Holidays DMC предоставляет полный комплекс destination management услуг в Узбекистане для международных туроператоров, агентств и корпоративных клиентов.',
      en: 'Centrum Holidays DMC provides end-to-end destination management services in Uzbekistan, designed for international tour operators, agencies, and corporate clients.',
      uz: 'Centrum Holidays DMC xalqaro turoperatorlar, agentliklar va korporativ mijozlar uchun O‘zbekistonda kompleks destination management xizmatlarini taqdim etadi.',
    },
    {
      key: 'home.why_text',
      ru: 'Мы объединяем локальную экспертизу, надежную сеть поставщиков и внимательную операционную поддержку для стабильного результата.',
      en: 'We combine local expertise, a reliable supplier network, and attentive operational support to deliver a stable result.',
      uz: 'Biz mahalliy tajriba, ishonchli hamkorlar tarmog‘i va puxta operatsion yordamni birlashtiramiz.',
    },
  ];

  for (const setting of homeTextSettings) {
    await prisma.siteSetting.create({
      data: {
        key: setting.key,
        group: setting.key.split('.')[0],
        isPublic: true,
        translations: {
          create: [
            { locale: 'ru', label: setting.key, textValue: setting.ru },
            { locale: 'en', label: setting.key, textValue: setting.en },
            { locale: 'uz', label: setting.key, textValue: setting.uz },
          ],
        },
      },
    });
  }

  await prisma.mediaAsset.createMany({
    data: [
      {
        fileName: 'Logo Orig.png',
        url: '/assets/icons/Logo Orig.png',
        mimeType: 'image/png',
        altText: 'Centrum Holidays logo',
        group: 'brand',
      },
      {
        fileName: 'directions.jpg',
        url: '/assets/icons/directions.jpg',
        mimeType: 'image/jpeg',
        altText: 'Directions hero image',
        group: 'home',
      },
      {
        fileName: 'services.jpg',
        url: '/assets/icons/services.jpg',
        mimeType: 'image/jpeg',
        altText: 'Services image',
        group: 'services',
      },
    ],
  });

  const partner = await prisma.partner.create({
    data: {
      slug: 'centrium-travel-agency',
      type: 'AGENCY',
      email: 'partners@centrum-holidays.test',
      phone: '+998900001122',
      website: 'https://partners.centrum-holidays.test',
      city: 'Tashkent',
      tin: '309887776',
      translations: {
        create: [
          {
            locale: 'ru',
            name: 'Centrum Travel Agency',
            description: 'Партнерское агентство для B2B продаж и заявок.',
            contactTitle: 'Стать партнером',
            submitLabel: 'Отправить заявку',
          },
          {
            locale: 'en',
            name: 'Centrum Travel Agency',
            description: 'Partner agency for B2B sales and inbound requests.',
            contactTitle: 'Become a partner',
            submitLabel: 'Send request',
          },
          {
            locale: 'uz',
            name: 'Centrum Travel Agency',
            description: 'B2B sotuvlar va kiruvchi so‘rovlar uchun hamkor agentlik.',
            contactTitle: 'Hamkor bo‘lish',
            submitLabel: 'So‘rov yuborish',
          },
        ],
      },
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'admin@centrum-holidays.test',
      passwordHash: '$2b$10$seededpasswordhash',
      firstName: 'Abdulaziz',
      lastName: 'Abdurakhmanov',
      phone: '+998900000001',
      role: 'PARTNER',
      status: 'ACTIVE',
      preferredLocale: 'en',
      partnerId: partner.id,
      translations: {
        create: [
          {
            locale: 'ru',
            displayName: 'Абдулазиз Абдурахманов',
            bio: 'Администратор контента и партнерского кабинета.',
            notes: 'Имеет полный доступ к CMS.',
          },
          {
            locale: 'en',
            displayName: 'Abdulaziz Abdurakhmanov',
            bio: 'Content and partner portal administrator.',
            notes: 'Has full CMS access.',
          },
          {
            locale: 'uz',
            displayName: 'Abdulaziz Abdurakhmanov',
            bio: 'Kontent va hamkor kabineti administratori.',
            notes: 'CMS bo‘yicha to‘liq huquqlarga ega.',
          },
        ],
      },
    },
  });

  const adminPasswordHash = await bcrypt.hash('admin12345', 10);
  const managerPasswordHash = await bcrypt.hash('manager12345', 10);

  await prisma.user.create({
    data: {
      email: 'superadmin@centrum-holidays.test',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      preferredLocale: 'ru',
      translations: {
        create: [
          {
            locale: 'ru',
            displayName: 'Системный администратор',
            bio: 'Администратор системы.',
          },
          {
            locale: 'en',
            displayName: 'System administrator',
            bio: 'System administrator.',
          },
          {
            locale: 'uz',
            displayName: 'Tizim administratori',
            bio: 'Tizim administratori.',
          },
        ],
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'manager@centrum-holidays.test',
      passwordHash: managerPasswordHash,
      firstName: 'Content',
      lastName: 'Manager',
      role: 'MANAGER',
      status: 'ACTIVE',
      preferredLocale: 'ru',
      translations: {
        create: [
          {
            locale: 'ru',
            displayName: 'Контент-менеджер',
            bio: 'Менеджер контента и заявок.',
          },
          {
            locale: 'en',
            displayName: 'Content manager',
            bio: 'Content and leads manager.',
          },
          {
            locale: 'uz',
            displayName: 'Kontent menejeri',
            bio: 'Kontent va lead menejeri.',
          },
        ],
      },
    },
  });

  const uzbekistan = await prisma.country.create({
    data: {
      slug: 'uzbekistan',
      isoCode: 'UZ',
      heroImage: '/assets/icons/countryPage.jpg',
      flagImage: '/assets/icons/uzbek.png',
      isFeatured: true,
      status: 'PUBLISHED',
      translations: {
        create: [
          {
            locale: 'ru',
            name: 'Узбекистан',
            welcomeTitle: 'Добро пожаловать в Узбекистан',
            intro: 'Страна Великого шелкового пути, ярких городов и гастрономических маршрутов.',
            sidebarTitle: 'Туристические места Узбекистана',
            cities: [
              { code: 'tashkent', name: 'Ташкент' },
              { code: 'samarkand', name: 'Самарканд' },
              { code: 'bukhara', name: 'Бухара' },
            ] as Prisma.InputJsonValue,
            toc: [
              { id: 'why', title: 'Почему Узбекистан?' },
              { id: 'cuisine', title: 'Кухня Узбекистана' },
              { id: 'visa', title: 'Виза в Узбекистан' },
            ] as Prisma.InputJsonValue,
            sections: [
              { id: 'why', title: 'Почему Узбекистан?', text: 'Безопасное направление с богатым культурным наследием.' },
              { id: 'cuisine', title: 'Кухня Узбекистана', text: 'Плов, самса, манты и региональные гастрономические открытия.' },
              { id: 'visa', title: 'Виза в Узбекистан', text: 'Для многих рынков действует безвизовый или упрощенный режим.' },
            ] as Prisma.InputJsonValue,
          },
          {
            locale: 'en',
            name: 'Uzbekistan',
            welcomeTitle: 'Welcome to Uzbekistan',
            intro: 'A Silk Road destination with vivid cities and strong cultural routes.',
            sidebarTitle: 'Tourist places of Uzbekistan',
            cities: [
              { code: 'tashkent', name: 'Tashkent' },
              { code: 'samarkand', name: 'Samarkand' },
              { code: 'bukhara', name: 'Bukhara' },
            ] as Prisma.InputJsonValue,
            toc: [
              { id: 'why', title: 'Why Uzbekistan?' },
              { id: 'cuisine', title: 'Cuisine of Uzbekistan' },
              { id: 'visa', title: 'Visa to Uzbekistan' },
            ] as Prisma.InputJsonValue,
            sections: [
              { id: 'why', title: 'Why Uzbekistan?', text: 'A safe destination with strong cultural heritage.' },
              { id: 'cuisine', title: 'Cuisine of Uzbekistan', text: 'Pilaf, samsa, manti and regional culinary discoveries.' },
              { id: 'visa', title: 'Visa to Uzbekistan', text: 'Many markets benefit from visa-free or simplified entry.' },
            ] as Prisma.InputJsonValue,
          },
          {
            locale: 'uz',
            name: 'O‘zbekiston',
            welcomeTitle: 'O‘zbekistonga xush kelibsiz',
            intro: 'Buyuk ipak yo‘li, yorqin shaharlar va madaniy yo‘nalishlar mamlakati.',
            sidebarTitle: 'O‘zbekistonning sayyohlik maskanlari',
            cities: [
              { code: 'tashkent', name: 'Toshkent' },
              { code: 'samarkand', name: 'Samarqand' },
              { code: 'bukhara', name: 'Buxoro' },
            ] as Prisma.InputJsonValue,
            toc: [
              { id: 'why', title: 'Nima uchun O‘zbekiston?' },
              { id: 'cuisine', title: 'O‘zbekiston oshxonasi' },
              { id: 'visa', title: 'O‘zbekistonga viza' },
            ] as Prisma.InputJsonValue,
            sections: [
              { id: 'why', title: 'Nima uchun O‘zbekiston?', text: 'Boy madaniy merosga ega xavfsiz yo‘nalish.' },
              { id: 'cuisine', title: 'O‘zbekiston oshxonasi', text: 'Osh, somsa, manti va hududiy taomlar.' },
              { id: 'visa', title: 'O‘zbekistonga viza', text: 'Ko‘plab bozorlarda vizasiz yoki soddalashtirilgan tartib mavjud.' },
            ] as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  const kazakhstan = await prisma.country.create({
    data: {
      slug: 'kazakhstan',
      isoCode: 'KZ',
      heroImage: '/assets/icons/countryPage2.jpg',
      flagImage: '/assets/icons/kazah.png',
      isFeatured: true,
      status: 'PUBLISHED',
      translations: {
        create: [
          {
            locale: 'ru',
            name: 'Казахстан',
            welcomeTitle: 'Добро пожаловать в Казахстан',
            intro: 'Города, степи и событийные маршруты Центральной Азии.',
            sidebarTitle: 'Туристические места Казахстана',
          },
          {
            locale: 'en',
            name: 'Kazakhstan',
            welcomeTitle: 'Welcome to Kazakhstan',
            intro: 'Cities, steppes and event routes across Central Asia.',
            sidebarTitle: 'Tourist places of Kazakhstan',
          },
          {
            locale: 'uz',
            name: 'Qozog‘iston',
            welcomeTitle: 'Qozog‘istonga xush kelibsiz',
            intro: 'Markaziy Osiyoning shaharlari, dashtlari va tadbir yo‘nalishlari.',
            sidebarTitle: 'Qozog‘istonning sayyohlik maskanlari',
          },
        ],
      },
    },
  });

  await prisma.homeBanner.createMany({
    data: [
      {
        id: '09de34b1-51e8-48a5-aef8-a95d8c5c2e01',
        slug: 'silk-road-discoveries',
        imageUrl: '/assets/icons/tours.png',
        mobileImageUrl: '/assets/icons/tours.png',
        linkUrl: '/tours',
        sortOrder: 1,
        isActive: true,
      },
      {
        id: 'f52072ca-8024-4bd3-9206-56c78f7068e0',
        slug: 'dmc-services',
        imageUrl: '/assets/icons/services.jpg',
        mobileImageUrl: '/assets/icons/services.jpg',
        linkUrl: '/services',
        sortOrder: 2,
        isActive: true,
      },
    ],
  });

  await prisma.homeBannerTranslation.createMany({
    data: [
      {
        homeBannerId: '09de34b1-51e8-48a5-aef8-a95d8c5c2e01',
        locale: 'ru',
        title: 'Туры по Великому шелковому пути',
        subtitle: 'Узбекистан, Казахстан и маршруты по Центральной Азии.',
        buttonLabel: 'Смотреть туры',
        altText: 'Баннер туров по Центральной Азии',
      },
      {
        homeBannerId: '09de34b1-51e8-48a5-aef8-a95d8c5c2e01',
        locale: 'en',
        title: 'Silk Road discovery tours',
        subtitle: 'Uzbekistan, Kazakhstan and wider Central Asia itineraries.',
        buttonLabel: 'View tours',
        altText: 'Banner for Central Asia tours',
      },
      {
        homeBannerId: '09de34b1-51e8-48a5-aef8-a95d8c5c2e01',
        locale: 'uz',
        title: 'Buyuk ipak yo‘li bo‘ylab turlar',
        subtitle: 'O‘zbekiston, Qozog‘iston va Markaziy Osiyo marshrutlari.',
        buttonLabel: 'Turlarni ko‘rish',
        altText: 'Markaziy Osiyo turlari banneri',
      },
      {
        homeBannerId: 'f52072ca-8024-4bd3-9206-56c78f7068e0',
        locale: 'ru',
        title: 'DMC сервисы для партнеров',
        subtitle: 'Индивидуальные маршруты, наземное обслуживание и MICE.',
        buttonLabel: 'Все услуги',
        altText: 'Баннер услуг DMC',
      },
      {
        homeBannerId: 'f52072ca-8024-4bd3-9206-56c78f7068e0',
        locale: 'en',
        title: 'DMC services for partners',
        subtitle: 'Custom itineraries, ground operations and MICE support.',
        buttonLabel: 'All services',
        altText: 'Banner for DMC services',
      },
      {
        homeBannerId: 'f52072ca-8024-4bd3-9206-56c78f7068e0',
        locale: 'uz',
        title: 'Hamkorlar uchun DMC xizmatlari',
        subtitle: 'Moslashtirilgan marshrutlar, yerusti xizmatlar va MICE.',
        buttonLabel: 'Barcha xizmatlar',
        altText: 'DMC xizmatlari banneri',
      },
    ],
  });

  const service = await prisma.service.create({
    data: {
      slug: 'customized-itineraries',
      heroImage: '/assets/icons/card-news2.jpg',
      previewImage: '/assets/icons/card-news2.jpg',
      sortOrder: 1,
      isFeatured: true,
      leadFormEnabled: true,
      status: 'PUBLISHED',
      translations: {
        create: [
          {
            locale: 'ru',
            name: 'Индивидуальные маршруты',
            title: 'Customized itineraries',
            subtitle: 'Индивидуальные leisure, group и special-interest программы.',
            shortDescription: 'Гибкая разработка туров под рынок и партнера.',
            content: [
              'Подбор маршрута под длительность, бюджет и сезон.',
              'Гибкая адаптация под B2B и B2C сценарии.',
            ] as Prisma.InputJsonValue,
          },
          {
            locale: 'en',
            name: 'Customized Itineraries',
            title: 'Customized Itineraries',
            subtitle: 'Tailor-made leisure, group and special-interest programs.',
            shortDescription: 'Flexible route design for each market and partner.',
            content: [
              'Route planning based on duration, budget and season.',
              'Flexible setup for B2B and B2C flows.',
            ] as Prisma.InputJsonValue,
          },
          {
            locale: 'uz',
            name: 'Moslashtirilgan marshrutlar',
            title: 'Customized Itineraries',
            subtitle: 'Leisure, group va maxsus qiziqishlar uchun moslashtirilgan dasturlar.',
            shortDescription: 'Har bir bozor va hamkor uchun moslashuvchan yo‘nalish tuziladi.',
            content: [
              'Davomiylik, byudjet va mavsum bo‘yicha marshrut tuziladi.',
              'B2B va B2C oqimlari uchun moslashuvchan yechim.',
            ] as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  const news = await prisma.news.create({
    data: {
      slug: 'maldives-launch',
      heroImage: '/assets/icons/news-detail.jpg',
      previewImage: '/assets/icons/news1.jpg',
      publishedAt: new Date('2026-05-20T09:00:00.000Z'),
      status: 'PUBLISHED',
      syncToB2B: true,
      syncToB2C: true,
      translations: {
        create: [
          {
            locale: 'ru',
            title: 'Полетная программа на Мальдивы с 30 ноября',
            excerpt: 'Centrum Air и Centrum Holidays запускают новое направление.',
            content: [
              'Прямые и стыковочные перелеты на Мальдивы.',
              'Пакеты с подобранными отелями и наземным обслуживанием.',
            ] as Prisma.InputJsonValue,
          },
          {
            locale: 'en',
            title: 'Flying to the Maldives from November 30',
            excerpt: 'Centrum Air and Centrum Holidays launch a new destination.',
            content: [
              'Direct and connecting flights to the Maldives.',
              'Curated hotel packages and ground handling.',
            ] as Prisma.InputJsonValue,
          },
          {
            locale: 'uz',
            title: '30 noyabrdan Maldiv orollariga parvozlar',
            excerpt: 'Centrum Air va Centrum Holidays yangi yo‘nalishni ishga tushiradi.',
            content: [
              'Maldiv orollariga to‘g‘ridan-to‘g‘ri va tutash reyslar.',
              'Tanlangan mehmonxonalar va yerusti xizmatlari bilan paketlar.',
            ] as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  const whyCategory = await prisma.whyCategory.create({
    data: {
      slug: 'destination-expertise',
      sortOrder: 1,
      status: 'PUBLISHED',
      heroImage: '/assets/icons/dmc.png',
      translations: {
        create: [
          {
            locale: 'ru',
            title: 'Экспертиза направления',
            subtitle: 'Destination expertise',
            description: 'Глубокое знание Узбекистана и Центральной Азии.',
          },
          {
            locale: 'en',
            title: 'Destination Expertise',
            subtitle: 'Destination expertise',
            description: 'Deep knowledge of Uzbekistan and Central Asia.',
          },
          {
            locale: 'uz',
            title: 'Yo‘nalish ekspertizasi',
            subtitle: 'Destination expertise',
            description: 'O‘zbekiston va Markaziy Osiyo bo‘yicha chuqur bilim.',
          },
        ],
      },
    },
  });

  await prisma.whyFact.createMany({
    data: [
      {
        id: '81a6fa2a-5f4a-4f94-87ea-9ed9942c3011',
        whyCategoryId: whyCategory.id,
        sortOrder: 1,
        imageUrl: '/assets/icons/dmc1.png',
        status: 'PUBLISHED',
      },
      {
        id: '09d74e2f-f3db-4b92-a8c2-8d5f61d3d35d',
        whyCategoryId: whyCategory.id,
        sortOrder: 2,
        imageUrl: '/assets/icons/dmc2.jpg',
        status: 'PUBLISHED',
      },
    ],
  });

  await prisma.whyFactTranslation.createMany({
    data: [
      {
        whyFactId: '81a6fa2a-5f4a-4f94-87ea-9ed9942c3011',
        locale: 'ru',
        title: 'Глубокое локальное знание',
        subtitle: '01',
        description: 'Команда знает маршруты, города и поставщиков на уровне операционного дизайна.',
      },
      {
        whyFactId: '81a6fa2a-5f4a-4f94-87ea-9ed9942c3011',
        locale: 'en',
        title: 'Deep local knowledge',
        subtitle: '01',
        description: 'The team knows routes, cities and suppliers at an operational level.',
      },
      {
        whyFactId: '81a6fa2a-5f4a-4f94-87ea-9ed9942c3011',
        locale: 'uz',
        title: 'Chuqur mahalliy bilim',
        subtitle: '01',
        description: 'Jamoa marshrutlar, shaharlar va yetkazib beruvchilarni operatsion darajada biladi.',
      },
      {
        whyFactId: '09d74e2f-f3db-4b92-a8c2-8d5f61d3d35d',
        locale: 'ru',
        title: 'Региональная координация',
        subtitle: '02',
        description: 'Можно собирать multi-country программы по Центральной Азии и Кавказу.',
      },
      {
        whyFactId: '09d74e2f-f3db-4b92-a8c2-8d5f61d3d35d',
        locale: 'en',
        title: 'Regional coordination',
        subtitle: '02',
        description: 'Multi-country programs across Central Asia and the Caucasus can be coordinated smoothly.',
      },
      {
        whyFactId: '09d74e2f-f3db-4b92-a8c2-8d5f61d3d35d',
        locale: 'uz',
        title: 'Mintaqaviy muvofiqlashtirish',
        subtitle: '02',
        description: 'Markaziy Osiyo va Kavkaz bo‘ylab multi-country dasturlar silliq boshqariladi.',
      },
    ],
  });

  const createTourWithContent = async (input: {
    countryId: string;
    slug: string;
    type: 'SHORT' | 'ONE_DAY' | 'MULTI_DAY';
    season:
      | 'ALL_YEAR'
      | 'SPRING'
      | 'SUMMER'
      | 'AUTUMN'
      | 'WINTER';
    heroImage: string;
    mainImage: string;
    routeMapImage: string;
    durationDays: number;
    durationNights: number;
    minGroupSize: number;
    maxGroupSize: number;
    comfortLevel: number;
    priceFrom: string;
    currency: string;
    isFeatured?: boolean;
    showPriceToB2C?: boolean;
    translations: Array<{
      locale: 'ru' | 'en' | 'uz';
      title: string;
      subtitle: string;
      route: string;
      description: string;
      hotelsInfo: string;
      transportInfo: string;
      countriesInfo: string;
      included: string[];
      excluded: string[];
    }>;
    days: Array<{
      dayNumber: number;
      overnightAt: string;
      image: string;
      translations: Array<{
        locale: 'ru' | 'en' | 'uz';
        title: string;
        shortTitle: string;
        description: string;
        inclusions: string[];
      }>;
    }>;
    images: Array<{
      imageUrl: string;
      sortOrder: number;
      isCover: boolean;
      translations: Array<{
        locale: 'ru' | 'en' | 'uz';
        altText: string;
        caption: string;
      }>;
    }>;
  }) => {
    const createdTour = await prisma.tour.create({
      data: {
        countryId: input.countryId,
        slug: input.slug,
        type: input.type,
        season: input.season,
        heroImage: input.heroImage,
        mainImage: input.mainImage,
        routeMapImage: input.routeMapImage,
        durationDays: input.durationDays,
        durationNights: input.durationNights,
        minGroupSize: input.minGroupSize,
        maxGroupSize: input.maxGroupSize,
        comfortLevel: input.comfortLevel,
        priceFrom: new Prisma.Decimal(input.priceFrom),
        currency: input.currency,
        isFeatured: input.isFeatured ?? false,
        showPriceToB2C: input.showPriceToB2C ?? false,
        status: 'PUBLISHED',
        translations: {
          create: input.translations.map((translation) => ({
            ...translation,
            included: translation.included as Prisma.InputJsonValue,
            excluded: translation.excluded as Prisma.InputJsonValue,
          })),
        },
      },
    });

    for (const day of input.days) {
      await prisma.tourDay.create({
        data: {
          tourId: createdTour.id,
          dayNumber: day.dayNumber,
          overnightAt: day.overnightAt,
          image: day.image,
          translations: {
            create: day.translations.map((translation) => ({
              ...translation,
              inclusions: translation.inclusions as Prisma.InputJsonValue,
            })),
          },
        },
      });
    }

    for (const image of input.images) {
      await prisma.tourImage.create({
        data: {
          tourId: createdTour.id,
          imageUrl: image.imageUrl,
          sortOrder: image.sortOrder,
          isCover: image.isCover,
          translations: {
            create: image.translations,
          },
        },
      });
    }

    return createdTour;
  };

  const tour = await prisma.tour.create({
    data: {
      countryId: uzbekistan.id,
      slug: 'weekend-in-uzbekistan',
      type: 'SHORT',
      season: 'ALL_YEAR',
      heroImage: '/assets/icons/tours.png',
      mainImage: '/assets/icons/card1.png',
      routeMapImage: '/assets/icons/map.png',
      durationDays: 3,
      durationNights: 2,
      minGroupSize: 2,
      maxGroupSize: 16,
      comfortLevel: 4,
      priceFrom: new Prisma.Decimal('295.00'),
      currency: 'USD',
      isFeatured: true,
      showPriceToB2C: false,
      status: 'PUBLISHED',
      translations: {
        create: [
          {
            locale: 'ru',
            title: 'Тур "Выходные в Узбекистане"',
            subtitle: '3 дня / 2 ночи',
            route: 'Ташкент - Самарканд',
            description: 'Короткий маршрут для знакомства с культурой и архитектурой Узбекистана.',
            hotelsInfo: 'Размещение в отелях 3-4 звезды.',
            transportInfo: 'Скоростной поезд и комфортабельный трансфер.',
            countriesInfo: 'Узбекистан как стартовая точка маршрута по Центральной Азии.',
            included: ['Проживание', 'Завтраки', 'Трансфер'] as Prisma.InputJsonValue,
            excluded: ['Авиабилеты', 'Личные расходы'] as Prisma.InputJsonValue,
          },
          {
            locale: 'en',
            title: 'Weekend in Uzbekistan',
            subtitle: '3 days / 2 nights',
            route: 'Tashkent - Samarkand',
            description: 'A short itinerary to discover the culture and architecture of Uzbekistan.',
            hotelsInfo: 'Accommodation in 3-4 star hotels.',
            transportInfo: 'High-speed train and comfortable transfers.',
            countriesInfo: 'Uzbekistan as a gateway to Central Asia.',
            included: ['Accommodation', 'Breakfasts', 'Transfers'] as Prisma.InputJsonValue,
            excluded: ['Flights', 'Personal expenses'] as Prisma.InputJsonValue,
          },
          {
            locale: 'uz',
            title: 'O‘zbekistonda dam olish kunlari',
            subtitle: '3 kun / 2 tun',
            route: 'Toshkent - Samarqand',
            description: 'O‘zbekiston madaniyati va me’morchiligi bilan tanishish uchun qisqa marshrut.',
            hotelsInfo: '3-4 yulduzli mehmonxonalarda joylashuv.',
            transportInfo: 'Yuqori tezlikdagi poyezd va qulay transferlar.',
            countriesInfo: 'Markaziy Osiyoga kirish nuqtasi sifatida O‘zbekiston.',
            included: ['Yashash', 'Nonushta', 'Transfer'] as Prisma.InputJsonValue,
            excluded: ['Aviachiptalar', 'Shaxsiy xarajatlar'] as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  const tourDay1 = await prisma.tourDay.create({
    data: {
      tourId: tour.id,
      dayNumber: 1,
      overnightAt: 'Tashkent',
      image: '/assets/icons/card2.png',
      translations: {
        create: [
          {
            locale: 'ru',
            title: '1 день - Прибытие в Ташкент',
            shortTitle: 'Прибытие',
            description: 'Встреча в аэропорту, трансфер и вечерняя прогулка.',
            inclusions: ['Трансфер', 'Гид'] as Prisma.InputJsonValue,
          },
          {
            locale: 'en',
            title: 'Day 1 - Arrival to Tashkent',
            shortTitle: 'Arrival',
            description: 'Airport meet and greet, transfer and evening walk.',
            inclusions: ['Transfer', 'Guide'] as Prisma.InputJsonValue,
          },
          {
            locale: 'uz',
            title: '1-kun - Toshkentga yetib kelish',
            shortTitle: 'Yetib kelish',
            description: 'Aeroportda kutib olish, transfer va kechki sayr.',
            inclusions: ['Transfer', 'Gid'] as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  await prisma.tourDay.create({
    data: {
      tourId: tour.id,
      dayNumber: 2,
      overnightAt: 'Samarkand',
      image: '/assets/icons/card3.png',
      translations: {
        create: [
          {
            locale: 'ru',
            title: '2 день - Самарканд',
            shortTitle: 'Самарканд',
            description: 'Переезд на поезде и экскурсия по Регистану.',
            inclusions: ['Поезд', 'Экскурсия'] as Prisma.InputJsonValue,
          },
          {
            locale: 'en',
            title: 'Day 2 - Samarkand',
            shortTitle: 'Samarkand',
            description: 'Train transfer and a Registan city tour.',
            inclusions: ['Train', 'City tour'] as Prisma.InputJsonValue,
          },
          {
            locale: 'uz',
            title: '2-kun - Samarqand',
            shortTitle: 'Samarqand',
            description: 'Poyezdda ko‘chish va Registon bo‘ylab ekskursiya.',
            inclusions: ['Poyezd', 'Ekskursiya'] as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  const tourImage = await prisma.tourImage.create({
    data: {
      tourId: tour.id,
      imageUrl: '/assets/icons/card1.png',
      sortOrder: 1,
      isCover: true,
      translations: {
        create: [
          {
            locale: 'ru',
            altText: 'Главное фото тура по Узбекистану',
            caption: 'Панорамный вид на Самарканд',
          },
          {
            locale: 'en',
            altText: 'Main image of the Uzbekistan tour',
            caption: 'Panoramic view of Samarkand',
          },
          {
            locale: 'uz',
            altText: 'O‘zbekiston bo‘ylab turning asosiy rasmi',
            caption: 'Samarqandning panoramik ko‘rinishi',
          },
        ],
      },
    },
  });

  await createTourWithContent({
    countryId: uzbekistan.id,
    slug: 'samarkand-bukhara-escape',
    type: 'SHORT',
    season: 'SPRING',
    heroImage: '/assets/icons/tours.png',
    mainImage: '/assets/icons/card2.png',
    routeMapImage: '/assets/icons/map.png',
    durationDays: 4,
    durationNights: 3,
    minGroupSize: 2,
    maxGroupSize: 12,
    comfortLevel: 4,
    priceFrom: '420.00',
    currency: 'USD',
    isFeatured: true,
    translations: [
      {
        locale: 'ru',
        title: 'Самарканд и Бухара',
        subtitle: '4 дня / 3 ночи',
        route: 'Самарканд - Бухара',
        description: 'Классический маршрут по двум ключевым городам Шелкового пути с акцентом на архитектуру и вечерние прогулки.',
        hotelsInfo: 'Бутик-отели 4 звезды в исторических центрах.',
        transportInfo: 'Скоростной поезд и индивидуальные трансферы.',
        countriesInfo: 'Узбекистан.',
        included: ['Проживание', 'Завтраки', 'Билеты на поезд', 'Гид'],
        excluded: ['Международный перелет', 'Обеды и ужины'],
      },
      {
        locale: 'en',
        title: 'Samarkand and Bukhara Escape',
        subtitle: '4 days / 3 nights',
        route: 'Samarkand - Bukhara',
        description: 'A classic Silk Road route across two iconic cities with a focus on architecture and atmospheric evening walks.',
        hotelsInfo: '4-star boutique hotels in the historic centers.',
        transportInfo: 'High-speed train and private transfers.',
        countriesInfo: 'Uzbekistan.',
        included: ['Accommodation', 'Breakfasts', 'Train tickets', 'Guide'],
        excluded: ['International flights', 'Lunches and dinners'],
      },
      {
        locale: 'uz',
        title: 'Samarqand va Buxoro safari',
        subtitle: '4 kun / 3 tun',
        route: 'Samarqand - Buxoro',
        description: 'Ipak yo‘lining ikki mashhur shahri bo‘ylab me’morchilik va kechki sayrларга urg‘u berilgan klassik marshrut.',
        hotelsInfo: 'Tarixiy markazlardagi 4 yulduzli butik mehmonxonalar.',
        transportInfo: 'Yuqori tezlikdagi poyezd va individual transferlar.',
        countriesInfo: 'O‘zbekiston.',
        included: ['Yashash', 'Nonushta', 'Poyezd chiptalari', 'Gid'],
        excluded: ['Xalqaro parvoz', 'Tushlik va kechki ovqatlar'],
      },
    ],
    days: [
      {
        dayNumber: 1,
        overnightAt: 'Samarkand',
        image: '/assets/icons/card2.png',
        translations: [
          { locale: 'ru', title: '1 день - Самарканд и площадь Регистан', shortTitle: 'Регистан', description: 'Прибытие, заселение и первое знакомство с вечерним Самаркандом.', inclusions: ['Трансфер', 'Гид'] },
          { locale: 'en', title: 'Day 1 - Samarkand and Registan Square', shortTitle: 'Registan', description: 'Arrival, hotel check-in and first impressions of Samarkand by night.', inclusions: ['Transfer', 'Guide'] },
          { locale: 'uz', title: '1-kun - Samarqand va Registon maydoni', shortTitle: 'Registon', description: 'Yetib kelish, joylashish va kechki Samarqand bilan tanishuv.', inclusions: ['Transfer', 'Gid'] },
        ],
      },
      {
        dayNumber: 2,
        overnightAt: 'Samarkand',
        image: '/assets/icons/card3.png',
        translations: [
          { locale: 'ru', title: '2 день - Гур-Эмир и Шахи-Зинда', shortTitle: 'Мавзолеи', description: 'Полный день экскурсий по ансамблям Тимуридской эпохи.', inclusions: ['Гид', 'Входные билеты'] },
          { locale: 'en', title: 'Day 2 - Gur-Emir and Shah-i-Zinda', shortTitle: 'Mausoleums', description: 'A full day dedicated to Timurid heritage landmarks.', inclusions: ['Guide', 'Entrance tickets'] },
          { locale: 'uz', title: '2-kun - Go‘ri Amir va Shohi Zinda', shortTitle: 'Maqbaralar', description: 'Temuriylar davri yodgorliklariga bag‘ishlangan to‘liq ekskursiya kuni.', inclusions: ['Gid', 'Kirish chiptalari'] },
        ],
      },
      {
        dayNumber: 3,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card4.png',
        translations: [
          { locale: 'ru', title: '3 день - Переезд в Бухару', shortTitle: 'Бухара', description: 'Утренний поезд и прогулка по старому городу Бухары.', inclusions: ['Поезд', 'Трансфер'] },
          { locale: 'en', title: 'Day 3 - Transfer to Bukhara', shortTitle: 'Bukhara', description: 'Morning train and an introductory walk in old Bukhara.', inclusions: ['Train', 'Transfer'] },
          { locale: 'uz', title: '3-kun - Buxoroga yo‘l', shortTitle: 'Buxoro', description: 'Ertalabki poyezd va Buxoro eski shahri bo‘ylab sayr.', inclusions: ['Poyezd', 'Transfer'] },
        ],
      },
      {
        dayNumber: 4,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card5.png',
        translations: [
          { locale: 'ru', title: '4 день - Ляби-Хауз и вылет', shortTitle: 'Финал', description: 'Последние покупки, прогулка по Ляби-Хаузу и трансфер в аэропорт.', inclusions: ['Трансфер'] },
          { locale: 'en', title: 'Day 4 - Lyabi-Hauz and departure', shortTitle: 'Departure', description: 'Final shopping, a walk around Lyabi-Hauz and airport transfer.', inclusions: ['Transfer'] },
          { locale: 'uz', title: '4-kun - Lyabi Hovuz va jo‘nab ketish', shortTitle: 'Jo‘nab ketish', description: 'So‘nggi xaridlar, Lyabi Hovuz bo‘ylab sayr va aeroportga transfer.', inclusions: ['Transfer'] },
        ],
      },
    ],
    images: [
      {
        imageUrl: '/assets/icons/card2.png',
        sortOrder: 1,
        isCover: true,
        translations: [
          { locale: 'ru', altText: 'Самарканд и Бухара', caption: 'Регистан на закате' },
          { locale: 'en', altText: 'Samarkand and Bukhara', caption: 'Registan at sunset' },
          { locale: 'uz', altText: 'Samarqand va Buxoro', caption: 'Quyosh botishida Registon' },
        ],
      },
      {
        imageUrl: '/assets/icons/card4.png',
        sortOrder: 2,
        isCover: false,
        translations: [
          { locale: 'ru', altText: 'Бухара', caption: 'Исторический центр Бухары' },
          { locale: 'en', altText: 'Bukhara', caption: 'Historic center of Bukhara' },
          { locale: 'uz', altText: 'Buxoro', caption: 'Buxoroning tarixiy markazi' },
        ],
      },
    ],
  });

  await createTourWithContent({
    countryId: uzbekistan.id,
    slug: 'uzbekistan-gastro-journey',
    type: 'MULTI_DAY',
    season: 'AUTUMN',
    heroImage: '/assets/icons/tours.png',
    mainImage: '/assets/icons/card3.png',
    routeMapImage: '/assets/icons/map.png',
    durationDays: 6,
    durationNights: 5,
    minGroupSize: 2,
    maxGroupSize: 10,
    comfortLevel: 5,
    priceFrom: '890.00',
    currency: 'USD',
    translations: [
      {
        locale: 'ru',
        title: 'Гастрономическое путешествие по Узбекистану',
        subtitle: '6 дней / 5 ночей',
        route: 'Ташкент - Самарканд - Бухара',
        description: 'Маршрут для тех, кто хочет увидеть страну через локальные вкусы, рынки, плов-центры и мастер-классы.',
        hotelsInfo: 'Отели 4-5 звезд и авторские бутик-объекты.',
        transportInfo: 'Поезда Afrosiyob, трансферы и кулинарные остановки.',
        countriesInfo: 'Узбекистан.',
        included: ['Проживание', 'Завтраки', '2 ужина', 'Мастер-класс по плову', 'Гид'],
        excluded: ['Авиабилеты', 'Алкоголь', 'Личные расходы'],
      },
      {
        locale: 'en',
        title: 'Uzbekistan Gastro Journey',
        subtitle: '6 days / 5 nights',
        route: 'Tashkent - Samarkand - Bukhara',
        description: 'A route for travelers who want to discover the country through local flavors, bazaars, plov centers and cooking workshops.',
        hotelsInfo: '4-5 star hotels and curated boutique stays.',
        transportInfo: 'Afrosiyob trains, transfers and culinary stops.',
        countriesInfo: 'Uzbekistan.',
        included: ['Accommodation', 'Breakfasts', '2 dinners', 'Plov masterclass', 'Guide'],
        excluded: ['Flights', 'Alcohol', 'Personal expenses'],
      },
      {
        locale: 'uz',
        title: 'O‘zbekiston gastro sayohati',
        subtitle: '6 kun / 5 tun',
        route: 'Toshkent - Samarqand - Buxoro',
        description: 'Mamlakatni mahalliy ta’mlar, bozorlar, osh markazlari va master-klasslar orqali kashf etishni istaganlar uchun marshrut.',
        hotelsInfo: '4-5 yulduzli mehmonxonalar va tanlangan butik joylashuvlar.',
        transportInfo: 'Afrosiyob poyezdlari, transferlar va gastronomik to‘xtashlar.',
        countriesInfo: 'O‘zbekiston.',
        included: ['Yashash', 'Nonushta', '2 kechki ovqat', 'Osh master-klassi', 'Gid'],
        excluded: ['Aviachiptalar', 'Alkogol', 'Shaxsiy xarajatlar'],
      },
    ],
    days: [
      {
        dayNumber: 1,
        overnightAt: 'Tashkent',
        image: '/assets/icons/card1.png',
        translations: [
          { locale: 'ru', title: '1 день - Старый Ташкент и чайхана', shortTitle: 'Ташкент', description: 'Старый город, базар Чорсу и ужин в традиционной чайхане.', inclusions: ['Гид', 'Ужин'] },
          { locale: 'en', title: 'Day 1 - Old Tashkent and teahouse dinner', shortTitle: 'Tashkent', description: 'Old city walk, Chorsu Bazaar and a welcome dinner in a traditional teahouse.', inclusions: ['Guide', 'Dinner'] },
          { locale: 'uz', title: '1-kun - Eski Toshkent va choyxona', shortTitle: 'Toshkent', description: 'Eski shahar, Chorsu bozori va an’anaviy choyxonada kechki ovqat.', inclusions: ['Gid', 'Kechki ovqat'] },
        ],
      },
      {
        dayNumber: 2,
        overnightAt: 'Samarkand',
        image: '/assets/icons/card3.png',
        translations: [
          { locale: 'ru', title: '2 день - Переезд и дегустации в Самарканде', shortTitle: 'Дегустации', description: 'Переезд на Afrosiyob и гастрономическая прогулка по Самарканду.', inclusions: ['Поезд', 'Дегустации'] },
          { locale: 'en', title: 'Day 2 - Transfer and tastings in Samarkand', shortTitle: 'Tastings', description: 'Afrosiyob transfer and an evening food walk in Samarkand.', inclusions: ['Train', 'Tastings'] },
          { locale: 'uz', title: '2-kun - Samarqandda yo‘l va degustatsiyalar', shortTitle: 'Degustatsiya', description: 'Afrosiyob orqali yo‘l va Samarqand bo‘ylab gastronomik sayr.', inclusions: ['Poyezd', 'Degustatsiyalar'] },
        ],
      },
      {
        dayNumber: 3,
        overnightAt: 'Samarkand',
        image: '/assets/icons/card2.png',
        translations: [
          { locale: 'ru', title: '3 день - Мастер-класс по плову', shortTitle: 'Плов', description: 'Посещение локального дома и совместное приготовление плова.', inclusions: ['Мастер-класс', 'Обед'] },
          { locale: 'en', title: 'Day 3 - Plov cooking workshop', shortTitle: 'Plov', description: 'Visit to a local home and shared plov cooking session.', inclusions: ['Workshop', 'Lunch'] },
          { locale: 'uz', title: '3-kun - Osh tayyorlash master-klassi', shortTitle: 'Osh', description: 'Mahalliy uyga tashrif va birgalikda osh tayyorlash.', inclusions: ['Master-klass', 'Tushlik'] },
        ],
      },
      {
        dayNumber: 4,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card4.png',
        translations: [
          { locale: 'ru', title: '4 день - Бухара и рынки специй', shortTitle: 'Бухара', description: 'Переезд и знакомство с торговыми куполами Бухары.', inclusions: ['Поезд', 'Гид'] },
          { locale: 'en', title: 'Day 4 - Bukhara and spice markets', shortTitle: 'Bukhara', description: 'Transfer and introduction to Bukhara’s trading domes.', inclusions: ['Train', 'Guide'] },
          { locale: 'uz', title: '4-kun - Buxoro va ziravor bozorlari', shortTitle: 'Buxoro', description: 'Yo‘l va Buxoroning savdo gumbazlari bilan tanishuv.', inclusions: ['Poyezd', 'Gid'] },
        ],
      },
      {
        dayNumber: 5,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card5.png',
        translations: [
          { locale: 'ru', title: '5 день - Медресе и авторский ужин', shortTitle: 'Ужин', description: 'Экскурсия по старому городу и финальный ужин в атмосферном ресторане.', inclusions: ['Гид', 'Ужин'] },
          { locale: 'en', title: 'Day 5 - Madrasas and signature dinner', shortTitle: 'Dinner', description: 'Old town touring and a farewell dinner in an atmospheric restaurant.', inclusions: ['Guide', 'Dinner'] },
          { locale: 'uz', title: '5-kun - Madrasa va mualliflik kechki ovqati', shortTitle: 'Kechki ovqat', description: 'Eski shahar bo‘ylab ekskursiya va yakuniy kechki ovqat.', inclusions: ['Gid', 'Kechki ovqat'] },
        ],
      },
      {
        dayNumber: 6,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card1.png',
        translations: [
          { locale: 'ru', title: '6 день - Вылет', shortTitle: 'Вылет', description: 'Свободное время и трансфер к вылету.', inclusions: ['Трансфер'] },
          { locale: 'en', title: 'Day 6 - Departure', shortTitle: 'Departure', description: 'Free time and transfer for departure.', inclusions: ['Transfer'] },
          { locale: 'uz', title: '6-kun - Jo‘nab ketish', shortTitle: 'Jo‘nab ketish', description: 'Bo‘sh vaqt va jo‘nab ketish uchun transfer.', inclusions: ['Transfer'] },
        ],
      },
    ],
    images: [
      {
        imageUrl: '/assets/icons/card3.png',
        sortOrder: 1,
        isCover: true,
        translations: [
          { locale: 'ru', altText: 'Гастротур по Узбекистану', caption: 'Традиционные вкусы и маршруты' },
          { locale: 'en', altText: 'Uzbekistan gastro tour', caption: 'Traditional flavors and routes' },
          { locale: 'uz', altText: 'O‘zbekiston gastro turi', caption: 'An’anaviy ta’mlar va marshrutlar' },
        ],
      },
    ],
  });

  await createTourWithContent({
    countryId: uzbekistan.id,
    slug: 'silk-road-grand-tour',
    type: 'MULTI_DAY',
    season: 'ALL_YEAR',
    heroImage: '/assets/icons/tours.png',
    mainImage: '/assets/icons/card5.png',
    routeMapImage: '/assets/icons/map.png',
    durationDays: 8,
    durationNights: 7,
    minGroupSize: 2,
    maxGroupSize: 18,
    comfortLevel: 5,
    priceFrom: '1490.00',
    currency: 'USD',
    isFeatured: true,
    translations: [
      {
        locale: 'ru',
        title: 'Большой тур по Великому шелковому пути',
        subtitle: '8 дней / 7 ночей',
        route: 'Ташкент - Самарканд - Бухара - Хива',
        description: 'Полный маршрут по главным культурным столицам Узбекистана для первого знакомства со страной.',
        hotelsInfo: 'Комбинация отелей 4-5 звезд.',
        transportInfo: 'Afrosiyob, внутренний перелет и наземные трансферы.',
        countriesInfo: 'Узбекистан.',
        included: ['Проживание', 'Завтраки', 'Гид', 'Переезды по программе'],
        excluded: ['Международный перелет', 'Страховка'],
      },
      {
        locale: 'en',
        title: 'Silk Road Grand Tour',
        subtitle: '8 days / 7 nights',
        route: 'Tashkent - Samarkand - Bukhara - Khiva',
        description: 'A complete route across Uzbekistan’s cultural capitals for a strong first-time introduction to the destination.',
        hotelsInfo: 'A combination of 4-5 star hotels.',
        transportInfo: 'Afrosiyob, domestic flight and ground transfers.',
        countriesInfo: 'Uzbekistan.',
        included: ['Accommodation', 'Breakfasts', 'Guide', 'Program transfers'],
        excluded: ['International flights', 'Insurance'],
      },
      {
        locale: 'uz',
        title: 'Buyuk Ipak yo‘li katta turi',
        subtitle: '8 kun / 7 tun',
        route: 'Toshkent - Samarqand - Buxoro - Xiva',
        description: 'Mamlakat bilan ilk kuchli tanishuv uchun O‘zbekistonning asosiy madaniy shaharlari bo‘ylab to‘liq marshrut.',
        hotelsInfo: '4-5 yulduzli mehmonxonalar kombinatsiyasi.',
        transportInfo: 'Afrosiyob, ichki parvoz va yer usti transferlari.',
        countriesInfo: 'O‘zbekiston.',
        included: ['Yashash', 'Nonushta', 'Gid', 'Dastur bo‘yicha transferlar'],
        excluded: ['Xalqaro parvozlar', 'Sug‘urta'],
      },
    ],
    days: [
      {
        dayNumber: 1,
        overnightAt: 'Tashkent',
        image: '/assets/icons/card1.png',
        translations: [
          { locale: 'ru', title: '1 день - Прибытие в Ташкент', shortTitle: 'Ташкент', description: 'Заселение и обзорная прогулка по столице.', inclusions: ['Трансфер', 'Гид'] },
          { locale: 'en', title: 'Day 1 - Arrival in Tashkent', shortTitle: 'Tashkent', description: 'Hotel check-in and city orientation in the capital.', inclusions: ['Transfer', 'Guide'] },
          { locale: 'uz', title: '1-kun - Toshkentga yetib kelish', shortTitle: 'Toshkent', description: 'Joylashish va poytaxt bo‘ylab tanishuv sayri.', inclusions: ['Transfer', 'Gid'] },
        ],
      },
      {
        dayNumber: 2,
        overnightAt: 'Samarkand',
        image: '/assets/icons/card2.png',
        translations: [
          { locale: 'ru', title: '2 день - Самарканд', shortTitle: 'Самарканд', description: 'Переезд и первая экскурсия по Самарканду.', inclusions: ['Поезд', 'Гид'] },
          { locale: 'en', title: 'Day 2 - Samarkand', shortTitle: 'Samarkand', description: 'Transfer and first guided exploration of Samarkand.', inclusions: ['Train', 'Guide'] },
          { locale: 'uz', title: '2-kun - Samarqand', shortTitle: 'Samarqand', description: 'Yo‘l va Samarqand bo‘ylab ilk ekskursiya.', inclusions: ['Poyezd', 'Gid'] },
        ],
      },
      {
        dayNumber: 3,
        overnightAt: 'Samarkand',
        image: '/assets/icons/card3.png',
        translations: [
          { locale: 'ru', title: '3 день - Наследие Тимуридов', shortTitle: 'Наследие', description: 'Полный день по мавзолеям и ансамблям Самарканда.', inclusions: ['Гид', 'Билеты'] },
          { locale: 'en', title: 'Day 3 - Timurid heritage', shortTitle: 'Heritage', description: 'A full day among Samarkand’s mausoleums and ensembles.', inclusions: ['Guide', 'Tickets'] },
          { locale: 'uz', title: '3-kun - Temuriylar merosi', shortTitle: 'Meros', description: 'Samarqand maqbaralari va ansambllari bo‘ylab to‘liq kun.', inclusions: ['Gid', 'Chiptalar'] },
        ],
      },
      {
        dayNumber: 4,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card4.png',
        translations: [
          { locale: 'ru', title: '4 день - Бухара', shortTitle: 'Бухара', description: 'Переезд и прогулка по Ляби-Хаузу.', inclusions: ['Поезд', 'Трансфер'] },
          { locale: 'en', title: 'Day 4 - Bukhara', shortTitle: 'Bukhara', description: 'Transfer and evening around Lyabi-Hauz.', inclusions: ['Train', 'Transfer'] },
          { locale: 'uz', title: '4-kun - Buxoro', shortTitle: 'Buxoro', description: 'Yo‘l va Lyabi Hovuz atrofida kechki sayr.', inclusions: ['Poyezd', 'Transfer'] },
        ],
      },
      {
        dayNumber: 5,
        overnightAt: 'Bukhara',
        image: '/assets/icons/card5.png',
        translations: [
          { locale: 'ru', title: '5 день - Старый город Бухары', shortTitle: 'Старый город', description: 'Архитектурные памятники, медресе и торговые купола.', inclusions: ['Гид', 'Билеты'] },
          { locale: 'en', title: 'Day 5 - Old Bukhara', shortTitle: 'Old town', description: 'Architecture, madrasas and the trading domes of Bukhara.', inclusions: ['Guide', 'Tickets'] },
          { locale: 'uz', title: '5-kun - Qadimiy Buxoro', shortTitle: 'Eski shahar', description: 'Me’moriy yodgorliklar, madrasalar va savdo gumbazlari.', inclusions: ['Gid', 'Chiptalar'] },
        ],
      },
      {
        dayNumber: 6,
        overnightAt: 'Khiva',
        image: '/assets/icons/card2.png',
        translations: [
          { locale: 'ru', title: '6 день - Перелет в Ургенч и Хива', shortTitle: 'Хива', description: 'Внутренний перелет и размещение внутри Ичан-Калы.', inclusions: ['Перелет', 'Трансфер'] },
          { locale: 'en', title: 'Day 6 - Flight to Urgench and Khiva', shortTitle: 'Khiva', description: 'Domestic flight and accommodation inside Itchan Kala.', inclusions: ['Flight', 'Transfer'] },
          { locale: 'uz', title: '6-kun - Urganchga parvoz va Xiva', shortTitle: 'Xiva', description: 'Ichki parvoz va Ichan-Qal’a ichida joylashish.', inclusions: ['Parvoz', 'Transfer'] },
        ],
      },
      {
        dayNumber: 7,
        overnightAt: 'Khiva',
        image: '/assets/icons/card3.png',
        translations: [
          { locale: 'ru', title: '7 день - Ичан-Кала', shortTitle: 'Ичан-Кала', description: 'Полный день экскурсий по музею под открытым небом.', inclusions: ['Гид', 'Билеты'] },
          { locale: 'en', title: 'Day 7 - Itchan Kala', shortTitle: 'Itchan Kala', description: 'A full day exploring the open-air museum of Khiva.', inclusions: ['Guide', 'Tickets'] },
          { locale: 'uz', title: '7-kun - Ichan-Qal’a', shortTitle: 'Ichan-Qal’a', description: 'Ochiq osmon ostidagi muzey bo‘ylab to‘liq kunlik ekskursiya.', inclusions: ['Gid', 'Chiptalar'] },
        ],
      },
      {
        dayNumber: 8,
        overnightAt: 'Khiva',
        image: '/assets/icons/card1.png',
        translations: [
          { locale: 'ru', title: '8 день - Завершение маршрута', shortTitle: 'Финал', description: 'Трансфер и завершение программы.', inclusions: ['Трансфер'] },
          { locale: 'en', title: 'Day 8 - End of the route', shortTitle: 'Finish', description: 'Transfer and end of the program.', inclusions: ['Transfer'] },
          { locale: 'uz', title: '8-kun - Marshrut yakuni', shortTitle: 'Yakun', description: 'Transfer va dastur yakuni.', inclusions: ['Transfer'] },
        ],
      },
    ],
    images: [
      {
        imageUrl: '/assets/icons/card5.png',
        sortOrder: 1,
        isCover: true,
        translations: [
          { locale: 'ru', altText: 'Большой тур по Узбекистану', caption: 'Маршрут по главным городам' },
          { locale: 'en', altText: 'Grand tour of Uzbekistan', caption: 'Route through the main cities' },
          { locale: 'uz', altText: 'O‘zbekiston katta turi', caption: 'Asosiy shaharlar bo‘ylab marshrut' },
        ],
      },
    ],
  });

  await createTourWithContent({
    countryId: kazakhstan.id,
    slug: 'almaty-lakes-getaway',
    type: 'SHORT',
    season: 'SUMMER',
    heroImage: '/assets/icons/tours.png',
    mainImage: '/assets/icons/card4.png',
    routeMapImage: '/assets/icons/map.png',
    durationDays: 5,
    durationNights: 4,
    minGroupSize: 2,
    maxGroupSize: 14,
    comfortLevel: 3,
    priceFrom: '560.00',
    currency: 'USD',
    showPriceToB2C: true,
    translations: [
      {
        locale: 'ru',
        title: 'Алматы и горные озера',
        subtitle: '5 дней / 4 ночи',
        route: 'Алматы - Кольсай - Чарын',
        description: 'Природный маршрут по окрестностям Алматы с мягким активным ритмом.',
        hotelsInfo: 'Городской отель 3-4 звезды и лодж у озера.',
        transportInfo: 'Минивэн и выезды в национальные парки.',
        countriesInfo: 'Казахстан.',
        included: ['Проживание', 'Завтраки', 'Трансфер по маршруту'],
        excluded: ['Авиабилеты', 'Питание вне программы'],
      },
      {
        locale: 'en',
        title: 'Almaty and Mountain Lakes',
        subtitle: '5 days / 4 nights',
        route: 'Almaty - Kolsai - Charyn',
        description: 'A nature-focused route around Almaty with a soft active pace.',
        hotelsInfo: 'A 3-4 star city hotel and a lakeside lodge.',
        transportInfo: 'Minivan and national park transfers.',
        countriesInfo: 'Kazakhstan.',
        included: ['Accommodation', 'Breakfasts', 'Route transfers'],
        excluded: ['Flights', 'Meals outside the program'],
      },
      {
        locale: 'uz',
        title: 'Olmaota va tog‘ ko‘llari',
        subtitle: '5 kun / 4 tun',
        route: 'Olmaota - Ko‘lsay - Chorin',
        description: 'Olmaota atrofida yumshoq faol ritmga ega tabiat marshruti.',
        hotelsInfo: '3-4 yulduzli shahar mehmonxonasi va ko‘l bo‘yidagi lodge.',
        transportInfo: 'Miniven va milliy bog‘larga transferlar.',
        countriesInfo: 'Qozog‘iston.',
        included: ['Yashash', 'Nonushta', 'Marshrut bo‘yicha transferlar'],
        excluded: ['Aviachiptalar', 'Dasturdan tashqari ovqatlanish'],
      },
    ],
    days: [
      {
        dayNumber: 1,
        overnightAt: 'Almaty',
        image: '/assets/icons/card4.png',
        translations: [
          { locale: 'ru', title: '1 день - Алматы', shortTitle: 'Алматы', description: 'Прибытие и прогулка по зеленым районам города.', inclusions: ['Трансфер'] },
          { locale: 'en', title: 'Day 1 - Almaty', shortTitle: 'Almaty', description: 'Arrival and a walk through Almaty’s green districts.', inclusions: ['Transfer'] },
          { locale: 'uz', title: '1-kun - Olmaota', shortTitle: 'Olmaota', description: 'Yetib kelish va shaharning yashil hududlari bo‘ylab sayr.', inclusions: ['Transfer'] },
        ],
      },
      {
        dayNumber: 2,
        overnightAt: 'Kolsai',
        image: '/assets/icons/card5.png',
        translations: [
          { locale: 'ru', title: '2 день - Кольсайские озера', shortTitle: 'Кольсай', description: 'Переезд в горы и прогулка к озерам.', inclusions: ['Трансфер', 'Гид'] },
          { locale: 'en', title: 'Day 2 - Kolsai Lakes', shortTitle: 'Kolsai', description: 'Drive to the mountains and an easy lakeside walk.', inclusions: ['Transfer', 'Guide'] },
          { locale: 'uz', title: '2-kun - Ko‘lsay ko‘llari', shortTitle: 'Ko‘lsay', description: 'Tog‘larga yo‘l va ko‘llar bo‘ylab sayr.', inclusions: ['Transfer', 'Gid'] },
        ],
      },
      {
        dayNumber: 3,
        overnightAt: 'Kolsai',
        image: '/assets/icons/card3.png',
        translations: [
          { locale: 'ru', title: '3 день - Свободный день на природе', shortTitle: 'Природа', description: 'Фотостопы, легкий треккинг и отдых.', inclusions: ['Завтрак'] },
          { locale: 'en', title: 'Day 3 - Free day in nature', shortTitle: 'Nature', description: 'Photo stops, light trekking and rest.', inclusions: ['Breakfast'] },
          { locale: 'uz', title: '3-kun - Tabiatda erkin kun', shortTitle: 'Tabiat', description: 'Fototo‘xtashlar, yengil trekking va dam olish.', inclusions: ['Nonushta'] },
        ],
      },
      {
        dayNumber: 4,
        overnightAt: 'Almaty',
        image: '/assets/icons/card2.png',
        translations: [
          { locale: 'ru', title: '4 день - Чарынский каньон', shortTitle: 'Чарын', description: 'Возвращение через Чарынский каньон.', inclusions: ['Трансфер', 'Гид'] },
          { locale: 'en', title: 'Day 4 - Charyn Canyon', shortTitle: 'Charyn', description: 'Return via the dramatic Charyn Canyon.', inclusions: ['Transfer', 'Guide'] },
          { locale: 'uz', title: '4-kun - Chorin kanyoni', shortTitle: 'Chorin', description: 'Chorin kanyoni orqali qaytish.', inclusions: ['Transfer', 'Gid'] },
        ],
      },
      {
        dayNumber: 5,
        overnightAt: 'Almaty',
        image: '/assets/icons/card1.png',
        translations: [
          { locale: 'ru', title: '5 день - Вылет', shortTitle: 'Вылет', description: 'Трансфер в аэропорт.', inclusions: ['Трансфер'] },
          { locale: 'en', title: 'Day 5 - Departure', shortTitle: 'Departure', description: 'Transfer to the airport.', inclusions: ['Transfer'] },
          { locale: 'uz', title: '5-kun - Jo‘nab ketish', shortTitle: 'Jo‘nab ketish', description: 'Aeroportga transfer.', inclusions: ['Transfer'] },
        ],
      },
    ],
    images: [
      {
        imageUrl: '/assets/icons/card4.png',
        sortOrder: 1,
        isCover: true,
        translations: [
          { locale: 'ru', altText: 'Алматы и горные озера', caption: 'Летний маршрут по природе Казахстана' },
          { locale: 'en', altText: 'Almaty and mountain lakes', caption: 'A summer nature route in Kazakhstan' },
          { locale: 'uz', altText: 'Olmaota va tog‘ ko‘llari', caption: 'Qozog‘iston tabiatidagi yozgi marshrut' },
        ],
      },
    ],
  });

  const lead = await prisma.lead.create({
    data: {
      type: 'TOUR',
      status: 'NEW',
      audience: 'B2C',
      locale: 'ru',
      name: 'Ivan Petrov',
      email: 'ivan@example.com',
      phone: '+79990001122',
      company: 'Private client',
      sourcePagePath: '/tours/weekend-in-uzbekistan',
      sourcePageTitle: 'Тур "Выходные в Узбекистане"',
      countryId: uzbekistan.id,
      tourId: tour.id,
      metadata: {
        people: 2,
        days: 3,
      } as Prisma.InputJsonValue,
      translations: {
        create: [
          {
            locale: 'ru',
            subject: 'Запрос по туру',
            message: 'Интересует тур на октябрь, нужен расчет перелета.',
            formTitle: 'Оставить заявку',
            submitLabel: 'Запросить тур',
          },
          {
            locale: 'en',
            subject: 'Tour request',
            message: 'Interested in October departure with flight estimate.',
            formTitle: 'Leave a request',
            submitLabel: 'Request tour',
          },
          {
            locale: 'uz',
            subject: 'Tur bo‘yicha so‘rov',
            message: 'Oktyabr safari qiziqtiradi, parvoz narxi kerak.',
            formTitle: 'So‘rov qoldirish',
            submitLabel: 'Tur so‘rash',
          },
        ],
      },
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: 'BK-2026-0001',
      status: 'PENDING',
      audience: 'B2B',
      locale: 'en',
      tourId: tour.id,
      partnerId: partner.id,
      countryId: uzbekistan.id,
      firstName: 'John',
      lastName: 'Smith',
      sex: 'male',
      birthDate: new Date('1990-04-16T00:00:00.000Z'),
      phone: '+447700900123',
      email: 'john.smith@example.com',
      nationality: 'British',
      documentType: 'Passport',
      documentSeries: 'AA',
      documentNumber: '1234567',
      documentIssuedAt: new Date('2021-05-01T00:00:00.000Z'),
      documentValidUntil: new Date('2031-05-01T00:00:00.000Z'),
      travelDate: new Date('2026-10-10T00:00:00.000Z'),
      groupSize: 2,
      hotelName: 'Silk Road Hotel',
      totalPrice: new Prisma.Decimal('590.00'),
      currency: 'USD',
      sourcePagePath: '/booking/weekend-in-uzbekistan',
      includedServicesSnapshot: {
        tourId: tour.id,
        leadId: lead.id,
        services: ['Accommodation', 'Transfers', 'Breakfasts'],
      } as Prisma.InputJsonValue,
      metadata: {
        operatorUserId: user.id,
        previewImageId: tourImage.id,
        firstTourDayId: tourDay1.id,
        serviceId: service.id,
        relatedNewsId: news.id,
        secondaryCountryId: kazakhstan.id,
      } as Prisma.InputJsonValue,
      translations: {
        create: [
          {
            locale: 'ru',
            packageTitle: 'Бронирование тура в Узбекистан',
            packageSummary: 'Бронирование пакета на 2 взрослых, 3 дня / 2 ночи.',
            specialRequests: 'Нужен ранний check-in.',
            internalNotes: 'B2B заявка от партнерского агентства.',
          },
          {
            locale: 'en',
            packageTitle: 'Uzbekistan tour booking',
            packageSummary: 'Package booking for 2 adults, 3 days / 2 nights.',
            specialRequests: 'Early check-in requested.',
            internalNotes: 'B2B booking from partner agency.',
          },
          {
            locale: 'uz',
            packageTitle: 'O‘zbekiston turi broni',
            packageSummary: '2 nafar kattalar uchun 3 kun / 2 tunlik paket bron qilindi.',
            specialRequests: 'Erta check-in kerak.',
            internalNotes: 'Hamkor agentlikdan kelgan B2B bron.',
          },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
