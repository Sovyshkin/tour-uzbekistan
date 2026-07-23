<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import RichTextEditor from '@/components/RichTextEditor.vue';
import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';

type LocaleCode = 'ru' | 'en' | 'uz';
type ContentType =
  | 'pages'
  | 'siteSettings'
  | 'media'
  | 'homeBanners'
  | 'countries'
  | 'tours'
  | 'services'
  | 'whyCategories'
  | 'news';

type ContentRecord = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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
  whyFacts?: WhyFactForm[];
  translations: Record<LocaleCode, Record<string, any>>;
};

type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'richtext';
};

type ImageFieldKey = 'heroImage' | 'mainImage' | 'previewImage' | 'imageUrl' | 'routeMapImage';

type ImageFieldConfig = {
  key: ImageFieldKey;
  label: string;
};

type PageContentBlock = {
  title: string;
  text: string;
};

type WhyFactForm = {
  id?: string;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  imageUrl: string;
  translations: Record<LocaleCode, {
    title: string;
    subtitle: string;
    description: string;
  }>;
};

type MediaAsset = {
  id: string;
  fileName: string;
  url: string;
  mimeType?: string | null;
  altText?: string | null;
  group?: string | null;
};

const route = useRoute();
const { t } = useAdminI18n();
const locales = computed<Array<{ code: LocaleCode; label: string }>>(() => [
  { code: 'ru', label: t('content.locales.ru') },
  { code: 'en', label: t('content.locales.en') },
  { code: 'uz', label: t('content.locales.uz') },
]);

const typeLabels = computed<Record<ContentType, string>>(() => ({
  pages: t('content.types.pages'),
  siteSettings: t('content.types.siteSettings'),
  media: t('content.types.media'),
  homeBanners: t('content.types.homeBanners'),
  countries: t('content.types.countries'),
  tours: t('content.types.tours'),
  services: t('content.types.services'),
  whyCategories: t('content.types.whyCategories'),
  news: t('content.types.news'),
}));

const typeFields = computed<Record<ContentType, FieldConfig[]>>(() => ({
  pages: [
    { key: 'title', label: t('content.fields.title') },
    { key: 'menuLabel', label: t('content.fields.menuLabel') },
    { key: 'heroTitle', label: t('content.fields.heroTitle') },
    { key: 'heroSubtitle', label: t('content.fields.heroSubtitle'), type: 'textarea' },
    { key: 'content', label: t('content.fields.content') },
    { key: 'seoTitle', label: t('content.fields.seoTitle') },
    { key: 'seoDescription', label: t('content.fields.seoDescription'), type: 'textarea' },
  ],
  siteSettings: [
    { key: 'label', label: t('content.fields.label') },
    { key: 'textValue', label: t('content.fields.textValue'), type: 'textarea' },
    { key: 'description', label: t('content.fields.description'), type: 'textarea' },
  ],
  media: [{ key: 'altText', label: t('content.fields.altText') }],
  homeBanners: [
    { key: 'title', label: t('content.fields.title') },
    { key: 'subtitle', label: t('content.fields.subtitle'), type: 'textarea' },
    { key: 'buttonLabel', label: t('content.fields.buttonLabel') },
    { key: 'altText', label: t('content.fields.altText') },
  ],
  countries: [
    { key: 'name', label: t('content.fields.name') },
    { key: 'welcomeTitle', label: t('content.fields.welcomeTitle') },
    { key: 'intro', label: t('content.fields.intro'), type: 'textarea' },
    { key: 'sidebarTitle', label: t('content.fields.sidebarTitle') },
    { key: 'seoTitle', label: t('content.fields.seoTitle') },
    { key: 'seoDescription', label: t('content.fields.seoDescription'), type: 'textarea' },
  ],
  tours: [
    { key: 'title', label: t('content.fields.title') },
    { key: 'subtitle', label: t('content.fields.subtitle') },
    { key: 'route', label: t('content.fields.route') },
    { key: 'description', label: t('content.fields.shortDescription'), type: 'richtext' },
    { key: 'detailsInfo', label: t('content.fields.detailsInfo'), type: 'richtext' },
    { key: 'routesInfo', label: t('content.fields.routesInfo'), type: 'richtext' },
    { key: 'reviewsInfo', label: t('content.fields.reviewsInfo'), type: 'richtext' },
    { key: 'transportInfo', label: t('content.fields.transportInfo'), type: 'richtext' },
    { key: 'countriesInfo', label: t('content.fields.countriesInfo'), type: 'richtext' },
    { key: 'hotelsInfo', label: t('content.fields.hotelsInfo'), type: 'textarea' },
    { key: 'seoTitle', label: t('content.fields.seoTitle') },
    { key: 'seoDescription', label: t('content.fields.seoDescription'), type: 'textarea' },
  ],
  services: [
    { key: 'name', label: t('content.fields.name') },
    { key: 'title', label: t('content.fields.title') },
    { key: 'subtitle', label: t('content.fields.subtitle'), type: 'textarea' },
    { key: 'shortDescription', label: t('content.fields.shortDescription'), type: 'textarea' },
    { key: 'seoTitle', label: t('content.fields.seoTitle') },
    { key: 'seoDescription', label: t('content.fields.seoDescription'), type: 'textarea' },
  ],
  whyCategories: [
    { key: 'title', label: t('content.fields.title') },
    { key: 'subtitle', label: t('content.fields.subtitle') },
    { key: 'description', label: t('content.fields.description'), type: 'textarea' },
    { key: 'seoTitle', label: t('content.fields.seoTitle') },
    { key: 'seoDescription', label: t('content.fields.seoDescription'), type: 'textarea' },
  ],
  news: [
    { key: 'title', label: t('content.fields.title') },
    { key: 'excerpt', label: t('content.fields.excerpt'), type: 'textarea' },
    { key: 'seoTitle', label: t('content.fields.seoTitle') },
    { key: 'seoDescription', label: t('content.fields.seoDescription'), type: 'textarea' },
  ],
}));

const imageFieldsByType = computed<Partial<Record<ContentType, ImageFieldConfig[]>>>(() => ({
  homeBanners: [{ key: 'imageUrl', label: t('content.preview') }],
  countries: [{ key: 'heroImage', label: t('content.preview') }],
  tours: [
    { key: 'mainImage', label: t('content.preview') },
    { key: 'routeMapImage', label: t('content.routeMap') },
  ],
  services: [{ key: 'previewImage', label: t('content.preview') }],
  whyCategories: [{ key: 'heroImage', label: t('content.preview') }],
  news: [{ key: 'previewImage', label: t('content.preview') }],
}));

