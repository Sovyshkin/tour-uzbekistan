<script setup>
import AppContainer from '@/components/AppContainer.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { getApiLocale, getPage } from '@/api';

const { t, locale } = useI18n();
const route = useRoute();

const page = ref(null);
const isLoading = ref(false);

const currentSlug = computed(() => route.meta.pageSlug || route.path.replace(/^\/+/, '') || 'faq');

const fallbackPages = computed(() => ({
  faq: {
    title: {
      ru: 'Вопросы и ответы',
      en: 'Questions and answers',
      uz: 'Savol-javoblar',
    },
    subtitle: {
      ru: 'Ответы на частые вопросы о турах, заявках и работе с Centrum Holidays DMC.',
      en: 'Answers to common questions about tours, requests and cooperation with Centrum Holidays DMC.',
      uz: 'Turlar, arizalar va Centrum Holidays DMC bilan ishlash bo‘yicha tez-tez so‘raladigan savollar.',
    },
    content: {
      ru: [
        {
          title: 'Как отправить заявку?',
          text: 'Выберите интересующий тур или услугу и отправьте форму обратной связи. Менеджер свяжется с вами для уточнения деталей.',
        },
        {
          title: 'Как агент может забронировать тур?',
          text: 'Агенту нужно войти в личный кабинет. После авторизации на странице тура появится доступ к бронированию и истории заявок.',
        },
      ],
      en: [
        {
          title: 'How do I send a request?',
          text: 'Choose a tour or service and submit the contact form. A manager will contact you to clarify the details.',
        },
        {
          title: 'How can an agent book a tour?',
          text: 'The agent should sign in to the account. After authorization, tour booking and request history become available.',
        },
      ],
      uz: [
        {
          title: 'Qanday qilib ariza yuboriladi?',
          text: 'Kerakli tur yoki xizmatni tanlang va aloqa formasini yuboring. Menejer tafsilotlarni aniqlashtirish uchun siz bilan bog‘lanadi.',
        },
        {
          title: 'Agent turni qanday bron qiladi?',
          text: 'Agent shaxsiy kabinetga kirishi kerak. Avtorizatsiyadan so‘ng tur sahifasida bron qilish va arizalar tarixi ochiladi.',
        },
      ],
    },
  },
  'privacy-policy': {
    title: {
      ru: 'Политика конфиденциальности',
      en: 'Privacy Policy',
      uz: 'Maxfiylik siyosati',
    },
    subtitle: {
      ru: 'Информация о сборе, хранении и обработке персональных данных.',
      en: 'Information about collection, storage and processing of personal data.',
      uz: 'Shaxsiy ma’lumotlarni yig‘ish, saqlash va qayta ishlash haqida ma’lumot.',
    },
    content: {
      ru: [
        {
          text: 'Centrum Holidays DMC обрабатывает персональные данные пользователей только для обработки заявок, бронирований, обратной связи и выполнения договорных обязательств.',
        },
        {
          text: 'Пользователь может запросить уточнение, изменение или удаление своих персональных данных, направив обращение по контактам, указанным на сайте.',
        },
      ],
      en: [
        {
          text: 'Centrum Holidays DMC processes personal data only to handle requests, bookings, feedback and contractual obligations.',
        },
        {
          text: 'A user may request correction, update or deletion of personal data using the contacts provided on the website.',
        },
      ],
      uz: [
        {
          text: 'Centrum Holidays DMC shaxsiy ma’lumotlarni faqat arizalar, bronlar, fikr-mulohazalar va shartnoma majburiyatlarini bajarish uchun qayta ishlaydi.',
        },
        {
          text: 'Foydalanuvchi saytda ko‘rsatilgan aloqa ma’lumotlari orqali shaxsiy ma’lumotlarini aniqlashtirish, o‘zgartirish yoki o‘chirishni so‘rashi mumkin.',
        },
      ],
    },
  },
  terms: {
    title: {
      ru: 'Пользовательское соглашение',
      en: 'User Agreement',
      uz: 'Foydalanish shartnomasi',
    },
    subtitle: {
      ru: 'Основные условия использования сайта и отправки заявок.',
      en: 'Main terms of using the website and sending requests.',
      uz: 'Saytdan foydalanish va arizalar yuborishning asosiy shartlari.',
    },
    content: {
      ru: [
        {
          text: 'Используя сайт Centrum Holidays DMC, пользователь подтверждает согласие с условиями сервиса и корректность передаваемых данных.',
        },
        {
          text: 'Информация на сайте носит справочный характер. Финальные условия тура, стоимость и состав услуг подтверждаются менеджером.',
        },
      ],
      en: [
        {
          text: 'By using the Centrum Holidays DMC website, the user agrees to the service terms and confirms that submitted data is accurate.',
        },
        {
          text: 'Information on the website is for reference. Final tour terms, price and included services are confirmed by a manager.',
        },
      ],
      uz: [
        {
          text: 'Centrum Holidays DMC saytidan foydalanish orqali foydalanuvchi xizmat shartlariga roziligini va yuborilgan ma’lumotlar to‘g‘riligini tasdiqlaydi.',
        },
        {
          text: 'Saytdagi ma’lumotlar ma’lumot uchun berilgan. Turning yakuniy shartlari, narxi va xizmatlar tarkibi menejer tomonidan tasdiqlanadi.',
        },
      ],
    },
  },
}));

