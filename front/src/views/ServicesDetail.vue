<script setup>
import { useRoute } from 'vue-router';
import { ref, computed, onMounted, watch } from 'vue';
import AppContainer from '@/components/AppContainer.vue';
import { useI18n } from 'vue-i18n';
import { backgroundImageStyle, getApiLocale, getService, resolveAssetUrl, submitLead } from '@/api';
import { useNotifications } from '@/composables/useNotifications';
import { validateContactFormFields } from '@/utils/formValidation';
const { t, locale } = useI18n();
const route = useRoute();
const newsId = route.params.id;
const { success: notifySuccess, error: notifyError } = useNotifications();

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

const news = ref({
  id: null,
  heroImage: '/assets/icons/dmc-detail.webp',
  title: '',
  subtitle: '',
  shortDescription: '',
  content: [],
});

const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.services'), path: '/services' },
  { label: news.value.title, path: null },
]);

const loadService = async () => {
  try {
    const payload = await getService(newsId, getApiLocale(locale.value));
    news.value = {
      ...payload,
      subtitle: payload.subtitle || payload.shortDescription || '',
      shortDescription: payload.shortDescription || payload.subtitle || '',
      heroImage: resolveAssetUrl(payload.heroImage),
      previewImage: resolveAssetUrl(payload.previewImage),
      previewImageSettings: payload.previewImageSettings,
    };
  } catch (error) {
    notifyError(error.message || t('notifications.loadServiceFailed'), t('notifications.serviceUnavailable'));
  }
};

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
      message: `Lead from service page: ${news.value.title}`,
      sourcePage: route.fullPath,
      sourcePageTitle: document.title,
      language: getApiLocale(locale.value),
      serviceId: news.value.id || undefined,
    });
    form.value = { name: '', phone: '', email: '' };
    formErrors.value = {};
    notifySuccess(t('notifications.messageSent'));
  } catch (error) {
    notifyError(error.message || t('notifications.sendMessageFailed'), t('notifications.messageNotSent'));
  }
};

watch(() => locale.value, loadService);
onMounted(loadService);
</script>

<template>
  <div class="page-wrapper">
    <!-- Hero -->
    <section class="relative">
      <div class="hero-section">
        <div
          class="hero-image"
          :style="backgroundImageStyle(news.heroImage || news.previewImage, news.previewImageSettings)"
        />
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
          <h1 class="page-title">{{ news.title }}</h1>
          <p v-if="news.subtitle" class="page-subtitle">{{ news.subtitle }}</p>
          <div class="text-blocks">
            <p
              v-for="(paragraph, idx) in news.content"
              :key="idx"
              class="text-block"
            >
              {{ paragraph }}
            </p>
          </div>
        </div>
      </AppContainer>
    </section>
  </div>
</template>

<style scoped>
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
  margin-bottom: 40px;
}

.page-subtitle {
  max-width: 900px;
  margin: -20px 0 34px;
  color: #4f4f55;
  font-size: 24px;
  line-height: 1.35;
}

.text-blocks {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
}

.text-block {
  font-size: 16px;
  line-height: 1.6;
  color: #000;
  white-space: pre-line;
}

/* Адаптив */
@media (max-width: 768px) {
  .hero-section,
  .hero-image {
    height: 358px;
  }

  .wrapper-card {
    margin-top: -60px;
  }

  .card-item {
    padding: 15px;
  }

  .card-title {
    font-size: 20px;
  }

  .form-row {
    flex-direction: column;
    align-items: stretch;
  }

  .form-input {
    width: 100%;
  }

  .send-btn {
    width: 100%;
  }

  .page-title {
    font-size: 32px;
    margin-bottom: 24px;
  }

  .page-subtitle {
    margin: -8px 0 24px;
    font-size: 18px;
  }

  .text-block {
    font-size: 14px;
  }
}

@media (min-width: 1440px) {
  .hero-section,
  .hero-image {
    height: 458px;
  }
}
</style>