const defaultPageContentBySlug: Partial<Record<string, Record<LocaleCode, PageContentBlock[]>>> = {
  about: {
    ru: [
      {
        title: '',
        text: 'Компания была основана в 2024 году Абдулазизом Абдурахмановым как дочерняя структура Centrum Holding. Centrum Holding, флагманская компания группы, является одним из крупнейших туристических холдингов Республики Узбекистан и объединяет ведущие инвестиции страны в туризм и транспорт, включая Centrum Air, туроператора Centrum Holidays и Air Freightnet.',
      },
      {
        title: '',
        text: '<strong>Centrum Holidays DMC</strong> — это destination management компания, базирующаяся в Узбекистане и специализирующаяся на предоставлении комплексных туристических решений высокого уровня для международных партнеров и клиентов. Являясь частью экосистемы Centrum Holding, компания сочетает глубокую локальную экспертизу и международные стандарты сервиса, обеспечивая бесшовные leisure-, group- и MICE-путешествия.',
      },
      {
        title: '',
        text: 'Благодаря глубокому знанию направления, надежной сети поставщиков и технологичному подходу к операциям, Centrum Holidays DMC предоставляет полный цикл услуг: от индивидуальных маршрутов, размещения и транспорта до экскурсий и наземной координации. Компания позиционирует себя как надежный партнер по направлению, делая ставку на операционное качество, персонализированный сервис и долгосрочные партнерства, чтобы раскрывать потенциал Узбекистана как конкурентного и профессионально управляемого туристического направления.',
      },
    ],
    en: [
      {
        title: '',
        text: "It was established in 2024 by Abdulaziz Abdurrahmanov as a subsidiary of Centrum Holding. Centrum Holding, the flagship company, is one of the largest tourism holdings in the Republic of Uzbekistan, encompassing the country's leading tourism and transportation investments, including Centrum Air, Centrum Holidays Tour Operator, and Air Freightnet.",
      },
      {
        title: '',
        text: '<strong>Centrum Holidays DMC</strong> is a destination management company based in Uzbekistan, specializing in delivering comprehensive, high-quality travel solutions for international partners and clients. As part of the Centrum Holding ecosystem, the company combines strong local expertise with global service standards to provide seamless leisure, group, and MICE travel experiences.',
      },
      {
        title: '',
        text: 'With in-depth destination knowledge, a reliable supplier network, and technology-driven operations, Centrum Holidays DMC offers end-to-end services including customized itineraries, hotels, transportation, tours, and on-ground coordination. Positioned as a trusted destination partner, the company focuses on operational excellence, tailored services, and long-term partnerships to showcase Uzbekistan as a competitive and well-managed travel destination.',
      },
    ],
    uz: [
      {
        title: '',
        text: 'Kompaniya 2024-yilda Abdulaziz Abdurahmanov tomonidan Centrum Holding tarkibidagi sho‘ba korxona sifatida tashkil etilgan. Centrum Holding guruhning flagman kompaniyasi bo‘lib, O‘zbekiston Respublikasidagi eng yirik turizm xoldinglaridan biri hisoblanadi va unga Centrum Air, Centrum Holidays turoperatori hamda Air Freightnet kabi turizm va transport yo‘nalishidagi yetakchi investitsiyalar kiradi.',
      },
      {
        title: '',
        text: '<strong>Centrum Holidays DMC</strong> O‘zbekistonda joylashgan destination management kompaniyasi bo‘lib, xalqaro hamkorlar va mijozlar uchun keng qamrovli, yuqori sifatli sayohat yechimlarini taqdim etishga ixtisoslashgan. Centrum Holding ekotizimining bir qismi sifatida kompaniya kuchli mahalliy tajribani global servis standartlari bilan uyg‘unlashtirib, leisure, group va MICE sayohatlarini uzluksiz tashkil etadi.',
      },
      {
        title: '',
        text: 'Yo‘nalishni chuqur bilish, ishonchli hamkorlar tarmog‘i va texnologiyaga tayangan operatsiyalar tufayli Centrum Holidays DMC individual marshrutlar, mehmonxonalar, transport, turlar va joydagi koordinatsiyani o‘z ichiga olgan to‘liq xizmatlar paketini taklif qiladi. Kompaniya o‘zini ishonchli destination partner sifatida ko‘rsatib, operatsion mukammallik, moslashtirilgan servis va uzoq muddatli hamkorliklarga tayangan holda O‘zbekistonni raqobatbardosh va professional boshqariladigan turistik yo‘nalish sifatida namoyon etadi.',
      },
    ],
  },
  directions: {
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
    ],
    en: [
      {
        title: 'Our Direction at Centrum Holidays DMC',
        text: 'At Centrum Holidays DMC, our direction is shaped by a clear vision: to position Uzbekistan as a well-managed, high-quality, and globally competitive destination while becoming a trusted destination management partner for international markets.',
      },
      {
        title: 'A Clear Strategic Vision',
        text: 'Our growth strategy is built on long-term sustainability rather than short-term expansion. We focus on developing strong foundations: operational excellence, destination expertise, and reliable partnerships, ensuring that every stage of our growth adds value to our clients, partners, and the destination itself.',
      },
      {
        title: 'Strengthening Destination Leadership',
        text: 'Centrum Holidays DMC aims to play an active role in shaping Uzbekistan tourism landscape. By continuously developing new routes, experiences, and service concepts, we contribute to destination diversification while maintaining cultural authenticity and service quality.',
      },
    ],
    uz: [
      {
        title: 'Centrum Holidays DMC yo‘nalishi',
        text: 'Centrum Holidays DMC rivoji aniq qarashga tayangan: O‘zbekistonni sifatli, raqobatbardosh va professional boshqariladigan yo‘nalish sifatida mustahkamlash hamda xalqaro bozorlar uchun ishonchli destination management hamkoriga aylanish.',
      },
      {
        title: 'Aniq strategik qarash',
        text: 'Bizning o‘sish strategiyamiz qisqa muddatli kengayish emas, balki uzoq muddatli barqarorlikka asoslanadi. Biz operatsion mukammallik, yo‘nalish ekspertizasi va ishonchli hamkorliklarni mustahkamlab, rivojlanishning har bir bosqichi mijozlar, hamkorlar va yo‘nalishning o‘ziga qiymat olib kelishini ta’minlaymiz.',
      },
      {
        title: 'Yo‘nalish yetakchiligini kuchaytirish',
        text: 'Centrum Holidays DMC O‘zbekiston turizm manzarasini shakllantirishda faol rol o‘ynashni maqsad qiladi. Yangi marshrutlar, taassurotlar va servis konsepsiyalarini doimiy ishlab chiqish orqali biz yo‘nalish diversifikatsiyasiga hissa qo‘shamiz va shu bilan birga madaniy haqiqiylik hamda xizmat sifatini saqlab qolamiz.',
      },
    ],
  },
};

const fallbackTypes: ContentType[] = [
  'pages',
  'siteSettings',
  'media',
  'homeBanners',
  'countries',
  'tours',
  'services',
  'whyCategories',
  'news',
];
const activeType = ref<ContentType>('homeBanners');
const loading = ref(false);
const saving = ref(false);
const archivingId = ref('');
const bulkProcessing = ref(false);
const selectedItems = ref<ContentRecord[]>([]);
const drawerOpen = ref(false);
const isCreating = ref(false);
const activeLocale = ref<LocaleCode>('ru');
const countryOptions = ref<Array<{ id: string; title: string; slug: string }>>([]);
const mediaOptions = ref<ContentRecord[]>([]);
const contentTableRef = ref();
const uploadInput = ref<HTMLInputElement | null>(null);
const uploadTargetField = ref<ImageFieldKey | null>(null);
const uploadFactTargetIndex = ref<number | null>(null);
const documentUploadTarget = ref<{ locale: LocaleCode; fieldKey: string } | null>(null);
const contentByType = reactive<Record<ContentType, ContentRecord[]>>({
  homeBanners: [],
  pages: [],
  siteSettings: [],
  media: [],
  countries: [],
  tours: [],
  services: [],
  whyCategories: [],
  news: [],
});

