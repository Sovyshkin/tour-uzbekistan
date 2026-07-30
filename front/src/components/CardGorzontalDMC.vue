<script setup>
import { imageObjectStyle } from '@/api';

defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
  narrowImage: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div
    class="border-t border-[#eeeeee] pt-6 pb-6 lg:pt-10 lg:pb-10"
    :class="{
      '!pt-0 !border-t-0': index === 0,
      'border-b border-[#eeeeee]': index === 1,
    }"
  >
    <div
      class="dmc-horizontal-card"
      :class="{ 'dmc-horizontal-card--narrow-image': narrowImage }"
    >
      <!-- Номер: только на десктопе -->
      <div class="hidden lg:block flex-shrink-0 w-[72px]">
        <span class="text-[42px] font-medium italic text-black leading-none">
          {{ item.number }}
        </span>
      </div>

      <!-- Картинка -->
      <div class="dmc-horizontal-card__image-wrap">
        <img
          :src="item.image"
          :alt="item.title"
          class="w-full h-[200px] sm:h-[240px] lg:h-[250px] object-cover rounded-[12px] lg:rounded-[16px]"
          :style="imageObjectStyle(item.imageSettings)"
          loading="lazy"
          decoding="async"
        />
      </div>

      <!-- Текст -->
      <div class="dmc-horizontal-card__content">
        <h3
          class="dmc-horizontal-card__title"
        >
          {{ item.title }}
        </h3>
        <!-- p 8px на мобильном -->
        <p
          class="dmc-horizontal-card__description"
        >
          {{ item.description }}
        </p>
      </div>
    </div>
  </div>
</template>
<style>
.gorizontal:last-child {
  border-bottom: 1px solid #eeeeee;
}

.dmc-horizontal-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}

.dmc-horizontal-card__image-wrap {
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
}

.dmc-horizontal-card__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.dmc-horizontal-card__title {
  font-size: 14px;
  font-weight: 500;
  font-style: italic;
  line-height: 1.12;
  color: #000;
}

.dmc-horizontal-card__description {
  display: none;
  color: #333;
  font-size: 12px;
  line-height: 1.5;
}

@media (min-width: 1024px) {
  .dmc-horizontal-card {
    grid-template-columns: 72px minmax(420px, 1fr) minmax(360px, 0.72fr);
    gap: 20px;
  }

  .dmc-horizontal-card--narrow-image {
    grid-template-columns: 72px minmax(380px, 0.82fr) minmax(420px, 1fr);
    column-gap: 28px;
  }

  .dmc-horizontal-card__image-wrap {
    border-radius: 16px;
  }

  .dmc-horizontal-card__content {
    gap: 12px;
    padding-top: 4px;
    max-width: 560px;
  }

  .dmc-horizontal-card__title {
    font-size: 20px;
  }

  .dmc-horizontal-card__description {
    display: block;
    font-size: 15px;
    line-height: 1.48;
    letter-spacing: 0;
  }
}

@media (min-width: 1280px) {
  .dmc-horizontal-card {
    grid-template-columns: 72px minmax(500px, 1fr) minmax(420px, 0.72fr);
  }

  .dmc-horizontal-card--narrow-image {
    grid-template-columns: 72px minmax(500px, 0.78fr) minmax(460px, 1fr);
  }

  .dmc-horizontal-card__description {
    font-size: 16px;
  }
}
</style>
