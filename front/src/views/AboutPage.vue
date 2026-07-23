<script setup>
import AppContainer from '@/components/AppContainer.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { getApiLocale, getPage, getSiteSettings, resolveAssetUrl, submitLead } from '@/api';
import { useNotifications } from '@/composables/useNotifications';
import { validateContactFormFields } from '@/utils/formValidation';

const { t, tm, locale } = useI18n();
const route = useRoute();
const { success: notifySuccess, error: notifyError } = useNotifications();
const page = ref(null);
const settings = ref({});

// Хлебные крошки
const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.about'), path: null },
]);

const form = ref({
  name: '',
  phone: '',
  email: '',
});
const formErrors = ref({});

const clearFieldError = (field) => {
  if (!formErrors.value[field]) {
    return;
  }

  const nextErrors = { ...formErrors.value };
  delete nextErrors[field];
  formErrors.value = nextErrors;
};

const contentBlocks = computed(() => {
  if (Array.isArray(page.value?.content) && page.value.content.length) {
    return page.value.content;
  }

  const fallback = tm('about.content');
  return Array.isArray(fallback) ? fallback : [];
});

const heroImage = computed(() =>
  resolveAssetUrl(settings.value['pages.about.hero_image'] || '/assets/icons/about-us.webp'),
);

const loadPage = async () => {
  try {
    const apiLocale = getApiLocale(locale.value);
    page.value = await getPage('about', apiLocale);
    settings.value = await getSiteSettings(apiLocale).catch(() => ({}));
  } catch {
    page.value = null;
  }
};

watch(() => locale.value, loadPage);
onMounted(loadPage);

const sendLead = async () => {
  const validationErrors = validateContactFormFields(form.value);
  formErrors.value = validationErrors;

  if (Object.keys(validationErrors).length) {
    notifyError(Object.values(validationErrors)[0], t('notifications.validationTitle'));
    return;
  }

  try {
    await submitLead({
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone || undefined,
      message: 'Lead from about page',
      sourcePage: route.fullPath,
      language: getApiLocale(locale.value),
    });

    form.value = {
      name: '',
      phone: '',
      email: '',
    };
    formErrors.value = {};

    notifySuccess(t('notifications.messageSent'));
  } catch (error) {
    notifyError(error.message || t('notifications.sendMessageFailed'), t('notifications.messageNotSent'));
  }
};

</script>

<template>
  <div class="page-wrapper">
    <!-- Hero -->
    <section class="relative">
      <div class="hero-section">
        <div class="hero-image" :style="{ backgroundImage: `url(${heroImage})` }"></div>
      </div>

      <AppContainer>
        <!-- Карточка с формой поверх hero -->
        <div class="wrapper-card contact-card border mb-[30px]">
          <div class="card-item w-full">
            <h3 class="card-title">
              {{ $t('about.contact_title') }}
            </h3>
            <form class="contact-form" @submit.prevent="sendLead">
              <div class="form-row">
                <div class="form-field">
                  <input
                    v-model="form.name"
                    type="text"
                    :placeholder="$t('about.name')"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.name }"
                    @input="clearFieldError('name')"
                  />
                  <p v-if="formErrors.name" class="form-error-text">{{ formErrors.name }}</p>
                </div>
                <div class="form-field">
                  <input
                    v-model="form.phone"
                    type="tel"
                    :placeholder="$t('about.phone')"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.phone }"
                    @input="clearFieldError('phone')"
                  />
                  <p v-if="formErrors.phone" class="form-error-text">{{ formErrors.phone }}</p>
                </div>
                <div class="form-field">
                  <input
                    v-model="form.email"
                    type="email"
                    :placeholder="$t('about.email')"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.email }"
                    @input="clearFieldError('email')"
                  />
                  <p v-if="formErrors.email" class="form-error-text">{{ formErrors.email }}</p>
                </div>
                <button type="submit" class="send-btn">
                  {{ $t('about.send') }}
                </button>
              </div>
              <p class="consent-text">
                {{ $t('about.consent') }}
              </p>
            </form>
          </div>
        </div>

        <!-- Breadcrumbs -->
        <nav
          class="mb-[15px] sm:mb-[20px] mt-[30px] hidden lg:flex"
          aria-label="Breadcrumb"
        >
          <ol
            class="flex items-center gap-2 text-[11px] sm:text-[12px] lg:text-[14px] text-[#000] flex-wrap"
          >
            <li
              v-for="(crumb, i) in breadcrumbs"
              :key="i"
              class="flex items-center gap-2"
            >
              <router-link
                v-if="crumb.path"
                :to="crumb.path"
                class="hover:text-[#285aff] transition"
              >
                {{ crumb.label }}
              </router-link>
              <span v-else class="text-[#888]">{{ crumb.label }}</span>
              <span v-if="i < breadcrumbs.length - 1" class="text-[#000]">
                <svg
                  class="w-3 h-3 transition-transform -rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </li>
          </ol>
        </nav>
        <!-- Контент -->
        <div class="content-wrapper">
          <h1 class="page-title">{{ page?.title || $t('about.page_title') }}</h1>

          <div class="text-blocks">
            <p class="text-block" v-for="(item, index) in contentBlocks" v-html="item.text" :key="index">
            </p>
          </div>
        </div>
      </AppContainer>
    </section>
  </div>
