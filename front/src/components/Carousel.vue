<template>
  <div 
    class="carousel-container select-none" 
    ref="containerRef"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
  >
    <div class="carousel-wrapper py-[20px]" ref="wrapperRef">
      <div 
        class="carousel-track flex items-stretch" 
        ref="trackRef"
        :class="{ 'justify-center w-full': !canNavigate }"
        :style="trackStyle"
        @transitionend="onTransitionEnd"
        @mousedown="onDragStart"
        @mousemove="onDragMove"
        @mouseup="onDragEnd"
        @mouseleave="onDragEnd"
        @touchstart.passive="onDragStart"
        @touchmove.passive="onDragMove"
        @touchend="onDragEnd"
      >
        <div 
          v-for="(item, idx) in displayItems" 
          :key="idx"
          class="carousel-item"
          :style="itemStyle"
        >
          <slot :item="item" />
        </div>
      </div>
    </div>

    <!-- Стрелки -->
    <button 
      v-if="canNavigate"
      class="carousel-btn prev"
      @click="prev"
      aria-label="Назад"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>

    <button 
      v-if="canNavigate"
      class="carousel-btn next"
      @click="next"
      aria-label="Вперёд"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  visibleCount: {
    type: Number,
    default: 4
  },
  gap: {
    type: Number,
    default: 14
  },
  autoplay: {
    type: Number,
    default: 0
  },
  itemWidth: {
    type: Number
  },
});

const containerRef = ref(null);
const wrapperRef = ref(null);
const trackRef = ref(null);

const currentIndex = ref(0);
const itemWidth = ref(0);
const disableTransition = ref(false);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragDelta = ref(0);
let autoplayInterval = null;
let resizeObserver = null;

/* ─── Дублирование элементов для бесконечности ─── */
const displayItems = computed(() => {
  if (props.items.length <= props.visibleCount) return props.items;
  const cloneStart = props.items.slice(-props.visibleCount);
  const cloneEnd = props.items.slice(0, props.visibleCount);
  return [...cloneStart, ...props.items, ...cloneEnd];
});

const canNavigate = computed(() => props.items.length > props.visibleCount);

// Индекс, с которого начинаются реальные элементы
const startOffset = computed(() => canNavigate.value ? props.visibleCount : 0);

// Максимальный индекс (последний реальный элемент в массиве displayItems)
const maxRealIndex = computed(() => {
  if (!canNavigate.value) return Math.max(0, props.items.length - 1);
  return props.items.length + props.visibleCount - 1;
});

/* ─── Размеры ─── */
const setDimensions = () => {
  if (!wrapperRef.value) return;
  const totalWidth = wrapperRef.value.clientWidth;
  const totalGaps = props.gap * (props.visibleCount - 1);
  let newWidth = Math.floor((totalWidth - totalGaps) / props.visibleCount);
  newWidth = Math.min(newWidth, 270);
  itemWidth.value = newWidth;
};

const baseTranslate = computed(() => currentIndex.value * (itemWidth.value + props.gap));

const trackStyle = computed(() => {
  const offset = isDragging.value ? dragDelta.value : 0;
  return {
    transform: `translateX(-${baseTranslate.value - offset}px)`,
    transition: (isDragging.value || disableTransition.value) 
      ? 'none' 
      : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
    gap: `${props.gap}px`
  };
});

const itemStyle = computed(() => ({
  width: props.itemWidth ? `${props.itemWidth}px` : `${itemWidth.value}px`,
  flexShrink: 0,
}));

/* ─── Бесконечная навигация ─── */
const next = () => {
  if (!canNavigate.value || isDragging.value) return;
  currentIndex.value++;
};

const prev = () => {
  if (!canNavigate.value || isDragging.value) return;
  currentIndex.value--;
};

/* ─── Телепорт без скачков ─── */
const onTransitionEnd = () => {
  if (disableTransition.value || !canNavigate.value) return;
  
  if (currentIndex.value >= props.items.length + startOffset.value) {
    disableTransition.value = true;
    currentIndex.value = startOffset.value;
    nextTick(() => {
      requestAnimationFrame(() => {
        disableTransition.value = false;
      });
    });
  }
  
  if (currentIndex.value <= startOffset.value - 1) {
    disableTransition.value = true;
    currentIndex.value = maxRealIndex.value - (startOffset.value - currentIndex.value);
    nextTick(() => {
      requestAnimationFrame(() => {
        disableTransition.value = false;
      });
    });
  }
};

/* ─── Drag / Swipe ─── */
const onDragStart = (e) => {
  if (!canNavigate.value) return;
  isDragging.value = true;
  dragStartX.value = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
  dragDelta.value = 0;
};

const onDragMove = (e) => {
  if (!isDragging.value) return;
  const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
  dragDelta.value = dragStartX.value - x;
};

const onDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  
  const threshold = itemWidth.value / 3;
  if (dragDelta.value > threshold) {
    next();
  } else if (dragDelta.value < -threshold) {
    prev();
  }
  
  dragDelta.value = 0;
};

/* ─── Autoplay ─── */
const startAutoplay = () => {
  if (!props.autoplay || !canNavigate.value) return;
  stopAutoplay();
  autoplayInterval = setInterval(() => {
    next();
  }, props.autoplay);
};

const stopAutoplay = () => {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
};

/* ─── Жизненный цикл ─── */
const updateDimensionsAndPosition = () => {
  setDimensions();
  if (!disableTransition.value) {
    disableTransition.value = true;
    currentIndex.value = startOffset.value;
    nextTick(() => {
      requestAnimationFrame(() => {
        disableTransition.value = false;
      });
    });
  }
};

onMounted(() => {
  nextTick(() => {
    setDimensions();
    currentIndex.value = startOffset.value;
  });
  
  window.addEventListener('resize', updateDimensionsAndPosition);
  
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateDimensionsAndPosition();
    });
    resizeObserver.observe(containerRef.value);
  }
  
  startAutoplay();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensionsAndPosition);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  stopAutoplay();
});

watch(() => props.items.length, () => {
  nextTick(() => {
    updateDimensionsAndPosition();
  });
});

watch([() => props.visibleCount, () => props.gap], () => {
  nextTick(() => {
    updateDimensionsAndPosition();
  });
});
</script>

<style scoped>
.carousel-container {
  position: relative;
  width: 100%;
}

.carousel-wrapper {
  overflow: hidden;
  border-radius: 15px;
}

.carousel-track {
  will-change: transform;
  display: flex;
}

.carousel-item {
  user-select: none;
  -webkit-user-drag: none;
  flex-shrink: 0;
}

.carousel-item > * {
  height: 100%;
}

/* Кнопки */
.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  background: #ffffff;
  border: 1px solid #000;
  border-radius: 50%;
  cursor: pointer;
  z-index: 20;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  color: #1a1a1a;
}

.carousel-btn:hover:not(:disabled) {
  background: #285aff;
  color: #fff;
  border-color: #285aff;
  box-shadow: 0 8px 24px rgba(40, 90, 255, 0.3);
}

.carousel-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.prev { left: 90px; }
.next { right: 90px; }

@media (max-width: 768px) {
  .carousel-btn { 
    display: none; 
  }
}
</style>