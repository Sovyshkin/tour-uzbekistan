<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import AppContainer from '@/components/AppContainer.vue';
import CardGorzontalDMC from '@/components/CardGorzontalDMC.vue';
import { useI18n } from 'vue-i18n';
import { getApiLocale, getWhyUsCategories, resolveAssetUrl } from '@/api';
import { useNotifications } from '@/composables/useNotifications';

const { t, locale } = useI18n();
const { error: notifyError } = useNotifications();

// Хлебные крошки (переведенные)
const breadcrumbs = computed(() => [
  { label: t('breadcrumbs.main'), path: '/' },
  { label: t('breadcrumbs.why_we'), path: null },
]);

const categories = ref([]);

const currentCategory = ref(0);
const currentPage = ref(1);

const totalCategories = computed(() => categories.value.length);
const totalPages = computed(() => categories.value[currentCategory.value]?.pages.length || 1);

const currentCategoryData = computed(() => categories.value[currentCategory.value] || {
  title: '',
  description: '',
  pages: [],
});
const currentItems = computed(() => currentCategoryData.value.pages[currentPage.value - 1] || []);

const prevCategory = () => {
  if (currentCategory.value > 0) {
    currentCategory.value--;
    currentPage.value = 1;
  }
};

const nextCategory = () => {
  if (currentCategory.value < totalCategories.value - 1) {
    currentCategory.value++;
    currentPage.value = 1;
  }
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
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

  range.forEach((i, pos) => {
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

const loadCategories = async () => {
  try {
    const data = await getWhyUsCategories(getApiLocale(locale.value));
    categories.value = data.map((category) => ({
      title: category.title,
      description: category.description,
      heroImage: resolveAssetUrl(category.heroImage),
      pages: Array.from({ length: Math.ceil((category.facts || []).length / 3) }, (_, pageIndex) =>
        (category.facts || []).slice(pageIndex * 3, pageIndex * 3 + 3).map((fact, factIndex) => ({
          number: String(pageIndex * 3 + factIndex + 1).padStart(2, '0'),
          image: resolveAssetUrl(fact.imageUrl),
          title: fact.title,
          description: fact.description,
        })),
      ),
    }));
    currentCategory.value = 0;
    currentPage.value = 1;
  } catch (error) {
    notifyError(error.message || t('notifications.loadWhyUsFailed'), t('notifications.whyUsUnavailable'));
  }
};

watch(() => locale.value, loadCategories);
onMounted(loadCategories);
</script>

<template>
  <div class="page-wrapper">
    <!-- Hero -->
    <section class="relative">
      <div class="hero-section">
        <div
          class="hero-image"
          :style="{ backgroundImage: `url('${currentCategoryData.heroImage || '/assets/icons/gorizontalDMC.webp'}')` }"
        />
      </div>
    </section>

    <AppContainer>
      <!-- Шапка со стрелками -->
      <div class="relative mb-[20px] lg:mb-[40px]">
        <!-- Левая стрелка -->
        <button
          @click="prevCategory"
          :disabled="currentCategory === 0"
          class="absolute flex left-[-30px] top-[10%] lg:top-[55%] -translate-y-1/2 lg:flex w-[44px] h-[44px] rounded-full border border-[#000] items-center justify-center hover:border-[#285aff] hover:text-[#285aff] disabled:opacity-30 disabled:cursor-not-allowed transition z-10 bg-transparent lg:bg-white cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Центр: крошки + заголовок + описание -->
        <div class="text-center mx-auto px-0 lg:px-16">
          <!-- Breadcrumbs (переведены) -->
          <nav class="mb-[10px] sm:mb-[15px] hidden lg:flex" aria-label="Breadcrumb">
            <ol class="flex items-center justify-center gap-2 text-[11px] sm:text-[12px] lg:text-[14px] text-[#000] flex-wrap">
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

          <!-- Заголовок категории (переведен) -->
          <h1 class="text-[32px] sm:text-[42px] lg:text-[54px] font-normal text-black mb-[15px] leading-tight">
            {{ currentCategoryData.title }}
          </h1>
          <!-- Описание категории (переведено) -->
          <p class="text-[13px] sm:text-[14px] lg:text-[15px] text-black leading-relaxed">
            {{ currentCategoryData.description }}
          </p>
        </div>

        <!-- Правая стрелка -->
        <button
          @click="nextCategory"
          :disabled="currentCategory === totalCategories - 1"
          class="absolute flex right-[-30px] top-[10%] lg:top-[55%] -translate-y-1/2 lg:flex w-[44px] h-[44px] rounded-full border border-[#000] items-center justify-center hover:border-[#285aff] hover:text-[#285aff] disabled:opacity-30 disabled:cursor-not-allowed transition z-10 bg-transparent lg:bg-white cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Cards (контент НЕ переведен) -->
      <div class="mb-[40px]">
        <CardGorzontalDMC
          v-for="(item, index) in currentItems"
          :key="`${currentCategory}-${currentPage}-${index}`"
          :item="item"
          :index="index"
          narrow-image
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
  .hero-section,
  .hero-image {
    height: 300px;
  }
  
  .pagination {
    justify-content: center;
  }
  
  .pagination-btn {
    min-width: 32px;
    height: 32px;
    font-size: 12px;
  }
}

@media (min-width: 1440px) {
  .hero-section,
  .hero-image {
    height: 458px;
  }
}
</style>