const apiLocale = computed(() => getApiLocale(locale.value));
const fallbackPage = computed(() => fallbackPages.value[currentSlug.value] || fallbackPages.value.faq);

const localizedFallback = (key) => {
  const value = fallbackPage.value?.[key];
  return value?.[apiLocale.value] || value?.en || value?.ru || '';
};

const pageTitle = computed(() => page.value?.title || localizedFallback('title'));
const pageSubtitle = computed(() => page.value?.heroSubtitle || localizedFallback('subtitle'));

const contentBlocks = computed(() => {
  if (Array.isArray(page.value?.content) && page.value.content.length) {
    return page.value.content;
  }

  return fallbackPage.value?.content?.[apiLocale.value] || fallbackPage.value?.content?.en || [];
});

const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: pageTitle.value, path: null },
]);

const blockTitle = (block) => (typeof block === 'object' && block ? block.title : '');
const blockHtml = (block) => {
  if (typeof block === 'string') {
    return block;
  }

  if (!block || typeof block !== 'object') {
    return '';
  }

  return block.text || block.html || block.content || '';
};

const loadPage = async () => {
  isLoading.value = true;

  try {
    page.value = await getPage(currentSlug.value, apiLocale.value);
  } catch {
    page.value = null;
  } finally {
    isLoading.value = false;
  }
};

watch([() => locale.value, currentSlug], loadPage);
onMounted(loadPage);
</script>

<template>
  <main class="generic-page">
    <AppContainer>
      <nav class="breadcrumbs" aria-label="Breadcrumbs">
        <template v-for="(crumb, index) in breadcrumbs" :key="`${crumb.label}-${index}`">
          <RouterLink v-if="crumb.path" :to="crumb.path" class="breadcrumb-link">
            {{ crumb.label }}
          </RouterLink>
          <span v-else class="breadcrumb-current">{{ crumb.label }}</span>
          <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">›</span>
        </template>
      </nav>

      <section class="page-heading">
        <p v-if="isLoading" class="loading-text">Loading...</p>
        <h1>{{ pageTitle }}</h1>
        <p v-if="pageSubtitle" class="page-subtitle">{{ pageSubtitle }}</p>
      </section>

      <section class="page-content">
        <article v-for="(block, index) in contentBlocks" :key="index" class="content-block">
          <h2 v-if="blockTitle(block)">{{ blockTitle(block) }}</h2>
          <div v-html="blockHtml(block)"></div>
        </article>
      </section>
    </AppContainer>
  </main>
</template>

<style scoped>
.generic-page {
  padding: 72px 0 96px;
  background: #fff;
}

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 36px;
  font-size: 16px;
}

.breadcrumb-link {
  color: #111;
  text-decoration: none;
}

.breadcrumb-current {
  color: #969ba3;
}

.breadcrumb-separator {
  color: #111;
}

.page-heading {
  max-width: 1120px;
  margin-bottom: 42px;
}

.loading-text {
  margin-bottom: 10px;
  color: #969ba3;
  font-size: 15px;
}

.page-heading h1 {
  margin: 0;
  font-size: clamp(42px, 6vw, 84px);
  line-height: 0.98;
  font-weight: 400;
  color: #000;
}

.page-subtitle {
  max-width: 980px;
  margin: 24px 0 0;
  font-size: clamp(20px, 2.1vw, 30px);
  line-height: 1.35;
  color: #333;
}

.page-content {
  max-width: 1180px;
  display: grid;
  gap: 30px;
}

.content-block {
  padding-top: 30px;
  border-top: 1px solid #d8d8d8;
  font-size: clamp(18px, 1.6vw, 24px);
  line-height: 1.55;
  color: #111;
}

.content-block h2 {
  margin: 0 0 14px;
  font-size: clamp(26px, 3vw, 42px);
  line-height: 1.08;
  font-weight: 600;
}

.content-block :deep(p) {
  margin: 0 0 18px;
}

.content-block :deep(p:last-child) {
  margin-bottom: 0;
}

.content-block :deep(a) {
  color: #285aff;
  text-decoration: underline;
}

.content-block :deep(ul),
.content-block :deep(ol) {
  margin: 18px 0;
  padding-left: 28px;
}

@media (max-width: 768px) {
  .generic-page {
    padding: 42px 0 64px;
  }

  .breadcrumbs {
    margin-bottom: 24px;
    font-size: 14px;
  }

  .page-heading {
    margin-bottom: 32px;
  }

  .content-block {
    padding-top: 24px;
  }
}
</style>