</template>

<style scoped>
.text-block :deep(strong) {
  font-weight: 700;
}
.page-wrapper {
  position: relative;
}

/* Hero */
.hero-section {
  position: relative;
  height: 458px;
  max-height: 458px;
  width: 100%;
  overflow: hidden;
}

.hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 458px;
  max-height: 458px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  z-index: 0;
}

/* Карточка с формой */
.wrapper-card {
  position: relative;
  margin-top: -100px;
  background-color: #fff;
  border-radius: 15px;
  display: flex;
  justify-content: space-between;
  width: 100%;
  z-index: 3;
}

.card-item {
  flex: 1;
  padding: 23px;
}

.card-title {
  font-size: 30px;
  font-weight: 500;
  color: #000;
  margin-bottom: 20px;
}

/* Форма */
.contact-form {
  width: 100%;
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.form-field {
  flex: 1;
  min-width: 140px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #000;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #285aff;
}

.form-input-error {
  border-color: #ff00cc;
  box-shadow: 0 0 0 1px #ff00cc;
}

.form-error-text {
  margin-top: 6px;
  font-size: 12px;
  color: #cc008f;
}

.send-btn {
  background-color: #ff00cc;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 32px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
  min-width: 120px;
}

.send-btn:hover {
  opacity: 0.9;
}

.consent-text {
  font-size: 12px;
  color: #000;
  margin-top: 10px;
}

/* Контент */
.content-wrapper {
  padding-bottom: 80px;
}

.page-title {
  font-size: 54px;
  font-weight: 400;
  color: #000;
  margin-bottom: 60px;
}

.text-blocks {
  display: flex;
  flex-direction: column;
  gap: 50px;
}

.text-block {
  font-size: 18px;
  line-height: 1.6;
  color: #000;
}

/* Адаптив */
@media (max-width: 768px) {
  .hero-section,
  .hero-image {
    height: 358px;
  }
}

@media (max-width: 1200px) {
}

@media (max-width: 768px) {
}

@media (max-width: 992px) {
  .hero-section {
    height: 458px;
  }
  .hero-image {
    height: 458px;
  }
}

@media (max-width: 768px) {
  .hero-section {
    height: 358px;
  }
  .hero-image {
    height: 358px;
    background-position: center center;
  }
}

@media (min-width: 1921px) {
  .hero-section {
    height: 458px;
  }
  .hero-image {
    height: 458px;
  }
}
</style>
