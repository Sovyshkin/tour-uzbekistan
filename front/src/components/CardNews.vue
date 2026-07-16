<script setup>
defineProps({
  news: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <article class="news-card bg-white rounded-[16px] overflow-hidden border border-[#e6e6e7] h-full flex flex-col cursor-pointer" @click="$router.push({path: `/news/${news.slug || news.id}`})">
    <!-- Картинка -->
    <div class="relative h-[160px] sm:h-[180px] lg:h-[200px] overflow-hidden">
      <img 
        :src="news.image" 
        :alt="news.title"
        class="w-full h-full object-cover"
        draggable="false"
      />
    </div>

    <!-- Контент -->
    <div class="p-4 lg:p-5 flex flex-col flex-1">
      <p class="text-[13px] sm:text-[14px] text-[#333] leading-[1.5] mb-3 lg:mb-4 line-clamp-3">
        {{ news.description }}
      </p>
      <span class="text-[11px] sm:text-[12px] text-[#888] mt-auto">
        {{ news.date }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.news-card {
  transition: box-shadow 0.2s ease;
}
.news-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
</style>