const form = reactive<{
  id: string;
  type: ContentType;
  slug: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  countryId?: string;
  durationDays?: number;
  durationNights?: number;
  minGroupSize?: number;
  maxGroupSize?: number;
  comfortLevel?: number;
  priceFrom?: number;
  currency?: string;
  tourType?: string;
  media: Partial<Record<ImageFieldKey, string>>;
  whyFacts: WhyFactForm[];
  translations: Record<LocaleCode, Record<string, unknown>>;
}>({
  id: '',
  type: 'homeBanners',
  slug: '',
  status: undefined,
  sortOrder: undefined,
  isFeatured: undefined,
  isActive: undefined,
  countryId: undefined,
  durationDays: undefined,
  durationNights: undefined,
  minGroupSize: undefined,
  maxGroupSize: undefined,
  comfortLevel: undefined,
  priceFrom: undefined,
  currency: undefined,
  tourType: undefined,
  media: {},
  whyFacts: [],
  translations: {
    ru: {},
    en: {},
    uz: {},
  },
});

const routeTypes = computed<ContentType[]>(() => {
  const metaTypes = route.meta.contentTypes;
  return Array.isArray(metaTypes) && metaTypes.length ? (metaTypes as ContentType[]) : fallbackTypes;
});

const creatableTypes: ContentType[] = [
  'pages',
  'siteSettings',
  'countries',
  'tours',
  'services',
  'whyCategories',
  'news',
];
const normalizedActiveType = computed<ContentType>(() =>
  routeTypes.value.includes(activeType.value) ? activeType.value : routeTypes.value[0] ?? activeType.value,
);
const activeItems = computed(() => contentByType[normalizedActiveType.value]);
const activeFields = computed(() => typeFields.value[form.type]);
const activeImageFields = computed(() => imageFieldsByType.value[form.type] ?? []);
const isCreatableType = computed(() => creatableTypes.includes(normalizedActiveType.value));
const isTourForm = computed(() => form.type === 'tours');
const isMediaType = (type: ContentType) => type === 'media';
const isDocumentUrlField = (field: FieldConfig) =>
  form.type === 'siteSettings' && form.slug.startsWith('legal.') && field.key === 'textValue';
const selectedCount = computed(() => selectedItems.value.length);
const selectedStatusItems = computed(() => selectedItems.value.filter((item) => item.status !== undefined));
const selectedActiveItems = computed(() => selectedItems.value.filter((item) => item.isActive !== undefined));
const hasSelectedStatusItems = computed(() => selectedStatusItems.value.length > 0);
const hasSelectedActiveItems = computed(() => selectedActiveItems.value.length > 0);
const apiOrigin = computed(() => {
  const baseURL = http.defaults.baseURL ?? window.location.origin;
  return new URL(baseURL, window.location.origin).origin;
});

const resetForm = () => {
  form.id = '';
  form.type = activeType.value;
  form.slug = '';
  form.status = undefined;
  form.sortOrder = undefined;
  form.isFeatured = undefined;
  form.isActive = undefined;
  form.countryId = undefined;
  form.durationDays = undefined;
  form.durationNights = undefined;
  form.minGroupSize = undefined;
  form.maxGroupSize = undefined;
  form.comfortLevel = undefined;
  form.priceFrom = undefined;
  form.currency = undefined;
  form.tourType = undefined;
  form.media = {};
  form.whyFacts = [];
  form.translations = { ru: {}, en: {}, uz: {} };
  activeLocale.value = 'ru';
};

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const normalizePageContentBlocks = (value: unknown): PageContentBlock[] => {
  const parsed = (() => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.trim() ? [{ title: '', text: value }] : [];
      }
    }

    return value;
  })();

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((block) => {
    if (typeof block === 'string') {
      return { title: '', text: block };
    }

    if (typeof block === 'object' && block !== null) {
      const source = block as Record<string, unknown>;
      return {
        title: typeof source.title === 'string' ? source.title : '',
        text: typeof source.text === 'string' ? source.text : '',
      };
    }

    return { title: '', text: '' };
  });
};

const isNormalizedPageContentBlocks = (value: unknown): value is PageContentBlock[] =>
  Array.isArray(value) &&
  value.every((block) => {
    if (typeof block === 'string') {
      return false;
    }

    if (typeof block !== 'object' || block === null) {
      return false;
    }

    const source = block as Record<string, unknown>;
    return typeof source.title === 'string' && typeof source.text === 'string';
  });

const clonePageBlocks = (blocks: PageContentBlock[]) =>
  blocks.map((block) => ({ title: block.title, text: block.text }));

const applyDefaultPageContent = (slug: string) => {
  const defaults = defaultPageContentBySlug[slug];

  if (!defaults) {
    return;
  }

  for (const locale of locales.value) {
    const currentBlocks = normalizePageContentBlocks(form.translations[locale.code].content);
    if (!currentBlocks.length) {
      form.translations[locale.code].content = clonePageBlocks(defaults[locale.code]);
    }
  }
};

const emptyWhyFactTranslations = (): WhyFactForm['translations'] => ({
  ru: { title: '', subtitle: '', description: '' },
  en: { title: '', subtitle: '', description: '' },
  uz: { title: '', subtitle: '', description: '' },
});

const normalizeWhyFactText = (value: unknown) => (typeof value === 'string' ? value : '');

const normalizeWhyFacts = (value?: WhyFactForm[]): WhyFactForm[] =>
  (value ?? []).map((fact, index) => {
    const sourceTranslations = fact.translations ?? emptyWhyFactTranslations();

    return {
      id: fact.id,
      sortOrder: Number.isFinite(Number(fact.sortOrder)) ? Number(fact.sortOrder) : index,
      status: fact.status ?? 'PUBLISHED',
      imageUrl: fact.imageUrl ?? '',
      translations: {
        ru: {
          title: normalizeWhyFactText(sourceTranslations.ru?.title),
          subtitle: normalizeWhyFactText(sourceTranslations.ru?.subtitle),
          description: normalizeWhyFactText(sourceTranslations.ru?.description),
        },
        en: {
          title: normalizeWhyFactText(sourceTranslations.en?.title),
          subtitle: normalizeWhyFactText(sourceTranslations.en?.subtitle),
          description: normalizeWhyFactText(sourceTranslations.en?.description),
        },
        uz: {
          title: normalizeWhyFactText(sourceTranslations.uz?.title),
          subtitle: normalizeWhyFactText(sourceTranslations.uz?.subtitle),
          description: normalizeWhyFactText(sourceTranslations.uz?.description),
        },
      },
    };
  });

