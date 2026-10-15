<script setup>
const props = defineProps({
  minValue: { type: Number, default: null },
  maxValue: { type: Number, default: null },
  title: { type: String, required: true },
  fromLabel: { type: String, required: true },
  toLabel: { type: String, required: true },
  unit: { type: String, default: '' },
  minimum: { type: Number, default: 0 },
  step: { type: Number, default: 1 },
});

const emit = defineEmits(['update:minValue', 'update:maxValue', 'change']);

const update = (side, event) => {
  const raw = event.target.value;
  const value = raw === '' ? null : Math.max(props.minimum, Number(raw));
  emit(side === 'min' ? 'update:minValue' : 'update:maxValue', value);
};

const commit = (side, event) => {
  const raw = event.target.value;
  const value = raw === '' ? null : Math.max(props.minimum, Number(raw));
  event.target.value = value ?? '';

  if (value !== null && side === 'min' && props.maxValue !== null && value > props.maxValue) {
    emit('update:maxValue', value);
  }
  if (value !== null && side === 'max' && props.minValue !== null && value < props.minValue) {
    emit('update:minValue', value);
  }
  emit('change');
};
</script>

<template>
  <fieldset>
    <legend class="text-[14px] xl:text-[15px] font-medium mb-3">{{ title }}</legend>
    <div class="grid grid-cols-2 gap-2">
      <label class="min-w-0">
        <span class="block text-[12px] text-[#666] mb-1">{{ fromLabel }}</span>
        <span class="flex items-center min-w-0 border border-[#d7dce5] rounded-[6px] focus-within:border-[#285aff]">
          <input
            :value="minValue ?? ''"
            type="number"
            inputmode="decimal"
            :min="minimum"
            :step="step"
            class="w-full min-w-0 px-2 py-2 text-[14px] outline-none bg-transparent"
            :aria-label="`${title}: ${fromLabel}`"
            placeholder="—"
            @input="update('min', $event)"
            @change="commit('min', $event)"
            @keyup.enter="$event.target.blur()"
          />
          <span v-if="unit" class="text-[11px] text-[#666] pr-2 shrink-0">{{ unit }}</span>
        </span>
      </label>
      <label class="min-w-0">
        <span class="block text-[12px] text-[#666] mb-1">{{ toLabel }}</span>
        <span class="flex items-center min-w-0 border border-[#d7dce5] rounded-[6px] focus-within:border-[#285aff]">
          <input
            :value="maxValue ?? ''"
            type="number"
            inputmode="decimal"
            :min="minimum"
            :step="step"
            class="w-full min-w-0 px-2 py-2 text-[14px] outline-none bg-transparent"
            :aria-label="`${title}: ${toLabel}`"
            placeholder="—"
            @input="update('max', $event)"
            @change="commit('max', $event)"
            @keyup.enter="$event.target.blur()"
          />
          <span v-if="unit" class="text-[11px] text-[#666] pr-2 shrink-0">{{ unit }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>
