<script setup>
import { imageObjectStyle } from '@/api';

defineProps({
  DMC: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div
    class="card w-full max-w-[370px] rounded-[15px] border border-[#e5e5e6] bg-white overflow-hidden flex flex-col cursor-pointer"
    @click="
      $router.push({path: `/services/${DMC.slug || DMC.id}`})
    "
  >
    <div class="img overflow-hidden">
      <img
        class="w-full h-[200px] sm:h-[250px] lg:h-[300px] object-cover"
        :src="DMC.url"
        :alt="DMC.title"
        :style="imageObjectStyle(DMC.imageSettings)"
        loading="lazy"
        decoding="async"
      />
    </div>
    <div
      class="deskr text-center rounded-b-[15px] px-4 py-5 lg:px-[12px] lg:py-[28px] flex-1 flex flex-col justify-center"
    >
      <h3
        class="mb-2 lg:mb-[10px] text-[16px] sm:text-[18px] lg:text-[20px] font-medium tracking-[-0.04em] leading-snug"
      >
        {{ DMC.title }}
      </h3>
      <p
        class="text-[11px] sm:text-[12px] text-[#666] tracking-[-0.05em] leading-relaxed"
      >
        {{ DMC.descr }}
      </p>
    </div>
  </div>
</template>