const addWhyFact = () => {
  form.whyFacts.push({
    sortOrder: form.whyFacts.length,
    status: 'PUBLISHED',
    imageUrl: '',
    translations: emptyWhyFactTranslations(),
  });
};

const archiveWhyFact = (index: number) => {
  form.whyFacts[index].status = 'ARCHIVED';
};

const triggerFactUpload = (index: number) => {
  uploadFactTargetIndex.value = index;
  uploadTargetField.value = null;
  uploadInput.value?.click();
};

const isPageContentField = (field: FieldConfig) => form.type === 'pages' && field.key === 'content';

const getPageContentBlocks = (localeCode: LocaleCode) => {
  const current = form.translations[localeCode].content;

  if (isNormalizedPageContentBlocks(current)) {
    return current;
  }

  const blocks = normalizePageContentBlocks(current);
  form.translations[localeCode].content = blocks;
  return blocks;
};

const addPageContentBlock = (localeCode: LocaleCode) => {
  const blocks = getPageContentBlocks(localeCode);
  blocks.push({ title: '', text: '' });
  form.translations[localeCode].content = blocks;
};

const removePageContentBlock = (localeCode: LocaleCode, index: number) => {
  const blocks = getPageContentBlocks(localeCode);
  blocks.splice(index, 1);
  form.translations[localeCode].content = blocks;
};

const updatePageBlockText = (localeCode: LocaleCode, blockIndex: number, value: string) => {
  const blocks = getPageContentBlocks(localeCode);
  blocks[blockIndex].text = value;
  form.translations[localeCode].content = blocks;
};

const resolveMediaUrl = (url?: string | null) => {
  if (!url) {
    return '';
  }

  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
    return url;
  }

  return `${apiOrigin.value}${url.startsWith('/') ? url : `/${url}`}`;
};

const loadType = async (type: ContentType) => {
  const response = await http.get<ContentRecord[]>('/admin/content', {
    params: { type },
  });
  contentByType[type] = response.data;
};

const loadCountryOptions = async () => {
  if (countryOptions.value.length) {
    return;
  }

  const response = await http.get<ContentRecord[]>('/admin/content', {
    params: { type: 'countries' },
  });
  countryOptions.value = response.data.map((country) => ({
    id: country.id,
    title: country.title,
    slug: country.slug,
  }));
};

const loadMediaOptions = async (force = false) => {
  if (mediaOptions.value.length && !force) {
    return;
  }

  const response = await http.get<ContentRecord[]>('/admin/content', {
    params: { type: 'media' },
  });
  mediaOptions.value = response.data;
  contentByType.media = response.data;
};

const loadContent = async () => {
  loading.value = true;
  activeType.value = routeTypes.value[0] ?? 'homeBanners';
  try {
    await Promise.all(routeTypes.value.map((type) => loadType(type)));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('content.contentLoadFailed')));
  } finally {
    loading.value = false;
  }
};

const openEditor = async (record: ContentRecord) => {
  isCreating.value = false;
  resetForm();
  form.id = record.id;
  form.type = record.type;
  form.slug = record.slug;
  form.status = record.status;
  form.sortOrder = record.sortOrder;
  form.isFeatured = record.isFeatured;
  form.isActive = record.isActive;
  form.countryId = record.countryId;
  form.durationDays = record.durationDays;
  form.durationNights = record.durationNights;
  form.minGroupSize = record.minGroupSize ?? undefined;
  form.maxGroupSize = record.maxGroupSize ?? undefined;
  form.comfortLevel = record.comfortLevel ?? undefined;
  form.priceFrom = record.priceFrom ? Number(record.priceFrom) : undefined;
  form.currency = record.currency ?? undefined;
  form.tourType = record.tourType;

  if (imageFieldsByType.value[record.type]?.length) {
    await loadMediaOptions();
    for (const field of imageFieldsByType.value[record.type] ?? []) {
      form.media[field.key] = record.images?.[field.key] ?? '';
    }
  }

  if (record.type === 'whyCategories') {
    await loadMediaOptions();
    form.whyFacts = normalizeWhyFacts(record.whyFacts);
  }

  if (record.type === 'tours') {
    await loadCountryOptions();
  }

  for (const locale of locales.value) {
    form.translations[locale.code] = {};
    for (const field of typeFields.value[record.type]) {
      const value = record.translations[locale.code]?.[field.key];
      form.translations[locale.code][field.key] =
        record.type === 'pages' && field.key === 'content'
          ? normalizePageContentBlocks(value)
          : normalizeValue(value);
    }
  }

  if (record.type === 'pages') {
    applyDefaultPageContent(record.slug);
  }

  drawerOpen.value = true;
};

const openCreate = async () => {
  const createType = normalizedActiveType.value;
  isCreating.value = true;
  resetForm();
  activeType.value = createType;
  form.type = createType;
  form.slug = `new-${createType}-${Date.now()}`;
  form.status = createType === 'media' || createType === 'siteSettings' ? undefined : 'DRAFT';
  form.sortOrder = ['countries', 'services'].includes(createType) ? 0 : undefined;
  form.isFeatured = ['countries', 'tours', 'services'].includes(createType) ? false : undefined;
  form.isActive = createType === 'siteSettings' ? true : undefined;

  if (imageFieldsByType.value[createType]?.length) {
    await loadMediaOptions();
    for (const field of imageFieldsByType.value[createType] ?? []) {
      form.media[field.key] = '';
    }
  }

  if (createType === 'whyCategories') {
    await loadMediaOptions();
    form.whyFacts = [];
  }

  if (createType === 'tours') {
    try {
      await loadCountryOptions();
      form.countryId = '';
      form.durationDays = 1;
      form.durationNights = 0;
      form.minGroupSize = 1;
      form.maxGroupSize = 2;
      form.comfortLevel = 4;
      form.priceFrom = undefined;
      form.currency = 'USD';
      form.tourType = 'PRIVATE';
    } catch (error: any) {
      ElMessage.error(getApiErrorMessage(error, t('content.countriesLoadFailed')));
      return;
    }
  }

  for (const locale of locales.value) {
    form.translations[locale.code] = {};
    for (const field of typeFields.value[createType]) {
      form.translations[locale.code][field.key] =
        createType === 'pages' && field.key === 'content' ? [] : '';
    }
  }

  drawerOpen.value = true;
};

