<script setup>
import AppContainer from '@/components/AppContainer.vue';
import Button from '@/components/Button.vue';
import Card from '@/components/Card.vue';
import CardDMS from '@/components/CardDMS.vue';
import CardGorzontalDMC from '@/components/CardGorzontalDMC.vue';
import CardNews from '@/components/CardNews.vue';
import Carousel from '@/components/Carousel.vue';
import Line from '@/components/Line.vue';
import { backgroundImageStyle, formatBackendDate, getApiLocale, getHome, resolveAssetUrl } from '@/api';
import { useNotifications } from '@/composables/useNotifications';

import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
const { error: notifyError } = useNotifications();
// Для туров
const getTourCount = () => {
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  if (window.innerWidth < 1280) return 3;
  return 4;
};

// Для новостей
const getNewsCount = () => {
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
};

const tourVisible = ref(getTourCount());
const newsVisible = ref(getNewsCount());

const onResize = () => {
  tourVisible.value = getTourCount();
  newsVisible.value = getNewsCount();
};

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

const activeCategory = ref('all');
const homeData = ref({
  settings: {},
  banners: [],
  countries: [],
  recommendedTours: [],
  services: [],
  whyWe: [],
  latestNews: [],
});

const cmsText = (key, fallback) => {
  const value = homeData.value.settings?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
};

const cmsAsset = (value) => resolveAssetUrl(value || '');

const cmsBoolean = (key, fallback = false) => {
  const value = homeData.value.settings?.[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on', 'вкл', 'да'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off', 'выкл', 'нет'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const toursAutoplay = computed(() =>
  cmsBoolean('home.tours_animation_enabled', true) ? 5000 : 0,
);

const mass = computed(() => [
  {
    title: cmsText('home.cards.about.title', t('nav.about')),
    route: '/about',
    descr: cmsText(
      'home.cards.about.description',
      'Centrum Holidays DMC is a destination management company in Uzbekistan with a young, dynamic team, steadily growing and focused on innovation and high service standards. Founded in Tashkent in 2024 by Abdulaziz Abdurakhmanov.',
    ),
  },
  {
    title: cmsText('home.cards.directions.title', t('nav.directions')),
    route: '/directions',
    descr: cmsText(
      'home.cards.directions.description',
      'Discover Uzbekistan, Central Asia and neighboring destinations through curated routes, regional expertise and seamless travel logistics.',
    ),
  },
  {
    title: cmsText('home.cards.services.title', t('nav.services')),
    route: '/services',
    descr: cmsText(
      'home.cards.services.description',
      'We provide end-to-end services for individual and group tourism, from airport transfers and visa support to accommodation, health tourism, cultural tours, and tailored programmes.',
    ),
  },
  {
    title: cmsText('home.cards.why.title', t('nav.why_we')),
    route: '/why-we',
    descr: cmsText(
      'home.cards.why.description',
      'Because this approach makes the entire process effortless for you. From the planning stage of your trip to its completion, it offers a comprehensive and reliable solution that you can confidently utilise at every step.',
    ),
  },
]);

const heroBanner = computed(() => homeData.value.banners[0] || null);

const buttons = computed(() => [
  { title: cmsText('buttons.all', t('buttons.all')), category: 'all', url: null },
  ...homeData.value.countries.map((country) => ({
    title: country.name,
    category: country.slug,
    url: cmsAsset(country.flagImage),
  })),
]);

const allTours = computed(() =>
  homeData.value.recommendedTours.map((tour) => ({
    id: tour.id,
    slug: tour.slug,
    title: tour.title,
    route: tour.route,
    image: tour.image,
    imageSettings: tour.imageSettings,
    category: tour.countrySlug,
    duration: {
      day: tour.durationDays,
      night: tour.durationNights,
    },
  })),
);

const filteredTours = computed(() => {
  if (activeCategory.value === 'all') {
    return allTours.value;
  }
  return allTours.value.filter((tour) => tour.category === activeCategory.value);
});

// Функция смены категории
const setCategory = (category) => {
  activeCategory.value = category;
};

const servedCountriesList = [
  { key: 'russia', icon: '/assets/icons/ru.png' },
  { key: 'turkey', icon: '/assets/icons/tr.png' },
  { key: 'azerbaijan', icon: '/assets/icons/az.png' },
  { key: 'israel', icon: '/assets/icons/il.png' },
  { key: 'india', icon: '/assets/icons/ia.png' },
  { key: 'thailand', icon: '/assets/icons/th.png' },
  { key: 'vietnam', icon: '/assets/icons/vn.png' },
  { key: 'southKorea', icon: '/assets/icons/kr.png' },
  { key: 'georgia', icon: '/assets/icons/ge.png' },
  { key: 'pakistan', icon: '/assets/icons/pk.png' },
];

const DMC = computed(() =>
  homeData.value.services.map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title || service.name,
    descr: service.shortDescription || service.subtitle,
    url: cmsAsset(service.previewImage),
    imageSettings: service.previewImageSettings,
  })),
);

