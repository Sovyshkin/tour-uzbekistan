<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="page-wrapper">
    <!-- Фон -->
    <div class="bg-image" />

    <!-- Затемнение + размытие -->
    <div class="overlay" />

    <!-- Контент -->
    <div class="content">
      <!-- Спиннер -->
      <div class="spinner">
        <div
          class="dot"
          v-for="i in 8"
          :key="i"
          :style="{ animationDelay: `${(i - 1) * 0.12}s` }"
        />
      </div>

      <!-- Текст -->
      <h1 class="title">
        {{ t('technical.title') }}
        <span class="highlight">{{ t('technical.highlight') }}</span>
      </h1>
      <p class="subtitle">
        {{ t('technical.subtitle') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-image {
  position: absolute;
  inset: 0;
  background-image: url('/assets/icons/zona-turbulentnosti.jpg');
  background-size: cover;
  background-position: center;
  filter: blur(8px);
  transform: scale(1.1); /* Чтобы blur не обрезал края */
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: #fff;
  padding: 20px;
  max-width: 700px;
}

/* Спиннер */
.spinner {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 0 auto 30px;
}

.dot {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  margin: -5px 0 0 -5px;
  animation: orbit 1.2s linear infinite;
  opacity: 0;
}

.dot:nth-child(1) {
  transform: rotate(0deg) translateX(24px);
}
.dot:nth-child(2) {
  transform: rotate(45deg) translateX(24px);
}
.dot:nth-child(3) {
  transform: rotate(90deg) translateX(24px);
}
.dot:nth-child(4) {
  transform: rotate(135deg) translateX(24px);
}
.dot:nth-child(5) {
  transform: rotate(180deg) translateX(24px);
}
.dot:nth-child(6) {
  transform: rotate(225deg) translateX(24px);
}
.dot:nth-child(7) {
  transform: rotate(270deg) translateX(24px);
}
.dot:nth-child(8) {
  transform: rotate(315deg) translateX(24px);
}

@keyframes orbit {
  0% {
    opacity: 0;
    transform: rotate(var(--rot, 0deg)) translateX(24px) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: rotate(var(--rot, 0deg)) translateX(24px) scale(1);
  }
  80% {
    opacity: 1;
    transform: rotate(var(--rot, 0deg)) translateX(24px) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--rot, 0deg)) translateX(24px) scale(0.5);
  }
}

/* Фикс для правильного rotate в keyframes */
.dot:nth-child(1) {
  --rot: 0deg;
}
.dot:nth-child(2) {
  --rot: 45deg;
}
.dot:nth-child(3) {
  --rot: 90deg;
}
.dot:nth-child(4) {
  --rot: 135deg;
}
.dot:nth-child(5) {
  --rot: 180deg;
}
.dot:nth-child(6) {
  --rot: 225deg;
}
.dot:nth-child(7) {
  --rot: 270deg;
}
.dot:nth-child(8) {
  --rot: 315deg;
}

/* Текст */
.title {
  font-size: 36px;
  font-weight: 400;
  line-height: 1.2;
  margin-bottom: 12px;
}

.highlight {
  font-weight: 600;
  color: #fff;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

/* Адаптив */
@media (max-width: 640px) {
  .title {
    font-size: 26px;
  }
  .subtitle {
    font-size: 14px;
  }
  .spinner {
    width: 48px;
    height: 48px;
    margin-bottom: 24px;
  }
  .dot {
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
  }
  .dot:nth-child(1) {
    transform: rotate(0deg) translateX(18px);
  }
  .dot:nth-child(2) {
    transform: rotate(45deg) translateX(18px);
  }
  .dot:nth-child(3) {
    transform: rotate(90deg) translateX(18px);
  }
  .dot:nth-child(4) {
    transform: rotate(135deg) translateX(18px);
  }
  .dot:nth-child(5) {
    transform: rotate(180deg) translateX(18px);
  }
  .dot:nth-child(6) {
    transform: rotate(225deg) translateX(18px);
  }
  .dot:nth-child(7) {
    transform: rotate(270deg) translateX(18px);
  }
  .dot:nth-child(8) {
    transform: rotate(315deg) translateX(18px);
  }

  @keyframes orbit {
    0% {
      opacity: 0;
      transform: rotate(var(--rot, 0deg)) translateX(18px) scale(0.5);
    }
    20% {
      opacity: 1;
      transform: rotate(var(--rot, 0deg)) translateX(18px) scale(1);
    }
    80% {
      opacity: 1;
      transform: rotate(var(--rot, 0deg)) translateX(18px) scale(1);
    }
    100% {
      opacity: 0;
      transform: rotate(var(--rot, 0deg)) translateX(18px) scale(0.5);
    }
  }
}
</style>