const saveContent = async () => {
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      slug: form.slug,
      status: form.status,
      sortOrder: form.sortOrder,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      translations: locales.value.map((locale) => ({
        locale: locale.code,
        fields: form.translations[locale.code],
      })),
    };

    if (form.type === 'tours') {
      payload.countryId = form.countryId;
      payload.durationDays = form.durationDays;
      payload.durationNights = form.durationNights;
      payload.minGroupSize = form.minGroupSize;
      payload.maxGroupSize = form.maxGroupSize;
      payload.comfortLevel = form.comfortLevel;
      payload.priceFrom = form.priceFrom;
      payload.currency = form.currency;
      payload.type = form.tourType;
    }

    for (const field of imageFieldsByType.value[form.type] ?? []) {
      payload[field.key] = form.media[field.key] ?? '';
    }

    if (form.type === 'whyCategories') {
      payload.whyFacts = form.whyFacts.map((fact) => ({
        id: fact.id,
        sortOrder: fact.sortOrder,
        status: fact.status,
        imageUrl: fact.imageUrl,
        translations: locales.value.map((locale) => ({
          locale: locale.code,
          fields: fact.translations[locale.code],
        })),
      }));
    }

    if (isCreating.value) {
      await http.post(`/admin/content/${form.type}`, payload);
    } else {
      await http.patch(`/admin/content/${form.type}/${form.id}`, payload);
    }

    await loadType(form.type);
    drawerOpen.value = false;
    ElMessage.success(isCreating.value ? t('content.recordCreated') : t('content.contentSaved'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('content.saveFailed')));
  } finally {
    saving.value = false;
  }
};

const triggerUpload = (field?: ImageFieldKey) => {
  documentUploadTarget.value = null;
  uploadTargetField.value = field ?? null;
  uploadInput.value?.click();
};

const triggerDocumentUpload = (locale: LocaleCode, fieldKey: string) => {
  uploadFactTargetIndex.value = null;
  uploadTargetField.value = null;
  documentUploadTarget.value = { locale, fieldKey };
  uploadInput.value?.click();
};

const optimizeImageBeforeUpload = async (file: File) => {
  const canOptimize = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);

  if (!canOptimize || file.size < 600 * 1024) {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = imageUrl;
    });

    const maxWidth = 1920;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.78);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const handleUploadChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const uploadFile = await optimizeImageBeforeUpload(file);
  const uploadData = new FormData();
  uploadData.append('file', uploadFile);
  uploadData.append(
    'group',
    documentUploadTarget.value
      ? 'legal-documents'
      : uploadTargetField.value
        ? form.type
        : normalizedActiveType.value,
  );
  uploadData.append('altText', file.name.replace(/\.[^.]+$/, ''));

  try {
    const response = await http.post<MediaAsset>('/admin/media/upload', uploadData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await loadMediaOptions(true);

    if (documentUploadTarget.value) {
      const { locale, fieldKey } = documentUploadTarget.value;
      form.translations[locale][fieldKey] = response.data.url;
    } else if (uploadFactTargetIndex.value !== null) {
      const fact = form.whyFacts[uploadFactTargetIndex.value];
      if (fact) {
        fact.imageUrl = response.data.url;
      }
    } else if (uploadTargetField.value) {
      form.media[uploadTargetField.value] = response.data.url;
    }

    ElMessage.success(t('content.mediaUploaded'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('content.mediaUploadFailed')));
  } finally {
    input.value = '';
    uploadTargetField.value = null;
    uploadFactTargetIndex.value = null;
    documentUploadTarget.value = null;
  }
};

const archiveActionLabel = (row: ContentRecord) => {
  if (row.type === 'media') {
    return t('common.delete');
  }

  if (row.type === 'homeBanners' || row.type === 'siteSettings') {
    return t('common.deactivate');
  }

  return t('common.archive');
};

const archiveContent = async (row: ContentRecord) => {
  const action = archiveActionLabel(row).toLowerCase();

  try {
    await ElMessageBox.confirm(
      t('content.confirmAction', { action, title: row.title }),
      archiveActionLabel(row),
      {
        confirmButtonText: archiveActionLabel(row),
        cancelButtonText: t('common.cancel'),
        type: row.type === 'media' ? 'warning' : 'info',
      },
    );
  } catch {
    return;
  }

  archivingId.value = row.id;
  try {
    const response = await http.delete<ContentRecord[]>(`/admin/content/${row.type}/${row.id}`);
    contentByType[row.type] = response.data;
    ElMessage.success(row.type === 'media' ? t('content.deleted') : t('content.updated'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('content.actionFailed')));
  } finally {
    archivingId.value = '';
  }
};

const statusTagType = (status?: string) => {
  if (status === 'PUBLISHED') {
    return 'success';
  }

  if (status === 'ARCHIVED') {
    return 'info';
  }

  return 'warning';
};

const getMediaExtension = (record: ContentRecord) => {
  const source = record.slug || record.image || record.title;
  const extension = source.split('.').pop();
  return extension && extension !== source ? extension.toUpperCase() : 'FILE';
};

const isImageMedia = (record: ContentRecord) => {
  const source = `${record.image ?? ''} ${record.slug ?? ''}`.toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/.test(source);
};

const resetSelection = () => {
  selectedItems.value = [];
  contentTableRef.value?.clearSelection?.();
};

const handleSelectionChange = (rows: ContentRecord[]) => {
  selectedItems.value = rows;
};

const isSelected = (item: ContentRecord) => selectedItems.value.some((selected) => selected.id === item.id);

const toggleItemSelection = (item: ContentRecord, checked: boolean) => {
  if (checked) {
    if (!isSelected(item)) {
      selectedItems.value = [...selectedItems.value, item];
    }
    return;
  }

  selectedItems.value = selectedItems.value.filter((selected) => selected.id !== item.id);
};

const patchSelected = async (
  items: ContentRecord[],
  payload: Record<string, unknown>,
  successMessage: string,
) => {
  if (!items.length) {
    ElMessage.warning(t('content.noSelection'));
    return;
  }

  bulkProcessing.value = true;
  try {
    await Promise.all(items.map((item) => http.patch(`/admin/content/${item.type}/${item.id}`, payload)));
    await loadType(normalizedActiveType.value);
    resetSelection();
    ElMessage.success(successMessage);
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('records.bulkActionFailed')));
  } finally {
    bulkProcessing.value = false;
  }
};

const bulkSetStatus = (status: 'DRAFT' | 'PUBLISHED') => {
  const message = status === 'PUBLISHED' ? t('content.selectedPublished') : t('content.selectedDrafted');
  return patchSelected(selectedStatusItems.value, { status }, message);
};

const bulkSetActive = (isActive: boolean) => {
  return patchSelected(
    selectedActiveItems.value,
    { isActive },
    isActive ? t('content.selectedActivated') : t('content.selectedDisabled'),
  );
};

