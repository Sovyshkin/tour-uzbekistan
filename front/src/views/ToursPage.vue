<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppContainer from '@/components/AppContainer.vue';
import Button from '@/components/Button.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import Card from '@/components/Card.vue';
import { getApiLocale, getCountries, getTours } from '@/api';
import { useNotifications } from '@/composables/useNotifications';

const { t, locale } = useI18n();
const route = useRoute();
const { error: notifyError } = useNotifications();

// ─── Хлебные крошки ───
const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.tours'), path: null },
]);

// ─── Мобильная модалка фильтров ───
const isMobileFilterOpen = ref(false);
const openMobileFilter = () => {
  isMobileFilterOpen.value = true;
};
const closeMobileFilter = () => {
  isMobileFilterOpen.value = false;
};

// ─── Поисковые значения ───
const where = ref(null);
const when = ref('');
const people = ref(2);
const duration = ref(7);
const searchText = ref('');

const countries = ref([]);

// ─── Фильтры ───
const comfortFilter = ref(null);

const tourTypes = ref([
  { id: 'short', label: t('toursPage.short'), checked: true },
  { id: 'oneday', label: t('toursPage.oneday'), checked: false },
  { id: 'multiday', label: t('toursPage.multiday'), checked: false },
]);

const seasons = ref([
  { id: 'winter', label: t('toursPage.winter'), checked: true },
  { id: 'spring', label: t('toursPage.spring'), checked: false },
  { id: 'summer', label: t('toursPage.summer'), checked: false },
  { id: 'autumn', label: t('toursPage.autumn'), checked: false },
]);

const tours = ref([]);
const meta = ref({
  page: 1,
  pageSize: 9,
  total: 0,
  totalPages: 1,
});

// Пагинация теперь работает с filteredTours
const totalPages = computed(() => meta.value.totalPages || 1);
const paginatedTours = computed(() => tours.value);

// Функция поиска (обновляет пагинацию)
const performSearch = () => {
  currentPage.value = 1;
  loadTours();
};

// ─── Пагинация ───
const currentPage = ref(1);
const perPage = ref(9);

const updatePerPage = () => {
  const w = window.innerWidth;
  if (w < 640) perPage.value = 4;
  else if (w < 1024) perPage.value = 6;
  else if (w < 1440) perPage.value = 9;
  else perPage.value = 10;
};

updatePerPage();
onMounted(() => window.addEventListener('resize', updatePerPage));
onUnmounted(() => window.removeEventListener('resize', updatePerPage));

const resetFilters = () => {
  where.value = null;
  when.value = '';
  searchText.value = '';
  comfortFilter.value = null;
  seasons.value.forEach((s) => (s.checked = false));
  tourTypes.value.forEach((t) => (t.checked = false));
  currentPage.value = 1;
  loadTours();
};

const displayedPages = computed(() => {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let last;

  for (let i = 1; i <= totalPages.value; i += 1) {
    if (i === 1 || i === totalPages.value || (i >= currentPage.value - delta && i <= currentPage.value + delta)) {
      range.push(i);
    }
  }

  range.forEach((item) => {
    if (last) {
      if (item - last === 2) {
        rangeWithDots.push(last + 1);
      } else if (item - last > 1) {
        rangeWithDots.push('...');
      }
    }

    rangeWithDots.push(item);
    last = item;
  });

  return rangeWithDots;
});

const loadCountries = async () => {
  const data = await getCountries(getApiLocale(locale.value));
  countries.value = data.map((country) => ({
    id: country.slug,
    slug: country.slug,
    label: country.name,
    icon: country.flagImage,
  }));

  const requestedCountry = route.query.country;
  if (requestedCountry && !where.value) {
    where.value =
      countries.value.find((country) => country.slug === requestedCountry) || null;
  }
};

const loadTours = async () => {
  try {
    const data = await getTours({
      locale: getApiLocale(locale.value),
      page: currentPage.value,
      pageSize: perPage.value,
      country: where.value?.slug,
      maxDuration: duration.value || undefined,
      minStars: comfortFilter.value || undefined,
      maxStars: comfortFilter.value || undefined,
      search: searchText.value || undefined,
    });

    tours.value = (data.items || []).map((tour) => ({
      id: tour.id,
      slug: tour.slug,
      title: tour.title,
      route: tour.route,
      image: tour.mainImage || tour.heroImage || tour.images?.[0]?.imageUrl || '/assets/icons/card.png',
      duration: {
        day: tour.durationDays,
        night: tour.durationNights,
      },
      country: tour.country,
      comfort: tour.comfortLevel,
    }));
    meta.value = data.meta;
  } catch (error) {
    notifyError(error.message || t('notifications.loadToursFailed'), t('notifications.toursUnavailable'));
  }
};