const mainWhyCategory = computed(() => homeData.value.whyWe[0] || null);

const whyFactsLimit = computed(() => {
  const rawValue = Number(cmsText('home.why_facts_limit', '2'));
  return Number.isFinite(rawValue) && rawValue > 0 ? Math.floor(rawValue) : 2;
});

const whyBlockTitle = computed(() =>
  mainWhyCategory.value?.title || cmsText('home.why_title', t('home.why_title')),
);

const whyBlockSubtitle = computed(() =>
  mainWhyCategory.value?.subtitle || mainWhyCategory.value?.description || cmsText('home.why_text', t('home.why_text')),
);

const items = computed(() =>
  homeData.value.whyWe
    .flatMap((category) => category.facts || [])
    .slice(0, whyFactsLimit.value)
    .map((fact, index) => ({
      number: String(index + 1).padStart(2, '0'),
      image: cmsAsset(fact.imageUrl),
      imageSettings: fact.imageSettings,
      title: fact.title,
      description: fact.description,
    })),
);

const newsList = computed(() =>
  homeData.value.latestNews.map((item) => ({
    id: item.id,
    slug: item.slug,
    image: cmsAsset(item.previewImage),
    imageSettings: item.previewImageSettings,
    title: item.title,
    description: item.excerpt || item.title,
    date: formatBackendDate(item.publishedAt, locale.value),
  })),
);

const loadHome = async () => {
  try {
    const payload = await getHome(getApiLocale(locale.value));
    homeData.value = {
      ...payload,
      recommendedTours: (payload.recommendedTours || []).map((tour) => ({
        ...tour,
        image: cmsAsset(tour.image || tour.mainImage) || '/assets/icons/card1.webp',
        countrySlug: tour.countrySlug || null,
      })),
    };
  } catch (error) {
    notifyError(error.message || t('notifications.loadHomeFailed'), t('notifications.homeUnavailable'));
  }
};

watch(() => locale.value, loadHome);
onMounted(loadHome);
</script>