const bulkArchiveSelected = async () => {
  if (!selectedItems.value.length) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('content.confirmBulk', { count: selectedItems.value.length }),
      t('records.bulkAction'),
      {
        confirmButtonText: normalizedActiveType.value === 'media' ? t('common.delete') : t('common.archive'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  bulkProcessing.value = true;
  try {
    await Promise.all(
      selectedItems.value.map((item) => http.delete(`/admin/content/${item.type}/${item.id}`)),
    );
    await loadType(normalizedActiveType.value);
    resetSelection();
    ElMessage.success(normalizedActiveType.value === 'media' ? t('content.selectedMediaDeleted') : t('content.selectedUpdated'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('records.bulkActionFailed')));
  } finally {
    bulkProcessing.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false;
    isCreating.value = false;
    resetForm();
    resetSelection();
    loadContent();
  },
  { immediate: true },
);

watch(
  () => normalizedActiveType.value,
  () => resetSelection(),
);
</script>

<template>
  <div class="content-page">
    <section v-if="!drawerOpen" class="toolbar">
      <div class="toolbar-actions">
        <el-button :loading="loading" @click="loadContent">{{ t('common.refresh') }}</el-button>
        <el-button v-if="activeType === 'media'" type="primary" plain @click="triggerUpload()">
          {{ t('common.upload') }}
        </el-button>
        <el-button v-if="isCreatableType" type="primary" @click="openCreate">
          {{ t('common.create') }}
        </el-button>
        <template v-if="selectedCount > 0">
          <el-tag class="selection-count" type="info">{{ t('common.selected', { count: selectedCount }) }}</el-tag>
          <el-button
            v-if="hasSelectedStatusItems"
            plain
            :loading="bulkProcessing"
            @click="bulkSetStatus('PUBLISHED')"
          >
            {{ t('common.publish') }}
          </el-button>
          <el-button
            v-if="hasSelectedStatusItems"
            plain
            :loading="bulkProcessing"
            @click="bulkSetStatus('DRAFT')"
          >
            {{ t('common.draft') }}
          </el-button>
          <el-button
            v-if="hasSelectedActiveItems"
            plain
            :loading="bulkProcessing"
            @click="bulkSetActive(true)"
          >
            {{ t('common.activate') }}
          </el-button>
          <el-button
            v-if="hasSelectedActiveItems"
            plain
            :loading="bulkProcessing"
            @click="bulkSetActive(false)"
          >
            {{ t('common.deactivate') }}
          </el-button>
          <el-button
            type="danger"
            plain
            :loading="bulkProcessing"
            @click="bulkArchiveSelected"
          >
            {{ normalizedActiveType === 'media' ? t('common.delete') : t('common.archive') }}
          </el-button>
          <el-button plain :disabled="bulkProcessing" @click="resetSelection">
            {{ t('common.clearSelection') }}
          </el-button>
        </template>
      </div>
    </section>

    <input
      ref="uploadInput"
      class="media-upload-input"
      type="file"
      accept="image/*,.pdf"
      @change="handleUploadChange"
    />

    <el-tabs v-if="!drawerOpen" v-model="activeType" class="content-tabs">
      <el-tab-pane
        v-for="type in routeTypes"
        :key="type"
        :name="type"
        :label="typeLabels[type]"
      >
        <el-card v-if="isMediaType(type)" class="media-card" shadow="never">
          <div v-loading="loading" class="media-grid">
            <article
              v-for="item in activeItems"
              :key="item.id"
              class="media-item"
            >
              <el-checkbox
                class="media-select"
                :model-value="isSelected(item)"
                @change="(value: string | number | boolean) => toggleItemSelection(item, Boolean(value))"
              />
              <div class="media-preview">
                <img
                  v-if="item.image && isImageMedia(item)"
                  :src="resolveMediaUrl(item.image)"
                  :alt="String(item.translations.ru?.altText || item.title)"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="media-file-fallback">
                  {{ getMediaExtension(item) }}
                </div>
              </div>

              <div class="media-info">
                <div class="media-title">{{ item.title }}</div>
                <a
                  v-if="item.image"
                  class="media-url"
                  :href="resolveMediaUrl(item.image)"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ item.image }}
                </a>
                <div class="media-alt">
                  {{ item.translations.ru?.altText || t('content.mediaAltMissing') }}
                </div>
              </div>

              <div class="media-actions">
                <el-button type="primary" plain size="small" @click="openEditor(item)">
                  {{ t('common.edit') }}
                </el-button>
                <el-button
                  type="danger"
                  plain
                  size="small"
                  :loading="archivingId === item.id"
                  @click="archiveContent(item)"
                >
                  {{ t('common.delete') }}
                </el-button>
              </div>
            </article>

            <el-empty v-if="!loading && !activeItems.length" :description="t('common.noMedia')" />
          </div>
        </el-card>

        <el-card v-else class="table-card" shadow="never">
          <el-table
            ref="contentTableRef"
            v-loading="loading"
            :data="activeItems"
            :empty-text="t('common.noData')"
            row-key="id"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="title" :label="t('common.title')" min-width="220" />
            <el-table-column prop="slug" :label="t('common.slug')" min-width="180" />
            <el-table-column :label="t('common.status')" width="130">
              <template #default="{ row }">
                <el-tag v-if="row.status" :type="statusTagType(row.status)">
                  {{ row.status ? t(`enums.publishStatus.${row.status}`) : row.status }}
                </el-tag>
                <el-tag v-else :type="row.isActive ? 'success' : 'info'">
                  {{ row.isActive ? 'ACTIVE' : 'OFF' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('common.featured')" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.isFeatured !== undefined" :type="row.isFeatured ? 'success' : 'info'">
                  {{ row.isFeatured ? t('common.yes') : t('common.no') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('common.actions')" width="250">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button type="primary" plain size="small" @click="openEditor(row)">
                    {{ t('common.edit') }}
                  </el-button>
                  <el-button
                    type="danger"
                    plain
                    size="small"
                    :loading="archivingId === row.id"
                    @click="archiveContent(row)"
                  >
                    {{ archiveActionLabel(row) }}
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <section v-else class="editor-page">
      <header class="editor-header">
        <div>
          <p class="editor-kicker">{{ typeLabels[form.type] }}</p>
          <h2>{{ isCreating ? t('content.createTitle') : t('content.editTitle', { slug: form.slug }) }}</h2>
        </div>
        <div class="editor-header-actions">
          <el-button @click="drawerOpen = false">{{ t('common.back') }}</el-button>
          <el-button type="primary" :loading="saving" @click="saveContent">
            {{ t('common.save') }}
          </el-button>
        </div>
      </header>

      <el-form label-position="top" class="editor-form">
        <div class="base-grid">
          <el-form-item label="Slug">
            <el-input v-model="form.slug" />
          </el-form-item>

          <el-form-item v-if="form.status !== undefined" :label="t('common.status')">
            <el-select v-model="form.status">
              <el-option :label="t('enums.publishStatus.DRAFT')" value="DRAFT" />
              <el-option :label="t('enums.publishStatus.PUBLISHED')" value="PUBLISHED" />
              <el-option :label="t('enums.publishStatus.ARCHIVED')" value="ARCHIVED" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="form.sortOrder !== undefined" :label="t('common.order')">
            <el-input-number v-model="form.sortOrder" :min="0" />
          </el-form-item>

          <el-form-item v-if="form.isFeatured !== undefined" :label="t('common.featured')">
            <el-switch v-model="form.isFeatured" />
          </el-form-item>

          <el-form-item v-if="form.isActive !== undefined" :label="t('common.active')">
            <el-switch v-model="form.isActive" />
          </el-form-item>

          <template v-if="isTourForm">
            <el-form-item :label="t('content.country')">
              <el-select
                v-model="form.countryId"
                filterable
                :placeholder="t('content.chooseCountry')"
              >
                <el-option
                  v-for="country in countryOptions"
                  :key="country.id"
                  :label="`${country.title} (${country.slug})`"
                  :value="country.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item :label="t('content.tourType')">
              <el-select v-model="form.tourType">
                <el-option label="PRIVATE" value="PRIVATE" />
                <el-option label="GROUP" value="GROUP" />
                <el-option label="ONE_DAY" value="ONE_DAY" />
                <el-option label="SHORT" value="SHORT" />
                <el-option label="MULTI_DAY" value="MULTI_DAY" />
                <el-option label="MICE" value="MICE" />
              </el-select>
            </el-form-item>

            <el-form-item :label="t('content.days')">
              <el-input-number v-model="form.durationDays" :min="1" />
            </el-form-item>

            <el-form-item :label="t('content.nights')">
              <el-input-number v-model="form.durationNights" :min="0" />
            </el-form-item>

            <el-form-item :label="t('content.minTourists')">
              <el-input-number v-model="form.minGroupSize" :min="1" />
            </el-form-item>

            <el-form-item :label="t('content.maxTourists')">
              <el-input-number v-model="form.maxGroupSize" :min="1" />
            </el-form-item>

            <el-form-item :label="t('content.comfort')">
              <el-input-number v-model="form.comfortLevel" :min="1" :max="5" />
            </el-form-item>

            <el-form-item :label="t('content.priceFrom')">
              <el-input-number v-model="form.priceFrom" :min="0" :precision="2" />
            </el-form-item>

            <el-form-item :label="t('content.currency')">
              <el-input v-model="form.currency" placeholder="USD" />
            </el-form-item>
          </template>
        </div>

        <div v-if="activeImageFields.length" class="media-fields">
          <el-form-item
            v-for="field in activeImageFields"
            :key="field.key"
            :label="field.label"
          >
            <div class="media-picker">
              <div class="media-picker-preview">
                <img
                  v-if="form.media[field.key]"
                  :src="resolveMediaUrl(form.media[field.key])"
                  :alt="field.label"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else>{{ t('common.noMediaSelected') }}</span>
              </div>
              <div class="media-picker-controls">
                <el-select
                  v-model="form.media[field.key]"
                  filterable
                  clearable
                  :placeholder="t('common.selectMedia')"
                >
                  <el-option
                    v-for="asset in mediaOptions"
                    :key="asset.id"
                    :label="asset.title"
                    :value="asset.image || ''"
                  />
                </el-select>
                <el-button plain @click="triggerUpload(field.key)">{{ t('common.uploadFile') }}</el-button>
              </div>
            </div>
          </el-form-item>
        </div>

        <section v-if="form.type === 'whyCategories'" class="why-facts-editor">
          <div class="why-facts-header">
            <div>
              <h3>{{ t('content.whyFactsTitle') }}</h3>
              <p>{{ t('content.whyFactsSubtitle') }}</p>
            </div>
            <el-button type="primary" plain @click="addWhyFact">{{ t('content.addFact') }}</el-button>
          </div>

          <article
            v-for="(fact, factIndex) in form.whyFacts"
            :key="fact.id || `new-fact-${factIndex}`"
            class="why-fact-card"
          >
            <div class="why-fact-top">
              <div class="why-fact-preview">
                <img
                  v-if="fact.imageUrl"
                  :src="resolveMediaUrl(fact.imageUrl)"
                  :alt="fact.translations.ru.title || t('content.fact', { number: factIndex + 1 })"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else>{{ t('common.noMediaSelected') }}</span>
              </div>

              <div class="why-fact-controls">
                <el-form-item :label="t('common.image')">
                  <el-select
                    v-model="fact.imageUrl"
                    filterable
                    clearable
                    :placeholder="t('common.selectMedia')"
                  >
                    <el-option
                      v-for="asset in mediaOptions"
                      :key="asset.id"
                      :label="asset.title"
                      :value="asset.image || ''"
                    />
                  </el-select>
                </el-form-item>

                <el-button plain @click="triggerFactUpload(factIndex)">{{ t('common.uploadFile') }}</el-button>

                <div class="why-fact-grid">
                  <el-form-item :label="t('common.order')">
                    <el-input-number v-model="fact.sortOrder" :min="0" />
                  </el-form-item>

                  <el-form-item :label="t('common.status')">
                    <el-select v-model="fact.status">
                      <el-option :label="t('enums.publishStatus.DRAFT')" value="DRAFT" />
                      <el-option :label="t('enums.publishStatus.PUBLISHED')" value="PUBLISHED" />
                      <el-option :label="t('enums.publishStatus.ARCHIVED')" value="ARCHIVED" />
                    </el-select>
                  </el-form-item>
                </div>
              </div>
            </div>

            <el-tabs class="why-fact-tabs">
              <el-tab-pane
                v-for="locale in locales"
                :key="`${fact.id || factIndex}-${locale.code}`"
                :label="locale.label"
              >
                <el-form-item :label="t('content.factTitle')">
                  <el-input v-model="fact.translations[locale.code].title" />
                </el-form-item>

                <el-form-item :label="t('content.factSubtitle')">
                  <el-input v-model="fact.translations[locale.code].subtitle" />
                </el-form-item>

                <el-form-item :label="t('content.description')">
                  <el-input
                    v-model="fact.translations[locale.code].description"
                    type="textarea"
                    :rows="4"
                  />
                </el-form-item>
              </el-tab-pane>
            </el-tabs>

            <div class="why-fact-actions">
              <el-button type="danger" plain @click="archiveWhyFact(factIndex)">
                {{ t('content.archiveFact') }}
              </el-button>
            </div>
          </article>

          <el-empty v-if="!form.whyFacts.length" :description="t('content.emptyFacts')" />
        </section>

        <el-tabs v-model="activeLocale">
          <el-tab-pane
            v-for="locale in locales"
            :key="locale.code"
            :name="locale.code"
            :label="locale.label"
          >
            <el-form-item
              v-for="field in activeFields"
              :key="`${locale.code}-${field.key}`"
              :label="field.label"
            >
              <div v-if="isPageContentField(field)" class="page-block-editor">
                <article
                  v-for="(block, blockIndex) in getPageContentBlocks(locale.code)"
                  :key="`${locale.code}-content-${blockIndex}`"
                  class="page-block-item"
                >
                  <div class="page-block-head">
                    <strong>{{ t('content.block', { number: blockIndex + 1 }) }}</strong>
                    <el-button
                      type="danger"
                      plain
                      size="small"
                      @click="removePageContentBlock(locale.code, blockIndex)"
                    >
                      {{ t('common.delete') }}
                    </el-button>
                  </div>
                  <el-input
                    v-model="getPageContentBlocks(locale.code)[blockIndex].title"
                    :placeholder="t('content.blockTitlePlaceholder')"
                  />
                  <RichTextEditor
                    :model-value="getPageContentBlocks(locale.code)[blockIndex].text"
                    :placeholder="t('content.startWriting')"
                    :min-height="220"
                    @update:model-value="(value: string) => updatePageBlockText(locale.code, blockIndex, value)"
                  />
                </article>

                <el-button type="primary" plain @click="addPageContentBlock(locale.code)">
                  {{ t('content.addBlock') }}
                </el-button>
              </div>
              <el-input
                v-else-if="field.type !== 'richtext'"
                v-model="form.translations[locale.code][field.key]"
                :type="isDocumentUrlField(field) ? 'text' : (field.type ?? 'text')"
                :rows="!isDocumentUrlField(field) && field.type === 'textarea' ? 4 : undefined"
              >
                <template v-if="isDocumentUrlField(field)" #append>
                  <el-button @click="triggerDocumentUpload(locale.code, field.key)">
                    {{ t('content.documentUpload') }}
                  </el-button>
                </template>
              </el-input>
              <div
                v-if="isDocumentUrlField(field)"
                class="document-link-actions"
              >
                <el-button
                  v-if="form.translations[locale.code][field.key]"
                  tag="a"
                  :href="resolveMediaUrl(String(form.translations[locale.code][field.key] ?? ''))"
                  target="_blank"
                  rel="noopener noreferrer"
                  plain
                >
                  {{ t('content.openCurrentDocument') }}
                </el-button>
                <span v-else>{{ t('content.documentMissing') }}</span>
              </div>
              <RichTextEditor
                v-else-if="field.type === 'richtext'"
                :model-value="String(form.translations[locale.code][field.key] ?? '')"
                :placeholder="t('content.fieldPlaceholder', { label: field.label })"
                :min-height="180"
                @update:model-value="(value: string) => (form.translations[locale.code][field.key] = value)"
              />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>

        <div class="drawer-actions">
          <el-button @click="drawerOpen = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="saving" @click="saveContent">
            {{ t('common.save') }}
          </el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>

<style scoped>
.content-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.toolbar-actions .el-button {
  margin-left: 0;
}

.selection-count {
  height: 32px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.media-upload-input {
  display: none;
}

.document-link-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  color: #8a93a3;
  font-size: 13px;
  flex-wrap: wrap;
}

.content-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.content-tabs,
.table-card,
.media-card {
  min-width: 0;
  max-width: 100%;
}

.table-card :deep(.el-card__body) {
  min-width: 0;
  overflow-x: auto;
}

.media-card :deep(.el-card__body) {
  min-width: 0;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  min-height: 120px;
}

.media-item {
  position: relative;
  display: grid;
  grid-template-rows: 150px auto auto;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.media-select {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.media-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8fafc 75%),
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%),
    #ffffff;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
}

.media-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.media-file-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 54px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.media-info {
  min-width: 0;
}

.media-title {
  font-weight: 700;
  color: #111827;
  overflow-wrap: anywhere;
}

.media-url {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #2563eb;
  overflow-wrap: anywhere;
}

.media-alt {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.35;
  color: #6b7280;
  overflow-wrap: anywhere;
}

.media-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.media-actions .el-button {
  margin-left: 0;
}

.media-fields {
  margin: 14px 0 18px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.media-picker {
  display: grid;
  grid-template-columns: 132px 1fr;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.media-picker-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 96px;
  overflow: hidden;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
  color: #94a3b8;
  font-size: 13px;
}

.media-picker-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.media-picker-controls {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.media-picker-controls .el-button {
  margin-left: 0;
  flex-shrink: 0;
}

.why-facts-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 18px 0;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.why-facts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.why-facts-header h3 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 1.25;
}

.why-facts-header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

.why-fact-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.why-fact-top {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.why-fact-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 150px;
  overflow: hidden;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #94a3b8;
}

.why-fact-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.why-fact-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.why-fact-controls .el-button {
  align-self: flex-start;
  margin-left: 0;
}

.why-fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.why-fact-tabs {
  min-width: 0;
}

.why-fact-actions {
  display: flex;
  justify-content: flex-end;
}

.why-fact-actions .el-button {
  margin-left: 0;
}

.row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.row-actions .el-button {
  margin-left: 0;
}

.editor-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  min-height: calc(100vh - 120px);
}

.editor-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.editor-kicker {
  margin: 0 0 4px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.editor-header h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.editor-header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.editor-page .editor-form {
  width: 100%;
  max-width: 1180px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.page-block-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.page-block-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.page-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.page-block-head strong {
  color: #111827;
}

.rich-toolbar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rich-toolbar .el-button {
  margin-left: 0;
  min-width: 38px;
  font-weight: 700;
}

.rich-preview {
  padding: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  line-height: 1.65;
}

.rich-preview :deep(h2) {
  margin: 0 0 10px;
  font-size: 24px;
  line-height: 1.2;
}

.rich-preview :deep(h3) {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.25;
}

.rich-preview :deep(p) {
  margin: 0 0 10px;
}

.rich-preview :deep(strong) {
  font-weight: 700;
}

.rich-preview :deep(em) {
  font-style: italic;
}

.rich-preview :deep(ul),
.rich-preview :deep(ol) {
  margin: 0 0 10px 22px;
}

.rich-preview :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.editor-form {
  padding-bottom: 72px;
}

.base-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.drawer-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 0 0;
  background: #ffffff;
}

@media (max-width: 720px) {
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px;
  }

  .toolbar h2 {
    font-size: 20px;
  }

  .toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .toolbar-actions .el-button {
    flex: 1;
    min-width: 120px;
    margin-left: 0;
  }

  .selection-count {
    width: 100%;
    justify-content: center;
  }

  .editor-page {
    min-height: auto;
  }

  .editor-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px;
  }

  .editor-header h2 {
    font-size: 20px;
  }

  .editor-header-actions {
    width: 100%;
    flex-direction: column-reverse;
  }

  .editor-header-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .editor-page .editor-form {
    padding: 14px;
  }

  .base-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .drawer-actions {
    flex-direction: column-reverse;
    gap: 8px;
    padding-bottom: 2px;
  }

  .drawer-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .row-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .row-actions .el-button {
    width: 100%;
  }

  .page-block-head {
    align-items: stretch;
    flex-direction: column;
  }

  .page-block-head .el-button {
    width: 100%;
    margin-left: 0;
  }

  .media-grid {
    grid-template-columns: 1fr;
  }

  .media-item {
    grid-template-rows: 180px auto auto;
  }

  .media-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .media-actions .el-button {
    width: 100%;
  }

  .media-fields {
    padding: 12px;
  }

  .media-picker {
    grid-template-columns: 1fr;
  }

  .media-picker-preview {
    width: 100%;
    height: 180px;
  }

  .media-picker-controls {
    flex-direction: column;
  }

  .media-picker-controls .el-button {
    width: 100%;
  }

  .why-facts-editor {
    padding: 12px;
  }

  .why-facts-header {
    flex-direction: column;
  }

  .why-facts-header .el-button {
    width: 100%;
    margin-left: 0;
  }

  .why-fact-top,
  .why-fact-grid {
    grid-template-columns: 1fr;
  }

  .why-fact-preview {
    width: 100%;
    height: 190px;
  }

  .why-fact-controls .el-button,
  .why-fact-actions .el-button {
    width: 100%;
  }

  .why-fact-actions {
    justify-content: stretch;
  }
}
</style>
