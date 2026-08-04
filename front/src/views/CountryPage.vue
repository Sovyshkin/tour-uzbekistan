<script setup>
import { useRoute } from 'vue-router';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppContainer from '@/components/AppContainer.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import { backgroundImageStyle, getApiLocale, getCountries, getCountry, resolveAssetUrl } from '@/api';
import { useNotifications } from '@/composables/useNotifications';

const { t, locale } = useI18n();
const route = useRoute();
const countryCode = computed(() => route.params.country || 'uzbekistan');
const countryData = ref(null);
const countryLoaded = ref(false);
const countryOptions = ref([]);
const { error: notifyError } = useNotifications();

const showScrollTop = ref(false);
const isCityModalOpen = ref(false);
const selectedCity = ref('');

const onScroll = () => {
  showScrollTop.value = window.scrollY > 400;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const openCityModal = () => {
  isCityModalOpen.value = true;
};
const closeCityModal = () => {
  isCityModalOpen.value = false;
};
const selectCity = (cityCode) => {
  selectedCity.value = cityCode;
  closeCityModal();
};

let scrollY = 0;
const lockBody = () => {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
};
const unlockBody = () => {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
};

const countries = computed(() => countryOptions.value);

watch(isCityModalOpen, (val) => {
  if (val) lockBody();
  else unlockBody();
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));

const data = computed(() => {
  return countryData.value || {
    heroImage: '',
    heroImageSettings: null,
    name: '',
    welcomeTitle: '',
    intro: '',
    sidebarTitle: '',
    cities: [],
    toc: [],
    sections: [],
  };
});

const selectedCityData = computed(() => {
  if (!selectedCity.value) {
    return null;
  }

  return data.value.cities.find((city) => city.code === selectedCity.value) || null;
});

const buildTocFromSections = (sections) =>
  sections
    .map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      title: section.title || '',
    }))
    .filter((item) => item.title.trim());

const activeIntro = computed(() => {
  return selectedCityData.value?.intro || data.value.intro;
});

const translatedSections = computed(() => {
  const citySections = selectedCityData.value?.sections;
  return Array.isArray(citySections) && citySections.length ? citySections : data.value.sections;
});

const translatedToc = computed(() => {
  const cityToc = selectedCityData.value?.toc;

  if (Array.isArray(cityToc) && cityToc.length) {
    return cityToc;
  }

  if (selectedCityData.value) {
    return buildTocFromSections(translatedSections.value);
  }

  return data.value.toc;
});

const pageTitle = computed(() => {
  return (
    selectedCityData.value?.welcomeTitle ||
    selectedCityData.value?.name ||
    `${t('countryPage.welcome_prefix')} ${data.value.name}`
  );
});

const sidebarTitle = computed(() => {
  return (
    selectedCityData.value?.sidebarTitle ||
    data.value.sidebarTitle ||
    `${t('countryPage.sidebar_title_prefix')} ${data.value.name}`
  );
});

const heroStyle = computed(() => {
  if (!countryLoaded.value) {
    return undefined;
  }

  return backgroundImageStyle(data.value.heroImage || resolveAssetUrl('/assets/icons/countryPage.webp'), data.value.heroImageSettings);
});

// Хлебные крошки (переведены)
const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.countries'), path: null },
  { label: selectedCityData.value?.name || data.value.welcomeTitle, path: null },
]);

const filters = ref({
  where: '',
  when: '',
  people: '',
  duration: '',
});

const loadCountry = async () => {
  countryLoaded.value = false;

  try {
    const payload = await getCountry(countryCode.value, getApiLocale(locale.value));
    countryData.value = {
      ...payload,
      heroImage: resolveAssetUrl(payload.heroImage),
      heroImageSettings: payload.heroImageSettings,
      flagImage: resolveAssetUrl(payload.flagImage),
    };
    selectedCity.value = '';
  } catch (error) {
    countryData.value = null;
    notifyError(error.message || t('notifications.loadCountryFailed'), t('notifications.countryUnavailable'));
  } finally {
    countryLoaded.value = true;
  }
};

const loadCountryOptions = async () => {
  try {
    const data = await getCountries(getApiLocale(locale.value));
    countryOptions.value = data.map((country) => ({
      id: country.slug,
      label: country.name,
      icon: resolveAssetUrl(country.flagImage),
    }));
  } catch {
    countryOptions.value = [];
  }
};