<template>
  <div class="page-wrapper relative">
    <!-- Hero секция -->
    <section>
      <div class="hero-section">
        <div
          class="hero-image"
          :style="heroBanner?.imageUrl ? backgroundImageStyle(cmsAsset(heroBanner.imageUrl), heroBanner.imageSettings) : undefined"
        ></div>
        <AppContainer>
          <div class="hero-content">
            <h1>{{ heroBanner?.title || cmsText('home.hero_title', $t('home.hero_title')) }}</h1>
          </div>
        </AppContainer>
      </div>

      <AppContainer>
        <div class="wrapper-card">
          <div class="card-item" v-for="(item, index) in mass" :key="index">
            <div
              class="card-item-title flex items-center justify-between mb-[25px]"
            >
              <h3>{{ item.title }}</h3>
              <router-link
                :to="item.route"
                class="text-[#88888c] underline italic"
                >{{ cmsText('home.more', $t('home.more')) }}</router-link
              >
            </div>
            <div class="description">
              <p class="max-w-[235px]">{{ item.descr }}</p>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <!-- Секция туров -->
    <section class="mb-[50px]">
      <AppContainer>
        <div class="w-full border border-[#f6f6f6] mb-[50px]"></div>
        <div class="flex justify-between mb-[15px]">
          <h2 class="text-[24px] lg:text-[32px] font-medium">
            <span class="lg:hidden uppercase font-medium italic">{{
              cmsText('home.tours_mobile', $t('home.tours_mobile'))
            }}</span>
            <span class="hidden lg:inline">{{ cmsText('home.tours_title', $t('home.tours_title')) }}</span>
          </h2>
          <Button
            :title="cmsText('home.view_all', $t('home.view_all'))"
            :style="'px-[34px] border-[#bfbfbf]'"
            @click="$router.push({ name: 'tours' })"
          />
        </div>
        <div class="location-buttons flex gap-[10px] mb-[50px] flex-wrap">
          <button
            v-for="(item, i) in buttons"
            :key="i"
            @click="setCategory(item.category)"
            class="flex items-center gap-[10px] border rounded-[10px] px-[10px] cursor-pointer transition-all duration-200"
            :class="{
              'bg-[#285aff] text-white border-[#285aff]':
                activeCategory === item.category,
              'hover:bg-gray-50': activeCategory !== item.category,
            }"
          >
            <img
              v-if="item.url"
              class="w-[18px] h-[14px] rounded-[10px]"
              :src="item.url"
              alt=""
              loading="lazy"
              decoding="async"
            />
            {{ item.title }}
          </button>
        </div>
      </AppContainer>
      <Carousel
        :key="activeCategory"
        :items="filteredTours"
        :visible-count="tourVisible"
        :gap="14"
        :autoplay="toursAutoplay"
      >
        <template #default="{ item }">
          <Card :tour="item" />
        </template>
      </Carousel>
    </section>

    <!-- Секция с планетой -->
    <section class="relative bg-black overflow-hidden mb-[20px]">
      <div
        class="relative z-10 max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-16 xl:px-[140px] pt-16 sm:pt-20 lg:pt-[80px] pb-40 sm:pb-48 lg:pb-28"
      >
        <div class="lg:max-w-[580px]">
          <h2
            class="text-white text-[28px] sm:text-[36px] lg:text-[48px] xl:text-[56px] font-light leading-[1.1] mb-6 lg:mb-[50px]"
          >
            {{ cmsText('home.planet_title', $t('home.planet_title')) }}
          </h2>
          <p
            class="text-[#a0a0a0] text-[14px] lg:text-[15px] leading-[1.6] mb-8 lg:mb-[50px] max-w-[460px]"
          >
            {{ cmsText('home.planet_text', $t('home.planet_text')) }}
          </p>
          <div
            class="w-full max-w-[360px] h-px bg-[#989898] mb-8 lg:mb-[50px]"
          ></div>
          <div>
            <h3
              class="text-white text-[13px] font-bold tracking-[0.12em] uppercase mb-5 lg:mb-[50px]"
            >
              {{ cmsText('home.countries_served', $t('home.countries_served')) }}
            </h3>
            <div class="grid grid-cols-2 gap-x-8 sm:gap-x-16 gap-y-3">
              <div class="flex flex-col gap-[11px]">
                <p
                  v-for="country in servedCountriesList.slice(0, 5)"
                  :key="country.key"
                  class="text-white flex items-center gap-[7px] text-[14px] lg:text-[16px]"
                >
                  <img
                    :src="country.icon"
                    class="w-5 h-5 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {{ $t(`servedCountries.${country.key}`) }}
                </p>
              </div>
              <div class="flex flex-col gap-[11px]">
                <p
                  v-for="country in servedCountriesList.slice(5)"
                  :key="country.key"
                  class="text-white flex items-center gap-[7px] text-[14px] lg:text-[16px]"
                >
                  <img
                    :src="country.icon"
                    class="w-5 h-5 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {{ $t(`servedCountries.${country.key}`) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <img
        src="/assets/icons/planet.png"
        alt="Globe"
        class="planet-glow absolute z-0 left-1/2 -translate-x-1/2 lg:left-auto lg:right-[-5%] xl:right-0 lg:translate-x-0 bottom-0 lg:bottom-50 translate-y-[40%] sm:translate-y-[35%] lg:translate-y-[25%] w-[280px] sm:w-[380px] lg:w-[600px] xl:w-[750px] pointer-events-none select-none"
        loading="lazy"
        decoding="async"
      />
    </section>

    <!-- Секция услуг -->
    <section class="mb-[70px]">
      <AppContainer>
        <div class="flex justify-between items-center mb-[10px]">
          <h2 class="text-[24px] lg:text-[32px] font-medium">
            <span class="lg:hidden uppercase font-medium italic">{{
              cmsText('home.services_mobile', $t('home.services_mobile'))
            }}</span>
            <span class="hidden lg:inline">{{
              cmsText('home.services_title', $t('home.services_title'))
            }}</span>
          </h2>
          <Button
            :title="cmsText('home.view_all', $t('home.view_all'))"
            :style="'px-[34px] border-[#bfbfbf]'"
            @click="$router.push({ name: 'services' })"
          />
        </div>
        <p class="tracking-[-1.5%] mb-[60px] text-[14px] lg:text-[16px]">
          {{ cmsText('home.services_text', $t('home.services_text')) }}
        </p>
        <div class="hidden lg:flex justify-center gap-[25px]">
          <CardDMS v-for="(item, i) in DMC" :key="i" :DMC="item" />
        </div>
      </AppContainer>
      <div class="lg:hidden">
        <Carousel
          :items="DMC"
          :visible-count="1"
          :gap="20"
          :autoplay="5000"
          :item-width="320"
        >
          <template #default="{ item }">
            <CardDMS :DMC="item" />
          </template>
        </Carousel>
      </div>
    </section>

    <!-- Секция Why We -->
    <section class="mb-[20px]">
      <AppContainer>
        <div class="w-full border border-[#b1b1b4] mb-8 lg:mb-[65px]"></div>
        <div class="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start mb-4 lg:mb-[25px]">
          <h2 class="text-[24px] lg:text-[32px] font-medium">
            <span class="lg:hidden uppercase font-medium italic">{{
              whyBlockTitle
            }}</span>
            <span class="hidden lg:inline">{{ whyBlockTitle }}</span>
          </h2>
          <Button
            :title="cmsText('home.view_all', $t('home.view_all'))"
            :style="'px-[34px] border-[#bfbfbf] shrink-0 self-start'"
            @click="$router.push({ name: 'whyWe' })"
          />
        </div>
        <p
          class="text-[12px] lg:text-[16px] leading-[1.5] lg:leading-[1.6] mb-6 lg:mb-[40px] text-[#333]"
        >
          {{ whyBlockSubtitle }}
        </p>
        <CardGorzontalDMC
          v-for="(item, i) in items"
          :key="i"
          :item="item"
          :index="i"
        />
      </AppContainer>
    </section>

    <!-- Секция новостей -->
    <section class="mb-[70px]">
      <AppContainer>
        <div class="w-full border border-[#dddddf] mb-[60px]"></div>
        <div class="flex justify-between items-center mb-[25px]">
          <h2 class="text-[24px] lg:text-[32px] font-medium">
            <span class="lg:hidden uppercase font-medium italic">{{
              cmsText('home.news_mobile', $t('home.news_mobile'))
            }}</span>
            <span class="hidden lg:inline">{{ cmsText('home.news_title', $t('home.news_title')) }}</span>
          </h2>
          <Button
            :title="cmsText('home.view_all', $t('home.view_all'))"
            :style="'px-[34px] border-[#bfbfbf]'"
            @click="$router.push({ name: 'news' })"
          />
        </div>
        <Carousel
          :items="newsList"
          :visible-count="newsVisible"
          :gap="20"
          :autoplay="5000"
          :item-width="400"
        >
          <template #default="{ item }">
            <CardNews :news="item" />
          </template>
        </Carousel>
      </AppContainer>
    </section>
  </div>