watch(() => locale.value, async () => {
  await loadCountries();
  await loadTours();
});

watch(currentPage, () => {
  loadTours();
});

watch(perPage, () => {
  currentPage.value = 1;
  loadTours();
});

onMounted(async () => {
  await loadCountries();
  await loadTours();
});
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="mb-[30px] sm:mb-[55px]">
      <div class="hero-section relative h-[200px] sm:h-[400px] lg:h-[458px]">
        <div
          class="hero-image absolute inset-0 bg-cover bg-center"
          style="
            background-image: url('/assets/icons/tours.png');
            background-repeat: no-repeat;
            background-size: cover;
          "
        ></div>
      </div>
    </section>

    <!-- ПОИСКОВАЯ ПАНЕЛЬ -->
    <section class="mb-[20px] sm:mb-[30px]">
      <AppContainer>
        <!-- Хлебные крошки -->
        <nav
          class="mb-[15px] sm:mb-[20px] hidden lg:flex"
          aria-label="Breadcrumb"
        >
          <ol
            class="flex items-center gap-2 text-[12px] sm:text-[14px] text-[#000]"
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
              <span v-else class="text-[#888] font-medium">{{
                crumb.label
              }}</span>
              <span v-if="i < breadcrumbs.length - 1" class="text-[#000]">
                <svg
                  class="w-3 h-3 sm:w-4 sm:h-4 transition-transform -rotate-90"
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

        <!-- Мобильная поисковая панель -->
        <div class="lg:hidden flex flex-col gap-2 sm:gap-3">
          <CustomSelect
            v-model="where"
            :placeholder="t('toursPage.search_where')"
            :options="countries"
            type="list"
            class="w-full"
            :border="false"
          />
          <CustomSelect
            v-model="when"
            :placeholder="t('toursPage.search_when')"
            type="calendar"
            class="w-full"
            :border="false"
          />
          <CustomSelect
            v-model="people"
            :placeholder="t('toursPage.search_people')"
            type="counter"
            :min="1"
            :max="20"
            :unit="t('toursPage.search_people_unit')"
            class="flex-1"
            :border="false"
          />
          <CustomSelect
            v-model="duration"
            :placeholder="t('toursPage.search_days')"
            type="counter"
            :min="1"
            :max="30"
            :unit="t('toursPage.search_days_unit')"
            class="flex-1"
            :border="false"
          />
          <button
            class="bg-[#a6a6aa] text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-[8px] text-[13px] sm:text-[14px] font-medium hover:bg-[#285aff] transition cursor-pointer w-full"
            @click="performSearch"
          >
            {{ t('toursPage.search_button') }}
          </button>
        </div>

        <!-- Десктопная поисковая панель -->
        <div class="hidden lg:flex bg-white rounded-[12px] border px-[0.5px]">
          <CustomSelect
            v-model="where"
            :placeholder="t('toursPage.search_where')"
            :options="countries"
            type="list"
          />
          <CustomSelect
            v-model="when"
            :placeholder="t('toursPage.search_when')"
            type="calendar"
          />
          <CustomSelect
            v-model="people"
            :placeholder="t('toursPage.search_people_full')"
            type="counter"
            :min="1"
            :max="20"
            :unit="t('toursPage.search_people_unit')"
          />
          <CustomSelect
            v-model="duration"
            :placeholder="t('toursPage.search_duration')"
            type="counter"
            :min="1"
            :max="30"
            :unit="t('toursPage.search_days_unit')"
          />
          <button
            class="bg-[#a6a6aa] text-white px-8 py-3 text-[14px] font-medium hover:bg-[#285aff] transition cursor-pointer rounded-r-[10px] flex-shrink-0"
            @click="performSearch"
          >
            {{ t('toursPage.search_button') }}
          </button>
        </div>
      </AppContainer>
    </section>

    <!-- КОНТЕНТ: ФИЛЬТРЫ + СЕТКА -->
    <section class="mb-[40px] sm:mb-[70px]">
      <AppContainer>
        <div class="flex flex-col lg:flex-row gap-5 sm:gap-8">
          <!-- Десктопный сайдбар -->
          <aside class="hidden lg:block w-[260px] xl:w-[280px] flex-shrink-0">
            <div
              class="border border-[#e6e6e7] rounded-[16px] overflow-hidden bg-white"
            >
              <!-- Цена -->
              <div class="p-4 xl:p-5 border-b border-[#e6e6e7]">
                <h4 class="text-[14px] xl:text-[15px] font-medium mb-3 xl:mb-4">
                  {{ t('toursPage.price') }}
                </h4>
                <div class="relative mb-3 xl:mb-4">
                  <input
                    type="range"
                    class="w-full h-1 bg-[#e6e6e7] rounded-lg appearance-none cursor-pointer accent-[#285aff]"
                    min="0"
                    max="5000"
                  />
                </div>
                <div
                  class="flex justify-between text-[11px] xl:text-[12px] text-[#888]"
                >
                  <span>000</span><span>000</span>
                </div>
              </div>

              <!-- Длительность -->
              <div class="p-4 xl:p-5 border-b border-[#e6e6e7]">
                <h4 class="text-[14px] xl:text-[15px] font-medium mb-1">
                  {{ t('toursPage.duration_label') }}
                </h4>
                <p class="text-[11px] xl:text-[12px] text-[#888] mb-2 xl:mb-3">
                  {{ t('toursPage.days_label') }}
                </p>
                <div class="relative mb-3 xl:mb-4">
                  <input
                    type="range"
                    class="w-full h-1 bg-[#e6e6e7] rounded-lg appearance-none cursor-pointer accent-[#285aff]"
                    min="0"
                    max="21"
                  />
                </div>
                <div
                  class="flex justify-between text-[11px] xl:text-[12px] text-[#888]"
                >
                  <span>00</span><span>00</span>
                </div>
              </div>

              <!-- По сезону + По типу тура -->
              <div class="grid grid-cols-2 border-b border-[#e6e6e7]">
                <div class="p-4 xl:p-5 border-r border-[#e6e6e7]">
                  <h4
                    class="text-[13px] xl:text-[14px] font-medium mb-2 xl:mb-3"
                  >
                    {{ t('toursPage.season') }}
                  </h4>
                  <div class="flex flex-col gap-2 xl:gap-2.5">
                    <label
                      v-for="s in seasons"
                      :key="s.id"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <div class="relative flex items-center">
                        <input
                          type="checkbox"
                          class="peer sr-only"
                          v-model="s.checked"
                        />
                        <div
                          class="w-3.5 h-3.5 xl:w-4 xl:h-4 border border-[#ccc] rounded peer-checked:bg-[#285aff] peer-checked:border-[#285aff] transition"
                        ></div>
                        <svg
                          class="absolute w-2.5 h-2.5 xl:w-3 xl:h-3 text-white left-[1px] top-[1px] xl:left-0.5 xl:top-0.5 opacity-0 peer-checked:opacity-100"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span class="text-[12px] xl:text-[13px]">{{
                        s.label
                      }}</span>
                    </label>
                  </div>
                </div>
                <div class="p-4 xl:p-5">
                  <h4
                    class="text-[13px] xl:text-[14px] font-medium mb-2 xl:mb-3"
                  >
                    {{ t('toursPage.tour_type') }}
                  </h4>
                  <div class="flex flex-col gap-2 xl:gap-2.5">
                    <label
                      v-for="t in tourTypes"
                      :key="t.id"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <div class="relative flex items-center">
                        <input
                          type="checkbox"
                          class="peer sr-only"
                          v-model="t.checked"
                        />
                        <div
                          class="w-3.5 h-3.5 xl:w-4 xl:h-4 border border-[#ccc] rounded peer-checked:bg-[#285aff] peer-checked:border-[#285aff] transition"
                        ></div>
                        <svg
                          class="absolute w-2.5 h-2.5 xl:w-3 xl:h-3 text-white left-[1px] top-[1px] xl:left-0.5 xl:top-0.5 opacity-0 peer-checked:opacity-100"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span class="text-[12px] xl:text-[13px]">{{
                        t.label
                      }}</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Комфорт -->
              <div class="p-4 xl:p-5 border-b border-[#e6e6e7]">
                <h4 class="text-[13px] xl:text-[14px] font-medium mb-2 xl:mb-3">
                  {{ t('toursPage.comfort') }}
                </h4>
                <div class="flex flex-col gap-1.5 xl:gap-2">
                  <button
                    v-for="stars in [3, 4, 5]"
                    :key="stars"
                    class="flex items-center gap-2 text-left group"
                    @click="comfortFilter = stars"
                  >
                    <div class="flex items-center gap-0.5">
                      <span
                        v-for="i in 5"
                        :key="i"
                        class="text-[14px] xl:text-[16px]"
                        :class="i <= stars ? 'text-[#285aff]' : 'text-[#ddd]'"
                        >★</span
                      >
                    </div>
                    <span
                      class="text-[11px] xl:text-[12px] text-[#666] group-hover:text-[#285aff] transition"
                    >
                      {{
                        stars === 3
                          ? t('toursPage.stars_3')
                          : stars === 4
                          ? t('toursPage.stars_4')
                          : t('toursPage.stars_5')
                      }}
                    </span>
                  </button>
                </div>
              </div>

              <!-- Сбросить -->
              <button
                @click="resetFilters"
                class="w-full p-3 xl:p-4 flex items-center justify-center gap-2 text-[13px] xl:text-[14px] text-[#333] hover:text-[#e40000] transition cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                {{ t('toursPage.reset_filters') }}
              </button>
            </div>
          </aside>

          <!-- Сетка туров -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
              <h2
                class="text-[20px] sm:text-[24px] lg:text-[28px] xl:text-[36px] font-medium"
              >
                {{ t('toursPage.tours_title') }}
              </h2>
              <button
                @click="openMobileFilter"
                class="lg:hidden flex items-center gap-2 border border-[#bfbfbf] rounded-[8px] px-3 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-[14px] hover:border-[#285aff] transition flex-shrink-0"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 4h18M6 12h12M9 20h6" />
                </svg>
                <span class="hidden sm:inline">{{
                  t('toursPage.filter')
                }}</span>
              </button>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 xl:gap-[20px]"
            >
              <Card
                v-for="tour in paginatedTours"
                :key="tour.id"
                :tour="tour"
                :country="where?.slug"
              />
            </div>

            <div
              v-if="paginatedTours.length === 0"
              class="text-center py-10 sm:py-20 text-[#888] text-[14px]"
            >
              {{ t('toursPage.no_tours') }}
            </div>

            <div
              class="flex justify-center sm:justify-end items-center gap-1.5 sm:gap-2 mt-6 sm:mt-10"
            >
              <button
                v-for="page in totalPages"
                :key="page"
                @click="currentPage = page"
                class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-[6px] text-[12px] sm:text-[14px] transition"
                :class="
                  currentPage === page
                    ? 'bg-[#285aff] text-white'
                    : 'text-[#666] hover:bg-[#f5f5f5]'
                "
              >
                {{ page }}
              </button>
              <button
                class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#666] hover:bg-[#f5f5f5] rounded-[6px] text-[12px] sm:text-[14px]"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <!-- МОБИЛЬНАЯ МОДАЛКА ФИЛЬТРОВ -->
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
          <div
            class="sticky top-0 bg-white px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-[#e6e6e7] flex items-center justify-between rounded-t-[20px]"
          >
            <h3 class="text-[16px] sm:text-[18px] font-medium">
              {{ t('toursPage.filter_modal_title') }}
            </h3>
            <button
              @click="closeMobileFilter"
              class="text-[13px] sm:text-[14px] text-[#285aff] font-medium"
            >
              {{ t('toursPage.close') }}
            </button>
          </div>

          <div class="px-4 sm:px-5 py-4">
            <!-- Цена -->
            <div class="mb-5 sm:mb-6">
              <h4 class="text-[14px] sm:text-[15px] font-medium mb-3 sm:mb-4">
                {{ t('toursPage.price') }}
              </h4>
              <div class="relative mb-3">
                <input
                  type="range"
                  class="w-full h-1 bg-[#e6e6e7] rounded-lg appearance-none cursor-pointer accent-[#285aff]"
                  min="0"
                  max="5000"
                />
              </div>
              <div class="flex justify-between text-[12px] text-[#888]">
                <span>000</span><span>000</span>
              </div>
            </div>

            <!-- Длительность -->
            <div class="mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-[#e6e6e7]">
              <h4 class="text-[14px] sm:text-[15px] font-medium mb-1">
                {{ t('toursPage.duration_label') }}
              </h4>
              <p class="text-[12px] text-[#888] mb-2 sm:mb-3">
                {{ t('toursPage.days_label') }}
              </p>
              <div class="relative mb-3">
                <input
                  type="range"
                  class="w-full h-1 bg-[#e6e6e7] rounded-lg appearance-none cursor-pointer accent-[#285aff]"
                  min="0"
                  max="21"
                />
              </div>
              <div class="flex justify-between text-[12px] text-[#888]">
                <span>00</span><span>00</span>
              </div>
            </div>

            <!-- По сезону + По типу тура -->
            <div
              class="grid grid-cols-2 gap-0 mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-[#e6e6e7]"
            >
              <div class="pr-2 sm:pr-3 border-r border-[#e6e6e7]">
                <h4 class="text-[13px] sm:text-[14px] font-medium mb-2 sm:mb-3">
                  {{ t('toursPage.season') }}
                </h4>
                <div class="flex flex-col gap-2 sm:gap-2.5">
                  <label
                    v-for="s in seasons"
                    :key="s.id"
                    class="flex items-center gap-2 cursor-pointer"
                  >
                    <div class="relative flex items-center">
                      <input
                        type="checkbox"
                        class="peer sr-only"
                        v-model="s.checked"
                      />
                      <div
                        class="w-4 h-4 border border-[#ccc] rounded peer-checked:bg-[#285aff] peer-checked:border-[#285aff] transition"
                      ></div>
                      <svg
                        class="absolute w-3 h-3 text-white left-0.5 top-0.5 opacity-0 peer-checked:opacity-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span class="text-[12px] sm:text-[13px]">{{
                      s.label
                    }}</span>
                  </label>
                </div>
              </div>
              <div class="pl-2 sm:pl-3">
                <h4 class="text-[13px] sm:text-[14px] font-medium mb-2 sm:mb-3">
                  {{ t('toursPage.tour_type') }}
                </h4>
                <div class="flex flex-col gap-2 sm:gap-2.5">
                  <label
                    v-for="t in tourTypes"
                    :key="t.id"
                    class="flex items-center gap-2 cursor-pointer"
                  >
                    <div class="relative flex items-center">
                      <input
                        type="checkbox"
                        class="peer sr-only"
                        v-model="t.checked"
                      />
                      <div
                        class="w-4 h-4 border border-[#ccc] rounded peer-checked:bg-[#285aff] peer-checked:border-[#285aff] transition"
                      ></div>
                      <svg
                        class="absolute w-3 h-3 text-white left-0.5 top-0.5 opacity-0 peer-checked:opacity-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span class="text-[12px] sm:text-[13px]">{{
                      t.label
                    }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Комфорт -->
            <div class="mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-[#e6e6e7]">
              <h4 class="text-[13px] sm:text-[14px] font-medium mb-2 sm:mb-3">
                {{ t('toursPage.comfort') }}
              </h4>
              <div class="flex flex-col gap-2">
                <button
                  v-for="stars in [3, 4, 5]"
                  :key="stars"
                  class="flex items-center gap-2 text-left"
                  @click="comfortFilter = stars"
                >
                  <div class="flex items-center gap-0.5">
                    <span
                      v-for="i in 5"
                      :key="i"
                      class="text-[14px]"
                      :class="i <= stars ? 'text-[#285aff]' : 'text-[#ddd]'"
                      >★</span
                    >
                  </div>
                  <span class="text-[12px] text-[#666]">
                    {{
                      stars === 3
                        ? t('toursPage.stars_3')
                        : stars === 4
                        ? t('toursPage.stars_4')
                        : t('toursPage.stars_5')
                    }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Сбросить -->
            <button
              @click="resetFilters"
              class="w-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] text-[#333] py-3 hover:text-[#e40000] transition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              {{ t('toursPage.reset_filters') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Анимации модалки */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
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

/* Скрыть scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  display: none;
}
.overflow-y-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Range input */
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #e6e6e7;
  border-radius: 2px;
  outline: none;
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #285aff;
  cursor: pointer;
}
input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #285aff;
  cursor: pointer;
}

/* Hero */
.hero-section {
  position: relative;
  width: 100%;
  max-height: 458px;
  overflow: hidden;
}
.hero-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 78%;
}

/* Адаптив hero */
@media (min-width: 1921px) {
  .hero-section {
    height: 458px;
  }
  .hero-image {
    background-position: center 78%;
  }
}
</style>
