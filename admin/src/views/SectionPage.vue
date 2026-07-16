<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const sectionTitle = computed(() => String(route.meta.title ?? 'Раздел'));
const sectionDescription = computed(() =>
  String(route.meta.description ?? 'Этот раздел уже подключен к роутингу и готов для дальнейшей реализации.'),
);
</script>

<template>
  <el-card shadow="never" class="section-card">
    <div class="section-eyebrow">Раздел админки</div>
    <h2 class="section-title">{{ sectionTitle }}</h2>
    <p class="section-description">
      {{ sectionDescription }}
    </p>
  </el-card>
</template>

<style scoped>
.section-card {
  border-radius: 8px;
  min-width: 0;
}

.section-eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-title {
  margin: 12px 0 8px;
  font-size: 28px;
  line-height: 1.15;
  color: #111827;
  overflow-wrap: anywhere;
}

.section-description {
  margin: 0;
  max-width: 720px;
  font-size: 15px;
  line-height: 1.6;
  color: #4b5563;
}

@media (max-width: 720px) {
  .section-title {
    font-size: 22px;
  }

  .section-description {
    font-size: 14px;
  }
}
</style>