watch(() => locale.value, async () => {
  await loadCountryOptions();
  await loadCountry();
});
watch(countryCode, loadCountry);

onMounted(() => {
  window.addEventListener('scroll', onScroll);
  loadCountryOptions();
  loadCountry();
});
</script>

<template>
  <div class="page-wrapper">
    <!-- Hero -->
    <section class="relative">
      <div class="hero-section">
        <div
          class="hero-image"
          :style="heroStyle"
        />
      </div>
    </section>

    <AppContainer>
      <!-- Breadcrumbs (переведены) -->
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

      <!-- Мобильная поисковая панель (переведена) -->
      <div class="lg:hidden flex flex-col gap-2 sm:gap-3 mb-[35px]">
        <CustomSelect
          v-model="filters.where"
          :placeholder="t('countryPage.search_where')"
          :options="countries"
          type="list"
          class="w-full"
          :border="false"
        />
        <CustomSelect
          v-model="filters.when"
          :placeholder="t('countryPage.search_when')"
          type="calendar"
          class="w-full"
          :border="false"
        />
        <div class="flex gap-2 sm:gap-3">
          <CustomSelect
            v-model="filters.people"
            :placeholder="t('countryPage.search_people')"
            type="counter"
            :min="1"
            :max="20"
            :unit="t('countryPage.search_people_unit')"
            class="flex-1"
            :border="false"
          />
          <CustomSelect
            v-model="filters.duration"
            :placeholder="t('countryPage.search_days')"
            type="counter"
            :min="1"
            :max="30"
            :unit="t('countryPage.search_days_unit')"
            class="flex-1"
            :border="false"
          />
        </div>
        <button
          class="bg-[#a6a6aa] text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-[8px] text-[13px] sm:text-[14px] font-medium hover:bg-[#285aff] transition cursor-pointer w-full"
        >
          {{ t('countryPage.search_button') }}
        </button>
      </div>

      <!-- Десктопная поисковая панель (переведена) -->
      <div
        class="hidden lg:flex bg-white rounded-[12px] border px-[0.5px] mb-[35px]"
      >
        <CustomSelect
          v-model="filters.where"
          :placeholder="t('countryPage.search_where')"
          :options="countries"
          type="list"
        />
        <CustomSelect
          v-model="filters.when"
          :placeholder="t('countryPage.search_when')"
          type="calendar"
        />
        <CustomSelect
          v-model="filters.people"
          :placeholder="t('countryPage.search_people_full')"
          type="counter"
          :min="1"
          :max="20"
          :unit="t('countryPage.search_people_unit')"
        />
        <CustomSelect
          v-model="filters.duration"
          :placeholder="t('countryPage.search_duration')"
          type="counter"
          :min="1"
          :max="30"
          :unit="t('countryPage.search_days_unit')"
        />
        <button
          class="bg-[#a6a6aa] text-white px-8 py-3 text-[14px] font-medium hover:bg-[#285aff] transition cursor-pointer rounded-r-[10px] flex-shrink-0"
        >
          {{ t('countryPage.search_button') }}
        </button>
      </div>

      <!-- Контент + сайдбар -->
      <div class="flex flex-col lg:flex-row gap-[30px] lg:gap-[40px]">
        <!-- Левая колонка -->
        <div class="flex-1 min-w-0">
          <h1
            class="text-[28px] sm:text-[36px] lg:text-[42px] font-normal text-black mb-[20px] leading-tight"
          >
            {{ pageTitle }}
          </h1>

          <div class="lg:hidden mb-[15px]">
            <button
              @click="openCityModal"
              class="w-full flex items-center justify-between px-4 py-3 rounded-[10px] border border-[#285aff] bg-white text-left"
            >
              <span class="text-[14px] text-[#285aff]">
                {{
                  selectedCity
                    ? data.cities.find((c) => c.code === selectedCity)?.name
                    : `${t('countryPage.modal_title_prefix')} ${data.name}`
                }}
              </span>
              <svg
                class="w-5 h-5 text-[#285aff] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>

          <div
            class="text-[13px] sm:text-[14px] text-[#333] leading-[1.7] mb-[30px]"
            v-html="activeIntro"
          ></div>

          <hr class="border-[#e5e5e6] mb-[30px]" />

          <!-- Содержание (переведён заголовок) -->
          <div class="mb-[40px]">
            <h2
              class="text-[20px] sm:text-[24px] font-medium text-black mb-[20px]"
            >
              {{ t('countryPage.content_title') }}
            </h2>
            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-x-[30px] gap-y-[10px]"
            >
              <button
                v-for="(item, idx) in translatedToc"
                :key="item.id"
                @click="scrollToSection(item.id)"
                class="text-left text-[14px] text-[#333] hover:text-[#285aff] transition cursor-pointer"
              >
                {{ idx + 1 }}. {{ item.title }}
              </button>
            </div>
          </div>

          <hr class="border-[#e5e5e6] mb-[40px]" />

          <!-- Секции (контент НЕ переведён) -->
          <div class="flex flex-col gap-[40px] lg:gap-[50px] pb-[60px]">
            <section
              v-for="section in translatedSections"
              :key="section.id"
              :id="section.id"
            >
              <h2
                class="text-[20px] sm:text-[24px] lg:text-[28px] font-medium text-black mb-[15px]"
              >
                {{ section.title }}
              </h2>
              <div
                class="country-section-text text-[13px] sm:text-[14px] text-[#333] leading-[1.7]"
                v-html="section.text"
              ></div>
            </section>
          </div>
        </div>

        <!-- Сайдбар (переведён заголовок) -->
        <aside
          class="w-full lg:w-[280px] flex-shrink-0 lg:sticky lg:top-[20px] self-start hidden lg:flex"
        >
          <div class="border border-[#e5e5e6] rounded-[15px] p-5 bg-white">
            <h3
              class="text-[14px] font-medium text-black mb-[15px] leading-snug"
            >
              {{ sidebarTitle }}
            </h3>
            <div class="flex flex-col gap-[10px]">
              <label
                v-for="city in data.cities"
                :key="city.code"
                class="flex items-center gap-[10px] cursor-pointer group"
              >
                <input
                  type="checkbox"
                  :checked="selectedCity === city.code"
                  @change="selectCity(city.code)"
                  class="w-[18px] h-[18px] accent-[#285aff] cursor-pointer"
                />
                <span
                  class="text-[13px] text-[#333] group-hover:text-[#285aff] transition"
                  >{{ city.name }}</span
                >
              </label>
            </div>
          </div>
        </aside>
      </div>
    </AppContainer>

    <!-- МОБИЛЬНАЯ МОДАЛКА ВЫБОРА ГОРОДА (переведена) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isCityModalOpen"
          class="fixed inset-0 bg-black/60 z-40 lg:hidden"
          @click="closeCityModal"
        ></div>
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="isCityModalOpen"
          class="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-50 lg:hidden max-h-[85vh] overflow-y-auto"
        >
          <div
            class="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-[#e6e6e7] flex items-center justify-between rounded-t-[20px]"
          >
            <h3 class="text-[18px] font-medium pr-4">
              {{ t('countryPage.modal_title_prefix') }} {{ data.name }}
            </h3>
            <button
              @click="closeCityModal"
              class="text-[14px] text-[#285aff] font-medium flex-shrink-0"
            >
              {{ t('countryPage.close') }}
            </button>
          </div>

          <div class="py-2">
            <button
              v-for="city in data.cities"
              :key="city.code"
              @click="selectCity(city.code)"
              class="w-full text-left px-5 py-3.5 text-[16px] transition border-b border-[#f0f0f0] last:border-0 flex items-center justify-between"
              :class="
                selectedCity === city.code
                  ? 'text-[#285aff] font-medium bg-[#f8f9ff]'
                  : 'text-[#333] hover:bg-[#f5f5f5]'
              "
            >
              <span>{{ city.name }}</span>
              <svg
                v-if="selectedCity === city.code"
                class="w-5 h-5 text-[#285aff] flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page-wrapper {
  position: relative;
}

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

.country-section-text :deep(p) {
  margin: 0 0 12px;
}

.country-section-text :deep(p:last-child) {
  margin-bottom: 0;
}

.country-section-text :deep(ul),
.country-section-text :deep(ol) {
  margin: 10px 0 12px 20px;
  padding: 0;
}

.country-section-text :deep(ul) {
  list-style: disc;
}

.country-section-text :deep(ol) {
  list-style: decimal;
}

.country-section-text :deep(a) {
  color: #285aff;
  text-decoration: underline;
}

/* Анимации модалки */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Скрыть scrollbar в модалке */
.overflow-y-auto::-webkit-scrollbar {
  display: none;
}
.overflow-y-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
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

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
}
</style>
