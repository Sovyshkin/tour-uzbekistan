<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppContainer from '@/components/AppContainer.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import Carousel from '@/components/Carousel.vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { createBooking, formatBackendDate, getApiLocale, getCountries, getTour, isAuthenticated } from '@/api';
import { useNotifications } from '@/composables/useNotifications';
import { validateBookingFormFields } from '@/utils/formValidation';
const { t, locale } = useI18n();
const { error: notifyError } = useNotifications();

// ─── Хлебные крошки ───
const route = useRoute();
const router = useRouter();
// Получаем страну из query-параметра
const selectedCountry = computed(() => route.query.country || null);
const tour = ref({
  id: null,
  title: '',
  subtitle: '',
  route: '',
  mainImage: '/assets/icons/card1.png',
  gallery: [],
  description: '',
  detailsInfo: '',
  routesInfo: '',
  reviewsInfo: '',
  countriesInfo: '',
  duration: '-',
  transportInfo: '',
  transport: '-',
  tourists: '-',
  hotels: '-',
  comfort: '-',
  mapImage: '/assets/icons/map.png',
  country: null,
  minGroupSize: null,
  maxGroupSize: null,
  priceFrom: null,
  currency: null,
});

// Хлебные крошки с учётом страны
const breadcrumbs = computed(() => {
  const crumbs = [{ label: t('breadcrumbs.main'), path: '/' }];
  const countryLabel = tour.value.country || selectedCountry.value;

  if (countryLabel) {
    crumbs.push({
      label: countryLabel,
      path: null,
    });
  }

  crumbs.push({ label: `${tour.value.title} ${tour.value.subtitle}`.trim(), path: null });

  return crumbs;
});

// ─── Поисковая панель (как на странице туров) ───
const where = ref(null);
const when = ref('');
const people = ref(2);
const duration = ref(7);

const isModalOpen = ref(false);
const modalStep = ref(1); // 1 - форма, 2 - успех

const isMobileFilterOpen = ref(false);
const openMobileFilter = () => {
  isMobileFilterOpen.value = true;
};
const closeMobileFilter = () => {
  isMobileFilterOpen.value = false;
};

// Данные формы
const formData = ref({
  sex: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  email: '',
  idCard: '',
  nationality: '',
  documentSeries: '',
  documentNumber: '',
  issuedDate: '',
  validUntil: '',
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

const openModal = () => {
  if (!isAuthenticated()) {
    router.push({
      name: 'home',
      query: {
        auth: 'login',
        reason: 'unauthorized',
        redirect: route.fullPath,
      },
    });
    return;
  }

  formErrors.value = {};
  isModalOpen.value = true;
  modalStep.value = 1;
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  isModalOpen.value = false;
  formErrors.value = {};
  document.body.style.overflow = '';
};

const submitForm = async () => {
  if (!isAuthenticated()) {
    closeModal();
    router.push({
      name: 'home',
      query: {
        auth: 'login',
        reason: 'unauthorized',
        redirect: route.fullPath,
      },
    });
    return;
  }

  const validationErrors = validateBookingFormFields(formData.value);
  formErrors.value = validationErrors;

  if (Object.keys(validationErrors).length) {
    notifyError(Object.values(validationErrors)[0], t('notifications.validationTitle'));
    return;
  }

  try {
    await createBooking({
      tourId: tour.value.id,
      locale: getApiLocale(locale.value),
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email,
      phone: formData.value.phone || undefined,
      sex: formData.value.sex || undefined,
      birthDate: formData.value.birthDate || undefined,
      nationality: formData.value.nationality || undefined,
      documentType: formData.value.idCard || undefined,
      documentSeries: formData.value.documentSeries || undefined,
      documentNumber: formData.value.documentNumber || undefined,
      documentIssuedAt: formData.value.issuedDate || undefined,
      documentValidUntil: formData.value.validUntil || undefined,
      sourcePage: route.fullPath,
      groupSize: people.value || undefined,
    });
    formErrors.value = {};
    modalStep.value = 2;
  } catch (error) {
    notifyError(error.message || t('notifications.createBookingFailed'), t('notifications.bookingFailed'));
  }
};

const countries = ref([]);

const loadCountries = async () => {
  try {
    const data = await getCountries(getApiLocale(locale.value));
    countries.value = data.map((country) => ({
      id: country.slug,
      label: country.name,
      icon: country.flagImage,
    }));
  } catch {
    countries.value = [];
  }
};

// ─── Данные тура ───
const legacyTour = {
  title: 'Тур "Выходные в Узбекистане"',
  subtitle: '(3 дня / 2 ночи)',
  mainImage: '/assets/icons/card1.png',
  gallery: [
    '/assets/icons/card2.png',
    '/assets/icons/card3.png',
    '/assets/icons/card4.png',
    '/assets/icons/card5.png',
  ],
  description:
    "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem ipsum. It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy.",
  duration: '3 дня',
  transport: 'Поезд, автобус',
  tourists: 'от 2 до 16',
  hotels: '2 ночи',
  comfort: '3, 4 звезды',
  mapImage: '/assets/icons/map.png',
};

const activeImage = ref('/assets/icons/card1.png');
const activeIndex = ref(0);

// Функция выбора фото
const allImages = computed(() => {
  return [tour.value.mainImage, ...(tour.value.gallery || [])].filter(Boolean);
});

const currentIndex = ref(0);
const currentImage = computed(() => allImages.value[currentIndex.value]);

// Навигация
const nextImage = () => {
  if (currentIndex.value < allImages.value.length - 1) {
    currentIndex.value++;
  } else {
    currentIndex.value = 0; // зацикливание
  }
};

const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  } else {
    currentIndex.value = allImages.value.length - 1; // зацикливание
  }
};