</template>

<style scoped>
.planet-glow {
  filter: drop-shadow(0 0 60px rgba(255, 255, 255, 0.1))
    drop-shadow(0 0 30px rgba(255, 255, 255, 0.1))
    drop-shadow(0 0 80px rgba(255, 255, 255, 0.1));
}

/* Адаптив для мобильных */
@media (max-width: 768px) {
  .up-btn {
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
  }
}

.gorizontal:last-child {
  border-bottom: 0px solid#eeeeee;
}

.location-buttons button:focus {
  background-color: #285aff;
  border: 1px solid transparent;
  color: #fff;
}

.page-wrapper {
  position: relative;
}

/* Hero секция */
.hero-section {
  position: relative;
  height: 458px;
  width: 100%;
}

.hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 458px;
  background-image: url('/assets/icons/8ec662fe56344049271e593f6db12dfdb7df8bdb.webp');
  background-size: cover;
  background-position: center;
  z-index: 0;
}

/* Контент поверх картинки */
.hero-content {
  position: relative;
  z-index: 2;
  height: 458px;
  display: flex;
}

h1 {
  font-weight: 500;
  font-size: 55px;
  color: #fff;
  max-width: 500px;
  margin-top: 100px;
}

/* Карточки */
.wrapper-card {
  position: relative;
  margin-top: -100px;
  background-color: #fff;
  border-radius: 15px;
  display: flex;
  justify-content: space-between;
  border: 1px solid #e6e6e7;
  width: 100%;
  z-index: 3;
}

