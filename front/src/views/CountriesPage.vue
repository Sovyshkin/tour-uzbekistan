<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppContainer from '@/components/AppContainer.vue';
import { getApiLocale, getCountries, resolveAssetUrl } from '@/api';
import { useNotifications } from '@/composables/useNotifications';

const { t, locale } = useI18n();
const { error: notifyError } = useNotifications();
const countries = ref([]);
const isLoading = ref(false);

const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.countries'), path: null },
]);

const loadCountries = async () => {
  isLoading.value = true;

  try {
    const data = await getCountries(getApiLocale(locale.value));
    countries.value = (data || []).map((country) => ({
      slug: country.slug,
      name: country.name,
      intro: country.intro || '',
      image: resolveAssetUrl(country.heroImage || country.flagImage),
    }));
  } catch (error) {
    countries.value = [];
    notifyError(error.message || t('notifications.loadCountryFailed'), t('notifications.countryUnavailable'));
  } finally {
    isLoading.value = false;
  }
};

watch(() => locale.value, loadCountries);
onMounted(loadCountries);
</script>

<template>
  <main class="pb-16 sm:pb-24">
    <AppContainer>
      <nav class="mb-7 mt-7 hidden lg:flex" aria-label="Breadcrumb">
        <ol class="flex flex-wrap items-center gap-2 text-[14px] text-[#000]">
          <li v-for="(crumb, index) in breadcrumbs" :key="crumb.label" class="flex items-center gap-2">
            <router-link v-if="crumb.path" :to="crumb.path" class="transition hover:text-[#285aff]">
              {{ crumb.label }}
            </router-link>
            <span v-else class="text-[#888]">{{ crumb.label }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="text-[#000]">›</span>
          </li>
        </ol>
      </nav>

      <div class="mb-9 border-b border-[#e6e6e7] pb-7 sm:mb-12 sm:pb-9">
        <h1 class="text-[34px] font-normal leading-tight text-black sm:text-[46px]">
          {{ t('breadcrumbs.countries') }}
        </h1>
      </div>

      <div v-if="isLoading" class="py-16 text-center text-[15px] text-[#888]">...</div>
      <div v-else-if="countries.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
        <router-link
          v-for="country in countries"
          :key="country.slug"
          :to="`/countries/${country.slug}`"
          class="group overflow-hidden border border-[#e5e5e6] bg-white transition hover:border-[#285aff]"
        >
          <div class="h-[210px] overflow-hidden bg-[#f1f2f5] sm:h-[250px]">
            <img
              v-if="country.image"
              :src="country.image"
              :alt="country.name"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <div class="flex items-start justify-between gap-4 px-5 py-5 sm:px-6 sm:py-6">
            <div>
              <h2 class="text-[22px] font-medium leading-tight text-black">{{ country.name }}</h2>
              <p v-if="country.intro" class="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[#666]">
                {{ country.intro }}
              </p>
            </div>
            <span class="mt-1 text-[22px] leading-none text-[#285aff]">→</span>
          </div>
        </router-link>
      </div>
    </AppContainer>
  </main>
</template>