// Выбор фото через миниатюру
const selectImage = (index) => {
  currentIndex.value = index;
};

// ─── Дни программы ───
const days = ref([]);
const descriptionsVisible = ref(true);

const toggleDay = (id) => {
  const day = days.value.find((d) => d.id === id);
  if (day) day.expanded = !day.expanded;
};

const toggleDescriptions = () => {
  descriptionsVisible.value = !descriptionsVisible.value;
  days.value = days.value.map((day) => ({
    ...day,
    expanded: descriptionsVisible.value,
  }));
};

// ─── Что включено / не включено ───
const included = ref([]);
const notIncluded = ref([]);

// ─── Другие даты ───
const otherDates = computed(() =>
  tour.value.priceFrom
    ? [
        {
          date: formatBackendDate(new Date().toISOString(), locale.value),
          price: `${tour.value.priceFrom}${tour.value.currency ? ` ${tour.value.currency}` : ''}`,
        },
      ]
    : [],
);

// ─── Табы ───
const activeTab = ref('details');
const tabs = computed(() => [
  { id: 'details', label: t('openCard.tab_details') },
  { id: 'route', label: t('openCard.tab_route') },
  { id: 'reviews', label: t('openCard.tab_reviews') },
  { id: 'transport', label: t('openCard.tab_transport') },
  { id: 'countries', label: t('openCard.tab_countries') },
]);

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();
const hasContent = (value) => stripHtml(value).length > 0;

const tabContent = computed(() => ({
  details: tour.value.detailsInfo || tour.value.description,
  route: tour.value.routesInfo || tour.value.route,
  reviews: tour.value.reviewsInfo,
  transport: tour.value.transportInfo || tour.value.transport,
  countries: tour.value.countriesInfo,
}));

const activeTabContent = computed(() => tabContent.value[activeTab.value] || '');

const loadTour = async () => {
  try {
    const data = await getTour(route.params.id, getApiLocale(locale.value));
    tour.value = {
      id: data.id,
      title: data.title,
      subtitle: `(${data.durationDays} ${t('openCard.days')} / ${data.durationNights} ${t('openCard.nights', data.durationNights)})`,
      mainImage: data.mainImage || data.heroImage || data.images?.[0]?.imageUrl || '/assets/icons/card1.png',
      gallery: (data.images || []).map((image) => image.imageUrl).filter(Boolean),
      route: data.route,
      description: data.description,
      detailsInfo: data.detailsInfo || '',
      routesInfo: data.routesInfo || '',
      reviewsInfo: data.reviewsInfo || '',
      countriesInfo: data.countriesInfo || '',
      duration: `${data.durationDays} ${t('openCard.days')} / ${data.durationNights} ${t('openCard.nights', data.durationNights)}`,
      transportInfo: data.transportInfo || '',
      transport: data.transportInfo || '-',
      tourists:
        data.minGroupSize && data.maxGroupSize
          ? `${data.minGroupSize}-${data.maxGroupSize}`
          : data.minGroupSize
            ? `${data.minGroupSize}+`
            : people.value
              ? `${people.value}`
              : '-',
      hotels: data.hotelsInfo || '-',
      comfort: data.comfortLevel ? `${data.comfortLevel}` : '-',
      mapImage: data.routeMapImage || '/assets/icons/map.png',
      country: data.country,
      minGroupSize: data.minGroupSize || null,
      maxGroupSize: data.maxGroupSize || null,
      priceFrom: data.priceFrom || null,
      currency: data.currency || null,
    };
    days.value = (data.program || []).map((day, index) => ({
      id: day.id,
      title: day.title,
      content: day.description,
      expanded: index === 0,
    }));
    included.value = data.included || [];
    notIncluded.value = data.excluded || [];
    currentIndex.value = 0;
  } catch (error) {
    notifyError(error.message || t('notifications.loadTourFailed'), t('notifications.tourUnavailable'));
  }
};