.card-item {
  flex: 1;
  padding: 23px;
}

.card-item:not(:last-child) {
  border-right: 1px solid #e6e6e7;
}

.card-item p {
  font-size: 12px;
  line-height: 1.3;
}

.card-item h3 {
  font-size: 24px;
  font-weight: 500;
  font-style: italic;
}

.mt-100px {
  margin-top: 100px;
}

.location-buttons button:focus,
.location-buttons button.active {
  background-color: #285aff;
  border: 1px solid transparent;
  color: #fff;
}

@media (max-width: 1200px) {
  h2 {
    font-size: 28px;
  }
  h1 {
    font-size: 40px;
    max-width: 400px;
  }
  .card-item h3 {
    font-size: 20px;
  }
  .card-item p {
    font-size: 11px;
  }
}

@media (max-width: 768px) {
  .mt-100px {
    margin-top: 50px;
  }
  h2 {
    font-size: 24px;
  }
  .location-buttons {
    padding-bottom: 10px;
  }
}

@media (max-width: 992px) {
  .wrapper-card {
    flex-wrap: wrap;
    margin-top: -15px;
  }
  .card-item {
    flex: 0 0 50%;
  }
  .card-item:nth-child(2) {
    border-right: none;
  }
  h1 {
    font-size: 32px;
    max-width: 300px;
    margin-top: 50px;
  }
  .hero-section {
    height: 458px;
  }
  .hero-image {
    height: 458px;
  }
  .hero-content {
    height: 458px;
  }
}

@media (max-width: 768px) {
  .wrapper-card {
    flex-direction: column;
    margin-top: -60px;
  }
  .description {
    display: none;
  }
  .card-item-title {
    margin: 0;
  }
  .card-item {
    flex: 0 0 100%;
  }
  .wrapper-card .card-item {
    padding: 15px;
  }
  .card-item:not(:last-child) {
    border-right: none;
    border-bottom: 1px solid #e6e6e7;
    padding: 15px;
  }
  h1 {
    font-size: 24px;
    max-width: 250px;
    margin-top: 100px;
  }
  .hero-section {
    height: 358px;
  }
  .hero-image {
    height: 358px;
    background-position: center center;
  }
  .hero-content {
    height: 358px;
  }
}

@media (min-width: 1921px) {
  .hero-section {
    height: 458px;
  }
  .hero-image {
    height: 458px;
  }
  .hero-content {
    height: 458px;
  }
  h1 {
    font-size: 55px;
    max-width: 600px;
    margin-top: 100px;
  }
}
</style>
