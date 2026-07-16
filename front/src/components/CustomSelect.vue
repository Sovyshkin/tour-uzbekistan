<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: [String, Number, Object],
  placeholder: { type: String, default: 'Выбрать' },
  options: { type: Array, default: () => [] },
  type: { type: String, default: 'list' }, // 'list' | 'calendar' | 'counter'
  min: { type: Number, default: 1 },
  max: { type: Number, default: 10 },
  unit: { type: String, default: '' },
  border: { type: Boolean, default: true }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const containerRef = ref(null);

// ─── КАЛЕНДАРЬ (только для type === 'calendar') ───
const currentDate = ref(new Date());
const selectedDate = ref(null);

// Парсим начальное значение ТОЛЬКО если это строка и тип calendar
if (props.type === 'calendar' && typeof props.modelValue === 'string' && props.modelValue) {
  selectedDate.value = parseDate(props.modelValue);
}

const disableParentCarouselOverflow = () => {
  let parent = containerRef.value?.parentElement;
  while (parent) {
    if (parent.classList?.contains('carousel-wrapper') || 
        parent.classList?.contains('carousel-container')) {
      parent.style.overflow = 'visible';
    }
    parent = parent.parentElement;
  }
};

// Переведённые названия месяцев
const monthNames = [
  t('calendar.january'), t('calendar.february'), t('calendar.march'), t('calendar.april'),
  t('calendar.may'), t('calendar.june'), t('calendar.july'), t('calendar.august'),
  t('calendar.september'), t('calendar.october'), t('calendar.november'), t('calendar.december')
];

// Переведённые дни недели
const weekDays = [
  t('calendar.mon'), t('calendar.tue'), t('calendar.wed'),
  t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')
];

const calendarDays = computed(() => {
  if (props.type !== 'calendar') return [];
  
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay() || 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const days = [];
  const today = new Date();

  // Пустые ячейки
  for (let i = 1; i < startDay; i++) days.push({ type: 'empty' });

  // Дни месяца
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({
      type: 'day',
      day: d,
      isToday: isSameDay(date, today),
      isSelected: selectedDate.value && isSameDay(date, selectedDate.value),
      isPast: date < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    });
  }
  return days;
});

const displayMonth = computed(() => {
  return `${monthNames[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`;
});

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const [d, m, y] = str.split('.').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function prevMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1);
}

function nextMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1);
}

function selectDay(dayObj) {
  if (dayObj.isPast) return;
  const date = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), dayObj.day);
  selectedDate.value = date;
  emit('update:modelValue', formatDate(date));
  close();
}

function clearSelection() {
  selectedDate.value = null;
  emit('update:modelValue', '');
}

// ─── СЧЁТЧИК (только для type === 'counter') ───
const count = ref(typeof props.modelValue === 'number' ? props.modelValue : props.min);
const increment = () => { if (count.value < props.max) count.value++; emit('update:modelValue', count.value); };
const decrement = () => { if (count.value > props.min) count.value--; emit('update:modelValue', count.value); };

// ─── СПИСОК (type === 'list') ───
const selectOption = (opt) => {
  emit('update:modelValue', opt);
  close();
};

// ─── ОБЩЕЕ ───
const toggle = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    disableParentCarouselOverflow();
  }
};
const close = () => (isOpen.value = false);

function onClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) close();
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));

// Синхронизация v-model для календаря
watch(() => props.modelValue, (val) => {
  if (props.type === 'calendar' && typeof val === 'string' && val) {
    selectedDate.value = parseDate(val);
  }
  if (props.type === 'counter' && typeof val === 'number') {
    count.value = val;
  }
});
</script>