watch(() => locale.value, async () => {
  await loadCountries();
  await loadTour();
});

onMounted(() => {
  loadCountries();
  loadTour();
});
</script>

<template>
  <div>
    <!-- ═══ ПОИСКОВАЯ ПАНЕЛЬ (как на странице туров) ═══ -->
    <section class="mb-[20px] sm:mb-[30px] hidden lg:flex">
      <AppContainer>
        <!-- Хлебные крошки -->
        <nav class="mb-[15px] sm:mb-[20px]" aria-label="Breadcrumb">
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
              <span v-else class="text-[#000]">{{ crumb.label }}</span>
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

        <!-- Десктопная поисковая панель -->
        <div class="hidden lg:flex bg-white rounded-[12px] border px-[0.5px]">
          <CustomSelect
            v-model="where"
            :placeholder="t('openCard.search_where')"
            :options="countries"
            type="list"
          />
          <CustomSelect
            v-model="when"
            :placeholder="t('openCard.search_when')"
            type="calendar"
          />
          <CustomSelect
            v-model="people"
            :placeholder="t('openCard.search_people')"
            type="counter"
            :min="1"
            :max="20"
            unit="человек"
          />
          <CustomSelect
            v-model="duration"
            :placeholder="t('openCard.search_duration')"
            type="counter"
            :min="1"
            :max="30"
            unit="дней"
          />
          <button
            class="bg-[#a6a6aa] text-white px-8 py-3 text-[14px] font-medium hover:bg-[#285aff] transition cursor-pointer rounded-r-[10px] flex-shrink-0"
          >
            {{ t('openCard.search_button') }}
          </button>
        </div>
      </AppContainer>
    </section>

    <!-- ═══ ОСНОВНОЙ КОНТЕНТ ═══ -->
    <section class="mb-[50px] sm:mb-[70px]">
      <div
        class="relative lg:hidden overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] group"
      >
        <img
          :src="currentImage"
          :alt="tour.title"
          class="w-full h-full object-cover"
        />

        <!-- Счетчик фото -->
        <div
          class="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
        >
          {{ currentIndex + 1 }} / {{ allImages.length }}
        </div>

        <!-- Кнопка "Назад" -->
        <button
          @click="prevImage"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
        >
          <svg
            class="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <!-- Кнопка "Вперед" -->
        <button
          @click="nextImage"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
        >
          <svg
            class="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <!-- Точки индикаторы (опционально) -->
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          <div
            v-for="(_, i) in allImages"
            :key="i"
            @click="selectImage(i)"
            class="transition-all duration-300 cursor-pointer rounded-full bg-white/50 hover:bg-white"
            :class="i === currentIndex ? 'w-6 h-1.5' : 'w-1.5 h-1.5'"
          ></div>
        </div>
      </div>

      <AppContainer>
        <h1
          class="text-[22px] sm:text-[28px] lg:text-[36px] font-medium mb-1 leading-tight mb-4 sm:mb-6 lg:hidden"
        >
          {{ tour.title }} {{ tour.subtitle }}
        </h1>
        <div class="tour-detail-layout">
          <!-- ЛЕВАЯ КОЛОНКА -->
          <div class="tour-main-column">
            <!-- Заголовок -->
            <h1
              class="text-[22px] sm:text-[28px] lg:text-[34px] xl:text-[40px] font-medium leading-tight mb-4 sm:mb-6 hidden lg:block"
            >
              {{ tour.title }} {{ tour.subtitle }}
            </h1>

            <!-- Главное фото -->
            <div
              class="tour-main-image group"
            >
              <img
                :src="currentImage"
                :alt="tour.title"
                class="w-full h-full object-cover"
              />

              <!-- Счетчик фото -->
              <div
                class="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
              >
                {{ currentIndex + 1 }} / {{ allImages.length }}
              </div>

              <!-- Кнопка "Назад" -->
              <button
                @click="prevImage"
                class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white border hover:border-transparent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
              >
                <svg
                  class="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <!-- Кнопка "Вперед" -->
              <button
                @click="nextImage"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white border hover:border-transparent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
              >
                <svg
                  class="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- Точки индикаторы (опционально) -->
              <div
                class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5"
              >
                <div
                  v-for="(_, i) in allImages"
                  :key="i"
                  @click="selectImage(i)"
                  class="transition-all duration-300 cursor-pointer rounded-full bg-white/50 hover:bg-white"
                  :class="i === currentIndex ? 'w-6 h-1.5' : 'w-1.5 h-1.5'"
                ></div>
              </div>
            </div>

            <!-- Галерея миниатюр -->
            <div
              class="tour-thumbs scrollbar-hide"
            >
              <div
                v-for="(img, i) in allImages"
                :key="i"
                @click="selectImage(i)"
                class="flex-shrink-0 w-[80px] h-[60px] sm:w-[100px] sm:h-[75px] lg:w-[120px] lg:h-[90px] rounded-[10px] overflow-hidden cursor-pointer transition-all duration-300"
                :class="{
                  'ring-2 ring-[#285aff] scale-105': currentIndex === i,
                  'opacity-40 hover:opacity-70': currentIndex !== i,
                }"
              >
                <img :src="img" class="w-full h-full object-cover" />
              </div>
            </div>

            <!-- Табы -->
            <div class="tour-tabs scrollbar-hide">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                class="px-4 py-2 sm:px-5 sm:py-2.5 first:rounded-l-[15px] last:rounded-r-[15px] border text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition cursor-pointer"
                :class="
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'text-[#000] hover:bg-[#e5e5e5]'
                "
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="tour-toggle-row">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-[10px] border border-[#d2d2d4] bg-white px-4 py-2 text-[12px] sm:text-[14px] font-medium text-[#000] transition hover:border-[#285aff] hover:text-[#285aff]"
                :aria-expanded="descriptionsVisible"
                @click="toggleDescriptions"
              >
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': descriptionsVisible }"
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
                {{
                  descriptionsVisible
                    ? t('openCard.hide_descriptions')
                    : t('openCard.show_descriptions')
                }}
              </button>
            </div>

            <div
              v-if="activeTabContent && activeTab !== 'details'"
              class="tour-tab-card"
            >
              <div class="tour-tab-kicker">{{ tabs.find((tab) => tab.id === activeTab)?.label }}</div>
              <div class="tour-rich-text" v-html="activeTabContent"></div>
            </div>

            <div
              v-else-if="activeTab !== 'details'"
              class="tour-tab-card tour-tab-empty"
            >
              <div class="tour-tab-kicker">{{ tabs.find((tab) => tab.id === activeTab)?.label }}</div>
              <p>Информация скоро появится.</p>
            </div>

            <div
              v-if="activeTab === 'details' && hasContent(activeTabContent)"
              class="tour-tab-card tour-details-intro"
            >
              <div class="tour-tab-kicker">{{ t('openCard.tab_details') }}</div>
              <div class="tour-rich-text" v-html="activeTabContent"></div>
            </div>

            <!-- Дни программы -->
            <div v-if="activeTab === 'details'" class="tour-program-card">
              <div
                v-for="day in days"
                :key="day.id"
                class="tour-program-item"
              >
                <button
                  @click="toggleDay(day.id)"
                  class="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <h2
                    class="text-[18px] sm:text-[22px] lg:text-[26px] font-medium"
                  >
                    {{ day.title }}
                  </h2>
                  <svg
                    class="w-5 h-5 sm:w-6 sm:h-6 transition-transform flex-shrink-0 ml-4"
                    :class="{ 'rotate-180': day.expanded }"
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
                </button>
                <Transition name="fade">
                  <p
                    v-if="descriptionsVisible && day.expanded"
                    class="mt-3 text-[13px] sm:text-[14px] lg:text-[15px] text-[#555] leading-[1.75]"
                  >
                    {{ day.content }}
                  </p>
                </Transition>
              </div>
            </div>

            <!-- Что включено / не включено -->
            <div v-if="activeTab === 'details' && descriptionsVisible" class="tour-included-card">
              <h3 class="text-[18px] sm:text-[22px] font-medium mb-4 sm:mb-6">
                {{ t('openCard.included_title') }}
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <!-- Включено -->
                <div>
                  <h4
                    class="text-[14px] sm:text-[16px] font-medium mb-3 sm:mb-4"
                  >
                    {{ t('openCard.included') }}
                  </h4>
                  <ul class="space-y-2">
                    <li
                      v-for="(item, i) in included"
                      :key="i"
                      class="flex items-center gap-2 text-[12px] sm:text-[13px] text-[#666]"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full bg-[#285aff] flex-shrink-0"
                      ></span>
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <!-- Не включено -->
                <div>
                  <h4
                    class="text-[14px] sm:text-[16px] font-medium mb-3 sm:mb-4"
                  >
                    {{ t('openCard.not_included') }}
                  </h4>
                  <ul class="space-y-2">
                    <li
                      v-for="(item, i) in notIncluded"
                      :key="i"
                      class="flex items-center gap-2 text-[12px] sm:text-[13px] text-[#666]"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full bg-[#ccc] flex-shrink-0"
                      ></span>
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- ПРАВАЯ КОЛОНКА (сайдбар) -->
          <div class="tour-aside">
            <div class="tour-summary-card">
              <!-- Описание -->
              <p
                v-if="descriptionsVisible"
                class="tour-summary-description"
              >
                {{ t('openCard.sidebar_description') }}
              </p>

              <!-- Характеристики -->
              <div class="tour-feature-list">
                <div
                  class="tour-feature-row"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                  >
                    <path
                      d="M7.5 0C3.3645 0 0 3.3645 0 7.5C0 11.6355 3.3645 15 7.5 15C11.6355 15 15 11.6355 15 7.5C15 3.3645 11.6355 0 7.5 0ZM7.5 13.5C4.19175 13.5 1.5 10.8082 1.5 7.5C1.5 4.19175 4.19175 1.5 7.5 1.5C10.8082 1.5 13.5 4.19175 13.5 7.5C13.5 10.8082 10.8082 13.5 7.5 13.5Z"
                      fill="black"
                    />
                    <path
                      d="M8.25 3.75H6.75V7.8105L9.21975 10.2802L10.2802 9.21975L8.25 7.1895V3.75Z"
                      fill="black"
                    />
                  </svg>
                  <span class="tour-feature-text"
                    >{{ t('openCard.duration') }}
                    <span class="font-medium">{{ tour.duration }}</span>
                  </span>
                </div>
                <div
                  class="tour-feature-row"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-[#000] flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <span class="tour-feature-text"
                    >{{ t('openCard.transport') }}
                    <span class="font-medium">{{ tour.transport }}</span>
                  </span>
                </div>
                <div
                  class="tour-feature-row"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-[#000] flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span class="tour-feature-text"
                    >{{ t('openCard.tourists') }}
                    <span class="font-medium">{{ tour.tourists }}</span>
                  </span>
                </div>
                <div
                  class="tour-feature-row"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-[#000] flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span class="tour-feature-text"
                    >{{ t('openCard.cities') }}
                    <span class="font-medium">{{ tour.hotels }}</span>
                  </span>
                </div>
                <div
                  class="tour-feature-row"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-[#000] flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <span class="tour-feature-text"
                    >{{ t('openCard.accommodation') }}
                    <span class="font-medium">{{ tour.comfort }}</span>
                  </span>
                </div>
              </div>

              <!-- Карта -->
              <div
                class="tour-map"
              >
                <img
                  v-if="tour.mapImage && tour.mapImage !== '/assets/icons/map.png'"
                  :src="tour.mapImage"
                  :alt="`${tour.title} ${tour.subtitle}`"
                  class="w-full h-full object-cover"
                />
                <iframe
                  v-else
                  src="https://yandex.ru/map-widget/v1/?ll=69.279737,41.311151&z=7&l=map"
                  class="w-full h-full"
                  style="border: 0"
                  allowfullscreen
                  loading="lazy"
                ></iframe>
              </div>

              <!-- Подробнее -->
              <button
                @click="activeTab = 'details'"
                class="w-full text-center text-[12px] sm:text-[13px] text-[#666] hover:text-[#285aff] transition mb-4 sm:mb-5 flex items-center justify-center gap-1"
              >
                {{ t('openCard.more_details') }}
                <svg
                  class="w-3 h-3"
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
              </button>

              <!-- Текущая дата и цена -->
              <div
                class="tour-buy-panel"
              >
                <div
                  class="flex items-center justify-between mb-[10px] border-b border-b-[#e3e3e4] pb-[10px]"
                >
                  <span class="text-[12px] sm:text-[16px] text-[#000]"
                    >{{ otherDates[0]?.date || '-' }}</span
                  >
                  <span
                    class="text-[18px] sm:text-[20px] font-medium text-[#FF00E7]"
                    >{{ otherDates[0]?.price || '-' }}</span
                  >
                </div>
                <div
                  class="text-center mb-[5px] flex lg:block gap-[10px] justify-between"
                >
                  <p
                    class="text-[11px] sm:text-[12px] text-[#000] font-light leading-[15px]"
                  >
                    29 Сен, Пн - 12 Окт, Вс
                  </p>
                  <p
                    class="text-[11px] sm:text-[12px] text-[#000] leading-[15px]"
                  >
                    <span class="font-medium">{{ t('openCard.deadline') }}</span
                    > 8 Сентябрь 2025
                  </p>
                </div>
                <button
                  @click="openModal"
                  class="w-full bg-[#ff00e7] text-white rounded-[12px] py-3 text-[15px] font-medium hover:bg-[#eb02d3] transition cursor-pointer"
                >
                  {{ t('openCard.buy') }}
                </button>
              </div>

              <!-- Другие даты -->
              <div>
                <div
                  class="py-[10px] border-t border-b bg-[#f6f6f6] hidden lg:block"
                >
                  <h4
                    class="text-[13px] sm:text-[16px] font-medium text-center"
                  >
                    {{ t('openCard.other_dates') }}
                  </h4>
                </div>
                <div
                  class="py-[10px] border-t border-b bg-[#f6f6f6] mx-[-11vw] lg:mx-0 lg:hidden cursor-pointer"
                  @click="openMobileFilter"
                >
                  <h4
                    class="text-[13px] sm:text-[16px] font-medium text-center"
                  >
                    {{ t('openCard.other_dates') }}
                  </h4>
                </div>
                <div
                  class="tour-dates-panel hidden lg:block"
                >
                  <div
                    v-for="(d, i) in otherDates"
                    :key="i"
                    class="flex items-center justify-between py-2 border-b border-[#eaeaea] last:border-0"
                  >
                    <span class="text-[12px] sm:text-[16px] text-[#000]">{{
                      d.date
                    }}</span>
                    <div class="flex items-center gap-2">
                      <span
                        class="text-[14px] sm:text-[16px] font-medium text-[#FF00E7]"
                        >{{ d.price }}$</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>
    <!-- ═══ МОДАЛЬНОЕ ОКНО ═══ -->
    <Transition name="modal">
      <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
        <div>
          <div
            v-if="modalStep === 1"
            class="py-[33px] border-b border-b-[#4d4d54] w-[50%] bg-[#fff] rounded-t-[15px]"
          >
            <h2 class="modal-title">{{ t('openCard.modal_title') }}</h2>
          </div>
          <div
            class="modal-container rounded-br-[15px] rounded-tr-[15px] rounded-bl-[15px]"
            :class="{ 'rounded-[15px]': modalStep != 1 }"
            @click.stop
          >
            <!-- Кнопка закрытия -->
            <!-- <button class="modal-close" @click="closeModal">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button> -->

            <!-- Шаг 1: Форма -->

            <div v-if="modalStep === 1" class="modal-content">
              <form @submit.prevent="submitForm" class="modal-form">
                <div class="form-group">
                  <label>{{ t('openCard.modal_sex') }}</label>
                  <input type="text" v-model="formData.sex" :class="{ 'input-error': formErrors.sex }" @input="clearFieldError('sex')" required />
                  <p v-if="formErrors.sex" class="field-error">{{ formErrors.sex }}</p>
                </div>

                <div class="form-group">
                  <label>{{ t('openCard.modal_firstname') }}</label>
                  <input type="text" v-model="formData.firstName" :class="{ 'input-error': formErrors.firstName }" @input="clearFieldError('firstName')" required />
                  <p v-if="formErrors.firstName" class="field-error">{{ formErrors.firstName }}</p>
                </div>

                <div class="form-group">
                  <label>{{ t('openCard.modal_lastname') }}</label>
                  <input type="text" v-model="formData.lastName" :class="{ 'input-error': formErrors.lastName }" @input="clearFieldError('lastName')" required />
                  <p v-if="formErrors.lastName" class="field-error">{{ formErrors.lastName }}</p>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>{{ t('openCard.modal_birthdate') }}</label>
                    <input type="date" v-model="formData.birthDate" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('openCard.modal_phone') }}</label>
                    <input type="tel" v-model="formData.phone" :class="{ 'input-error': formErrors.phone }" @input="clearFieldError('phone')" required />
                    <p v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</p>
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ t('openCard.modal_email') }}</label>
                  <input type="email" v-model="formData.email" :class="{ 'input-error': formErrors.email }" @input="clearFieldError('email')" required />
                  <p v-if="formErrors.email" class="field-error">{{ formErrors.email }}</p>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>{{ t('openCard.modal_doc_type') }}</label>
                    <input type="text" v-model="formData.idCard" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('openCard.modal_nationality') }}</label>
                    <input type="text" v-model="formData.nationality" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>{{ t('openCard.modal_passport_series') }}</label>
                    <input type="text" v-model="formData.documentSeries" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('openCard.modal_doc_number') }}</label>
                    <input type="text" v-model="formData.documentNumber" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>{{ t('openCard.modal_issued') }}</label>
                    <input type="date" v-model="formData.issuedDate" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('openCard.modal_valid_until') }}</label>
                    <input type="date" v-model="formData.validUntil" />
                  </div>
                </div>

                <button type="submit" class="modal-submit">
                  {{ t('openCard.modal_next') }}
                </button>
              </form>
            </div>

            <!-- Шаг 2: Успех -->
            <div v-else-if="modalStep === 2" class="modal-success">
              <div class="success-icon">✓</div>
              <h2 class="success-title">
                {{ t('openCard.modal_success_title') }}
              </h2>
              <button class="modal-submit" @click="modalStep = 3">
                {{ t('openCard.modal_next') }}
              </button>
            </div>

            <div v-else-if="modalStep === 3" class="modal-success">
              <h2 class="success-title">
                {{ t('openCard.modal_success_text') }}
              </h2>
              <button class="modal-submit" @click="closeModal">
                {{ t('openCard.modal_close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isMobileFilterOpen"
          class="fixed inset-0 bg-black/60 z-40 lg:hidden"
          @click="closeMobileFilter"
        ></div>
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="isMobileFilterOpen"
          class="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-50 lg:hidden max-h-[90vh] overflow-y-auto"
        >
          <!-- Шапка -->
          <div
            class="sticky top-0 bg-white px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-[#e6e6e7] flex items-center justify-between rounded-t-[20px]"
          >
            <h3 class="text-[16px] sm:text-[18px] font-medium">
              {{ t('openCard.other_dates') }}
            </h3>
            <button
              @click="closeMobileFilter"
              class="text-[13px] sm:text-[14px] text-[#285aff] font-medium"
            >
              {{ t('openCard.close') }}
            </button>
          </div>

          <div class="px-4 sm:px-5 py-4">
            <!-- Цена -->
            <div class="lg:px-[40px] py-[15px] rounded-b-[15px]">
              <div
                v-for="(d, i) in otherDates"
                :key="i"
                class="flex items-center justify-between py-2 border-b border-[#eaeaea] last:border-0"
              >
                <span class="text-[16px] text-[#000]">{{ d.date }}</span>
                <div class="flex items-center gap-2">
                  <span class="text-[16px] font-medium text-[#FF00E7]"
                    >{{ d.price }}$</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tour-detail-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}

.tour-main-column {
  min-width: 0;
}

.tour-aside {
  width: 100%;
  min-width: 0;
}

.tour-main-image {
  position: relative;
  display: none;
  overflow: hidden;
  margin-bottom: 18px;
  border-radius: 18px;
  aspect-ratio: 16 / 10;
  background: #f3f4f7;
  box-shadow: 0 18px 45px rgba(10, 17, 31, 0.1);
}

.tour-thumbs {
  display: none;
  gap: 12px;
  margin-bottom: 28px;
  overflow-x: auto;
  padding: 4px 4px 10px;
}

.tour-tabs {
  display: flex;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.tour-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 18px;
}

.tour-program-card {
  overflow: hidden;
  border: 1px solid #e3e6ec;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 16px 45px rgba(10, 17, 31, 0.06);
}

.tour-tab-card {
  margin-bottom: 22px;
  padding: 22px;
  border: 1px solid #e3e6ec;
  border-radius: 18px;
  background: linear-gradient(180deg, #fff 0%, #fbfcff 100%);
  box-shadow: 0 16px 45px rgba(10, 17, 31, 0.06);
}

.tour-details-intro {
  margin-bottom: 18px;
}

.tour-tab-kicker {
  margin-bottom: 12px;
  color: #285aff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tour-tab-empty {
  color: #6f7480;
}

.tour-rich-text {
  color: #20242c;
  font-size: 15px;
  line-height: 1.75;
}

.tour-rich-text :deep(p) {
  margin: 0 0 14px;
}

.tour-rich-text :deep(p:last-child) {
  margin-bottom: 0;
}

.tour-rich-text :deep(ul),
.tour-rich-text :deep(ol) {
  margin: 12px 0;
  padding-left: 22px;
}

.tour-rich-text :deep(li) {
  margin-bottom: 8px;
}

.tour-rich-text :deep(strong),
.tour-rich-text :deep(b) {
  font-weight: 700;
}

.tour-rich-text :deep(a) {
  color: #285aff;
  text-decoration: underline;
}

.tour-program-item {
  padding: 18px;
  border-bottom: 1px solid #edf0f5;
}

.tour-program-item:last-child {
  border-bottom: 0;
}

.tour-included-card {
  margin-top: 30px;
  padding: 22px;
  border: 1px solid #e3e6ec;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 16px 45px rgba(10, 17, 31, 0.06);
}

.tour-summary-card {
  overflow: hidden;
  border: 1px solid #dfe3eb;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 20px 55px rgba(10, 17, 31, 0.1);
}

.tour-summary-description {
  padding: 20px;
  border-bottom: 1px solid #edf0f5;
  color: #1d2430;
  font-size: 14px;
  line-height: 1.55;
}

.tour-feature-list {
  display: grid;
  grid-template-columns: 1fr;
}

.tour-feature-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #edf0f5;
}

.tour-feature-row svg {
  margin-top: 3px;
  flex-shrink: 0;
}

.tour-feature-text {
  color: #111;
  font-size: 14px;
  line-height: 1.45;
}

.tour-map {
  overflow: hidden;
  margin: 18px 20px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  aspect-ratio: 16 / 10;
  background: #f4f6fa;
}

.tour-buy-panel {
  margin: 0 20px 20px;
  padding-top: 16px;
  border-top: 1px solid #edf0f5;
}

.tour-dates-panel {
  margin: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid #edf0f5;
  background: #f7f8fb;
}

@media (min-width: 1024px) {
  .tour-detail-layout {
    grid-template-columns: minmax(0, 0.58fr) minmax(360px, 0.42fr);
    gap: 34px;
  }

  .tour-main-image,
  .tour-thumbs {
    display: flex;
  }

  .tour-main-image {
    display: block;
    aspect-ratio: 16 / 11;
  }

  .tour-aside {
    position: sticky;
    top: 24px;
  }

  .tour-summary-description {
    padding: 24px;
    font-size: 15px;
  }

  .tour-feature-list {
    grid-template-columns: 1fr 1fr;
  }

  .tour-feature-row {
    min-height: 86px;
    padding: 18px 20px;
  }

  .tour-feature-row:nth-child(odd) {
    border-right: 1px solid #edf0f5;
  }

  .tour-feature-text {
    font-size: 14px;
  }

  .tour-program-item {
    padding: 22px 24px;
  }
}

@media (min-width: 1280px) {
  .tour-detail-layout {
    grid-template-columns: minmax(0, 0.56fr) minmax(420px, 0.44fr);
    gap: 40px;
  }

  .tour-main-image {
    aspect-ratio: 16 / 10;
  }

  .tour-summary-description {
    padding: 28px 30px;
  }

  .tour-feature-row {
    padding: 20px 24px;
  }

  .tour-map,
  .tour-buy-panel {
    margin-right: 24px;
    margin-left: 24px;
  }

  .tour-dates-panel {
    padding-right: 24px;
    padding-left: 24px;
  }
}

@media (max-width: 640px) {
  .tour-program-item,
  .tour-included-card,
  .tour-summary-description,
  .tour-feature-row {
    padding-right: 16px;
    padding-left: 16px;
  }

  .tour-map,
  .tour-buy-panel {
    margin-right: 16px;
    margin-left: 16px;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  position: relative;
  max-width: 600px;
  width: 100%;
  max-height: 85vh;
  background: white;
  /* border-radius: 0 15px 15px 15px; */
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
  z-index: 10;
}

.modal-close:hover {
  background: #f5f5f5;
}

.modal-content {
  padding: 32px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  letter-spacing: -3%;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.form-group label {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0%;
  color: #999999;
  position: absolute;
  z-index: 20;
  left: 15px;
  top: 5px;
}

.form-group input {
  padding: 20px 12px 10px 12px;
  border: 1px solid #000;
  border-radius: 15px;
  font-size: 16px;
  transition: border 0.2s;
  background-color: #f6f6f6;
}

.form-group input:focus {
  outline: none;
  border-color: #285aff;
}

.form-group .input-error {
  border-color: #ff00cc;
  box-shadow: 0 0 0 1px #ff00cc;
}

.field-error {
  margin: 2px 0 0 4px;
  font-size: 12px;
  color: #cc008f;
}

.modal-submit {
  background: #ff00e7;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-submit:hover {
  background: #eb02d3;
}

/* Успех */
.modal-success {
  padding: 35px 35px;
  text-align: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: #4ade80;
  color: white;
  font-size: 48px;
  font-weight: bold;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.success-title {
  font-size: 32px;
  font-weight: 400;
  margin-bottom: 34px;
}

.success-text {
  color: #666;
  margin-bottom: 32px;
}

/* Анимация */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Адаптив */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .modal-content {
    padding: 24px;
  }

  .modal-title {
    font-size: 20px;
  }
  h1 {
    font-size: 20px;
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
