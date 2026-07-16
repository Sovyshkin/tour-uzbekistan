<template>
  <div class="wrapper" :class="{ 'full-width': noPadding }">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  noPadding: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.wrapper {
  padding: 26px 140px;
  font-family: 'Aeonik Pro', sans-serif;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* Исправлено: было .container.full-width */
.wrapper.full-width {
  padding: 0;
  max-width: 100%;
}

/* Планшеты */
@media (max-width: 1024px) {
  .wrapper {
    padding: 26px 80px;
  }
}

/* Маленькие планшеты */
@media (max-width: 768px) {
  .wrapper {
    padding: 15px 40px;
  }
}

/* Мобильные — твои 365px и около того */
@media (max-width: 480px) {
  .wrapper {
    padding: 35px 35px;
  }
}
</style>