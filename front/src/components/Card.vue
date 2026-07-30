<script setup>
import { useI18n } from 'vue-i18n';
import { imageObjectStyle } from '@/api';

const { t } = useI18n();
defineProps({
  tour: {
    type: Object,
    required: true,
  },
  country: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <div
    class="card w-full rounded-[15px] border border-[#e6e6e7] hover:shadow-lg transition bg-white overflow-hidden flex flex-col h-full"
  >
    <!-- Картинка -->
    <div
      class="img cursor-pointer flex-shrink-0 overflow-hidden rounded-t-[15px] h-[220px] sm:h-[260px] lg:h-[284px]"
      @click="
        $router.push({
          path: `/tours/${tour.slug || tour.id}`,
          query: country ? { country: country } : {},
        })
      "
    >
      <img
        class="object-cover rounded-t-[15px] h-full w-full"
        :src="tour.image"
        :alt="tour.title"
        :style="imageObjectStyle(tour.imageSettings)"
        loading="lazy"
        decoding="async"
      />
    </div>

    <!-- Контентная часть (растягивается, чтобы прижать кнопку вниз) -->
    <div class="flex flex-col flex-1">
      <!-- Название и маршрут (обрезаются) -->
      <div
        class="description px-4 py-3 lg:px-[15px] lg:py-[10px] h-full border-b border-b-[#d2d2d4] cursor-pointer"
        @click="
          $router.push({
            path: `/tours/${tour.slug || tour.id}`,
            query: country ? { country: country } : {},
          })
        "
      >
        <p class="text-[14px] sm:text-[16px] font-medium leading-snug line-clamp-2">
          {{ tour.title }}
        </p>
        <p class="text-[11px] sm:text-[12px] font-light text-[#666] mt-0.5 line-clamp-1">
          {{ tour.route }}
        </p>
      </div>

      <!-- Дата (обрезается) -->
      <div
        v-if="tour.date"
        class="description px-4 py-3 lg:px-[15px] lg:py-[10px] border-b border-b-[#d2d2d4] cursor-pointer"
        @click="
          $router.push({
            path: `/tours/${tour.slug || tour.id}`,
            query: country ? { country: country } : {},
          })
        "
      >
        <p class="text-[11px] sm:text-[12px] font-light text-[#666] mt-0.5 line-clamp-1">
          {{ t('openCard.date_label') }} {{ tour.date }}
        </p>
      </div>

      <!-- Длительность (обрезается) -->
      <div
        v-if="tour.duration"
        class="description px-4 py-3 lg:px-[15px] lg:py-[10px] border-b border-b-[#d2d2d4] cursor-pointer"
        @click="
          $router.push({
            path: `/tours/${tour.slug || tour.id}`,
            query: country ? { country: country } : {},
          })
        "
      >
        <p class="text-[11px] sm:text-[12px] font-light text-[#666] mt-0.5 line-clamp-1">
          {{ t('openCard.duration_label') }} {{ tour.duration.day }}
          {{ t('openCard.days') }} /
          {{ tour.duration.night }}
          {{ t('openCard.nights', tour.duration.night) }}
        </p>
      </div>

      <div
        v-if="tour.priceFrom"
        class="description px-4 py-3 lg:px-[15px] lg:py-[10px] border-b border-b-[#d2d2d4]"
      >
        <p class="text-[14px] sm:text-[16px] font-medium text-[#FF00E7]">
          {{ tour.priceFrom }}{{ tour.currency ? ` ${tour.currency}` : '' }}
        </p>
      </div>

      <!-- Кнопка (всегда внизу) -->
      <div class="button px-4 py-3 lg:px-[15px] lg:py-[10px] mt-auto">
        <button
          class="cursor-pointer bg-[#ff00e7] w-full text-white rounded-[10px] py-[8px] text-[14px] hover:bg-[#eb02d3] transition"
          @click="
            $router.push({
              path: `/tours/${tour.slug || tour.id}`,
              query: country ? { country: country } : {},
            })
          "
        >
          {{ tour.priceFrom ? t('openCard.buy') : t('openCard.more_details') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Обрезка текста с троеточием */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
