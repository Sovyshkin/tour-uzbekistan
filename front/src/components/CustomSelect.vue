<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: [String, Number, Object],
  placeholder: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  type: { type: String, default: 'list' }, // 'list' | 'calendar' | 'counter'
  min: { type: Number, default: 1 },
  max: { type: Number, default: 10 },
  unit: { type: String, default: '' },
  showChildAges: { type: Boolean, default: false },
  ageModelValue: { type: Array, default: () => [] },
  childAgeLabel: { type: String, default: '' },
  childAgeUnit: { type: String, default: '' },
  allowedWeekdays: { type: Array, default: () => [] },
  dateAvailability: { type: Object, default: () => ({}) },
  border: { type: Boolean, default: true }
});

const emit = defineEmits(['update:modelValue', 'update:ageModelValue']);
const displayPlaceholder = computed(() => props.placeholder || t('register.select_partner'));

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
  const allowedWeekdays = props.allowedWeekdays.map(Number).filter((day) => day >= 1 && day <= 7);

  // Пустые ячейки
  for (let i = 1; i < startDay; i++) days.push({ type: 'empty' });

  // Дни месяца
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isoDate = formatIsoDate(date);
    const isoWeekday = date.getDay() || 7;
    const availability = props.dateAvailability?.[isoDate] || null;
    const isWeekdayDisabled = allowedWeekdays.length > 0 && !allowedWeekdays.includes(isoWeekday);
    const isUnavailableByIncoming = Object.keys(props.dateAvailability || {}).length > 0 && !availability;
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    days.push({
      type: 'day',
      day: d,
      isoDate,
      availability,
      isToday: isSameDay(date, today),
      isSelected: selectedDate.value && isSameDay(date, selectedDate.value),
      isPast,
      isDisabled: isPast || isWeekdayDisabled || isUnavailableByIncoming,
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

function formatIsoDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function formatAvailabilityPrice(availability) {
  if (!availability?.minPrice) return '';
  const price = Number(availability.minPrice);
  const formatted = Number.isFinite(price)
    ? price.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
    : availability.minPrice;
  return `от ${formatted} ${availability.currency || ''}`.trim();
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
  if (dayObj.isDisabled) return;
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
const ageOptions = computed(() => Array.from({ length: 19 }, (_, age) => age));
const childAges = computed(() =>
  Array.from({ length: Math.max(0, count.value) }, (_, index) => {
    const age = Number(props.ageModelValue[index]);
    return Number.isFinite(age) ? Math.min(18, Math.max(0, age)) : 0;
  }),
);
const childAgeSummary = computed(() => {
  if (!props.showChildAges || count.value <= 0) {
    return '';
  }

  return childAges.value.map((age) => `${age}`).join(', ');
});
const formatChildAge = (age) => {
  const value = Number(age);
  if (t('calendar.january') !== 'Январь') {
    return `${value} ${props.childAgeUnit}`;
  }

  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return `${value} год`;
  }
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return `${value} года`;
  }
  return `${value} лет`;
};
const emitCount = () => {
  emit('update:modelValue', count.value);
  if (props.showChildAges) {
    emit('update:ageModelValue', childAges.value);
  }
};
const increment = () => {
  if (count.value < props.max) {
    count.value++;
    emitCount();
  }
};
const decrement = () => {
  if (count.value > props.min) {
    count.value--;
    emitCount();
  }
};
const updateChildAge = (index, value) => {
  const nextAges = [...childAges.value];
  const age = Number(value);
  nextAges[index] = Number.isFinite(age) ? Math.min(18, Math.max(0, age)) : 0;
  emit('update:ageModelValue', nextAges);
};

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
    if (props.showChildAges) {
      emit('update:ageModelValue', childAges.value);
    }
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
        {{ count }} {{ unit }}<span v-if="childAgeSummary" class="text-[#888]"> · {{ childAgeSummary }}</span>
      </span>
      <!-- Calendar / List -->
      <span v-else-if="modelValue" class="text-[#333] truncate">
        {{ typeof modelValue === 'object' ? modelValue.label : modelValue }}
      </span>
      <span v-else class="text-[#888]">{{ displayPlaceholder }}</span>

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
        <img
          v-if="opt.icon"
          :src="opt.icon"
          class="w-5 h-4 rounded-[4px] object-cover"
          loading="lazy"
          decoding="async"
        />
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
          <button
            v-else
            @click="selectDay(item)"
            :disabled="item.isDisabled"
            class="calendar-day mx-auto flex flex-col items-center justify-center rounded-lg transition"
            :class="{
              'calendar-day--disabled': item.isDisabled,
              'calendar-day--today': item.isToday && !item.isSelected && !item.isDisabled,
              'calendar-day--selected': item.isSelected,
              'calendar-day--available': item.availability && !item.isDisabled && !item.isSelected,
            }"
          >
            <span class="calendar-day__number">{{ item.day }}</span>
            <span v-if="item.availability && !item.isDisabled" class="calendar-day__count">
              {{ item.availability.tourCount }}
            </span>
            <span v-if="item.availability && !item.isDisabled" class="calendar-day__price">
              {{ formatAvailabilityPrice(item.availability) }}
            </span>
          </button>
        </template>
      </div>
      <div v-if="modelValue" class="mt-3 pt-3 border-t border-[#f0f0f0] flex justify-end">
        <button @click="clearSelection" class="text-[12px] text-[#285aff] hover:underline">{{ t('calendar.clear') }}</button>
      </div>
    </div>

    <!-- COUNTER -->
    <div
      v-if="isOpen && type === 'counter'"
      class="dropdown counter-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e7] rounded-[12px] shadow-lg z-50 p-4"
      :class="showChildAges && count > 0 ? 'w-[320px]' : 'w-[200px]'"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-[14px] capitalize">{{ unit }}</span>
      </div>
      <div class="flex items-center justify-between bg-[#f5f5f5] rounded-[8px] px-3 py-2">
        <button @click="decrement" class="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow text-[16px] text-[#285aff] hover:bg-[#f0f0f0] transition disabled:opacity-30" :disabled="count <= min">−</button>
        <span class="text-[16px] font-medium">{{ count }}</span>
        <button @click="increment" class="w-8 h-8 flex items-center justify-center rounded-full bg-[#285aff] text-white text-[16px] hover:bg-[#1e4af5] transition disabled:opacity-30" :disabled="count >= max">+</button>
      </div>
      <div v-if="showChildAges && count > 0" class="child-age-panel mt-4 pt-4 border-t border-[#eeeeef]">
        <div
          v-for="(_, index) in childAges"
          :key="index"
          class="child-age-row"
        >
          <span class="child-age-title">
            {{ childAgeLabel ? childAgeLabel.replace('{number}', index + 1) : `Child ${index + 1}` }}
          </span>
          <select
            :value="childAges[index]"
            class="child-age-select"
            @change="updateChildAge(index, $event.target.value)"
          >
            <option v-for="age in ageOptions" :key="age" :value="age">
              {{ formatChildAge(age) }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-select:first-child .trigger { border-radius: 8px 0 0 8px; }
.custom-select:last-child .trigger { border-radius: 0 8px 8px 0; border-right: none; }
.dropdown { animation: fadeIn 0.15s ease; }
.calendar-day {
  width: 40px;
  min-height: 40px;
  padding: 3px 2px;
  color: #222;
  font-size: 12px;
}
.calendar-day--available {
  background: #f0f6ff;
  color: #285aff;
}
.calendar-day--available:hover {
  background: #e3edff;
}
.calendar-day--today {
  box-shadow: inset 0 0 0 1px #285aff;
  color: #285aff;
  font-weight: 600;
}
.calendar-day--selected {
  background: #285aff;
  color: #fff;
  font-weight: 600;
}
.calendar-day--disabled {
  color: #c9c9cc;
  cursor: not-allowed;
  opacity: 0.55;
}
.calendar-day__number {
  line-height: 1;
}
.calendar-day__count {
  margin-top: 2px;
  min-width: 16px;
  padding: 1px 4px;
  border-radius: 999px;
  background: currentColor;
  color: #fff;
  font-size: 9px;
  line-height: 1.1;
}
.calendar-day--selected .calendar-day__count {
  background: #fff;
  color: #285aff;
}
.calendar-day__price {
  max-width: 38px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 8px;
  font-weight: 600;
  line-height: 1.1;
}
.counter-dropdown {
  min-width: 200px;
}
.child-age-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.child-age-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  align-items: center;
  gap: 12px;
}
.child-age-title {
  color: #333;
  font-size: 13px;
  line-height: 1.2;
}
.child-age-select {
  width: 100%;
  height: 36px;
  border: 1px solid #e0e0e2;
  border-radius: 8px;
  background: #fff;
  padding: 0 10px;
  color: #111;
  font-size: 13px;
  outline: none;
}
.child-age-select:focus {
  border-color: #285aff;
  box-shadow: 0 0 0 2px rgba(40, 90, 255, 0.12);
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
</style>
