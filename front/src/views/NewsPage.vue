<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppContainer from '@/components/AppContainer.vue';
import CardNews from '@/components/CardNews.vue';
import { useI18n } from 'vue-i18n';
import { formatBackendDate, getApiLocale, getNews, resolveAssetUrl } from '@/api';
import { useNotifications } from '@/composables/useNotifications';
const { t, locale } = useI18n();
const { error: notifyError } = useNotifications();

const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.news'), path: null },
]);

const currentPage = ref(1);
const perPage = 9;
const allNews = ref([]);
const meta = ref({
  page: 1,
  pageSize: 9,
  total: 0,
  totalPages: 1,
});

const totalPages = computed(() => meta.value.totalPages || 1);
const paginatedNews = computed(() => allNews.value);

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const nextPage = () => goToPage(currentPage.value + 1);
const prevPage = () => goToPage(currentPage.value - 1);

// Генерация массива страниц для отображения (с ...)
const displayedPages = computed(() => {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= totalPages.value; i++) {
    if (i === 1 || i === totalPages.value || (i >= currentPage.value - delta && i <= currentPage.value + delta)) {
      range.push(i);
    }
  }

  range.forEach((i) => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  });

  return rangeWithDots;
});

const loadNews = async () => {
  try {
    const data = await getNews({
      locale: getApiLocale(locale.value),
      page: currentPage.value,
      pageSize: perPage,
    });

    allNews.value = (data.items || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      image: resolveAssetUrl(item.previewImage),
      imageSettings: item.previewImageSettings,
      title: item.title,
      description: item.excerpt || item.title,
      date: formatBackendDate(item.publishedAt, locale.value),
    }));
    meta.value = data.meta;
  } catch (error) {
    notifyError(error.message || t('notifications.loadNewsFailed'), t('notifications.newsUnavailable'));
  }
};

watch(currentPage, loadNews);
watch(() => locale.value, loadNews);
onMounted(loadNews);
</script>

<template>
  <div class="page-wrapper">
    <AppContainer>
      <!-- Breadcrumbs -->
      <nav class="mb-[15px] sm:mb-[20px] mt-[30px] hidden lg:flex" aria-label="Breadcrumb">
        <ol class="flex items-center gap-2 text-[11px] sm:text-[12px] lg:text-[14px] text-[#000] flex-wrap">
          <li v-for="(crumb, i) in breadcrumbs" :key="i" class="flex items-center gap-2">
            <router-link v-if="crumb.path" :to="crumb.path" class="hover:text-[#285aff] transition">
              {{ crumb.label }}
            </router-link>
            <span v-else class="text-[#888]">{{ crumb.label }}</span>
            <span v-if="i < breadcrumbs.length - 1" class="text-[#000]">
              <svg class="w-3 h-3 transition-transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </li>
        </ol>
      </nav>

      <!-- Heading -->
      <h1 class="text-[36px] sm:text-[48px] lg:text-[54px] font-normal text-black mb-[30px] lg:mb-[50px] leading-tight">
        {{ t('breadcrumbs.news') }}
      </h1>

      <!-- Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-[20px] lg:gap-[25px] mb-[40px]">
        <CardNews
          v-for="item in paginatedNews"
          :key="item.id"
          :news="item"
        />
      </div>

      <!-- Пагинация -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          class="pagination-btn" 
          :class="{ disabled: currentPage === 1 }"
          @click="prevPage"
          :disabled="currentPage === 1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <template v-for="item in displayedPages" :key="item">
          <button 
            v-if="item === '...'" 
            class="pagination-dots" 
            disabled
          >...</button>
          <button 
            v-else 
            class="pagination-btn" 
            :class="{ active: currentPage === item }"
            @click="goToPage(item)"
          >{{ item }}</button>
        </template>

        <button 
          class="pagination-btn" 
          :class="{ disabled: currentPage === totalPages }"
          @click="nextPage"
          :disabled="currentPage === totalPages"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </AppContainer>
  </div>
</template>

<style scoped>
.page-wrapper {
  position: relative;
  padding-top: 20px;
}

/* Пагинация */
.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 80px;
  flex-wrap: wrap;
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  color: #1a1a1a;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.pagination-btn.active {
  background-color: #285aff;
  color: white;
}

.pagination-btn.disabled,
.pagination-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-dots {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #888;
}

@media (max-width: 768px) {
  .pagination {
    justify-content: center;
  }
  
  .pagination-btn {
    min-width: 32px;
    height: 32px;
    font-size: 12px;
  }
}
</style>