<template>
  <div ref="containerRef" class="custom-select relative flex-1 min-w-[140px]">
    
    <!-- Триггер -->
    <button
      @click="toggle"
      class="trigger w-full flex items-center justify-between px-4 py-3 bg-white text-[14px] border-[#e6e6e7] hover:bg-[#f9f9f9] transition cursor-pointer"
      :class="{'border-r': border}"
    >
      <!-- Counter -->
      <span v-if="type === 'counter'" class="text-[#333]">
        {{ count }} {{ unit }}
      </span>
      <!-- Calendar / List -->
      <span v-else-if="modelValue" class="text-[#333] truncate">
        {{ typeof modelValue === 'object' ? modelValue.label : modelValue }}
      </span>
      <span v-else class="text-[#888]">{{ placeholder }}</span>

      <div class="flex items-center gap-2 ml-2">
        <button v-if="modelValue && type === 'calendar'" @click.stop="clearSelection" class="p-0.5 hover:bg-[#f0f0f0] rounded-full">
          <svg class="w-3 h-3 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <svg class="w-4 h-4 text-[#888] transition-transform" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </button>

    <!-- LIST -->
    <div v-if="isOpen && type === 'list'" class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e7] rounded-[8px] shadow-lg z-50 py-1 max-h-[280px] overflow-y-auto">
      <button v-for="opt in options" :key="opt.id || opt" @click="selectOption(opt)" class="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-left hover:bg-[#f5f5f5] transition" :class="{ 'bg-[#f0f4ff] text-[#285aff]': modelValue === opt || modelValue?.id === opt.id }">
        <img v-if="opt.icon" :src="opt.icon" class="w-5 h-4 rounded-[4px] object-cover" />
        <span>{{ opt.label || opt }}</span>
      </button>
    </div>

    <!-- CALENDAR -->
    <div v-if="isOpen && type === 'calendar'" class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e7] rounded-[12px] shadow-xl z-50 p-4 w-[320px]">
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="p-2 hover:bg-[#f5f5f5] rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span class="text-[15px] font-medium select-none">{{ displayMonth }}</span>
        <button @click="nextMonth" class="p-2 hover:bg-[#f5f5f5] rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-2">
        <span v-for="day in weekDays" :key="day" class="text-center text-[11px] text-[#888] font-medium py-1">{{ day }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <template v-for="(item, idx) in calendarDays" :key="idx">
          <div v-if="item.type === 'empty'" class="h-9"></div>
          <button v-else @click="selectDay(item)" :disabled="item.isPast" class="h-9 w-9 mx-auto flex items-center justify-center rounded-lg text-[13px] transition" :class="{ 'text-[#ccc] cursor-not-allowed': item.isPast, 'ring-1 ring-[#285aff] text-[#285aff] font-medium': item.isToday && !item.isSelected, 'bg-[#285aff] text-white font-medium': item.isSelected, 'hover:bg-[#f0f4ff] hover:text-[#285aff]': !item.isPast && !item.isSelected }">
            {{ item.day }}
          </button>
        </template>
      </div>
      <div v-if="modelValue" class="mt-3 pt-3 border-t border-[#f0f0f0] flex justify-end">
        <button @click="clearSelection" class="text-[12px] text-[#285aff] hover:underline">{{ t('calendar.clear') }}</button>
      </div>
    </div>

    <!-- COUNTER -->
    <div v-if="isOpen && type === 'counter'" class="dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e7] rounded-[8px] shadow-lg z-50 p-4 w-[200px]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[14px] capitalize">{{ unit }}</span>
      </div>
      <div class="flex items-center justify-between bg-[#f5f5f5] rounded-[8px] px-3 py-2">
        <button @click="decrement" class="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow text-[16px] text-[#285aff] hover:bg-[#f0f0f0] transition disabled:opacity-30" :disabled="count <= min">−</button>
        <span class="text-[16px] font-medium">{{ count }}</span>
        <button @click="increment" class="w-8 h-8 flex items-center justify-center rounded-full bg-[#285aff] text-white text-[16px] hover:bg-[#1e4af5] transition disabled:opacity-30" :disabled="count >= max">+</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-select:first-child .trigger { border-radius: 8px 0 0 8px; }
.custom-select:last-child .trigger { border-radius: 0 8px 8px 0; border-right: none; }
.dropdown { animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
</style>