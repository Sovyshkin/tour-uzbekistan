<script setup>
import { useDialog } from '@/composables/useDialog';

const { dialogState, closeDialog, confirmDialog } = useDialog();
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="dialogState.isOpen"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(10,10,18,0.52)] px-4 backdrop-blur-[3px]"
        @click.self="closeDialog"
      >
        <div
          class="w-full max-w-[460px] overflow-hidden rounded-[24px] border bg-white shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
          :class="{
            'border-[#d7f0df]': dialogState.tone === 'success',
            'border-[#ffd4ea]': dialogState.tone === 'error',
            'border-[#d9e7ff]': dialogState.tone === 'info',
          }"
        >
          <div class="px-6 pb-6 pt-7 sm:px-8">
            <div
              class="mb-5 flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-medium"
              :class="{
                'bg-[#eefbf1] text-[#1d7f43]': dialogState.tone === 'success',
                'bg-[#fff1f8] text-[#b0006d]': dialogState.tone === 'error',
                'bg-[#eff6ff] text-[#285aff]': dialogState.tone === 'info',
              }"
            >
              <span v-if="dialogState.tone === 'success'">+</span>
              <span v-else-if="dialogState.tone === 'error'">!</span>
              <span v-else>i</span>
            </div>

            <h3 class="mb-3 text-[28px] font-medium leading-[1.05] text-black">
              {{ dialogState.title }}
            </h3>
            <p class="mb-8 text-[14px] leading-[1.65] text-[#5b5b63]">
              {{ dialogState.message }}
            </p>

            <div class="flex justify-end">
              <button
                type="button"
                class="min-w-[148px] rounded-[12px] bg-[#ff00cc] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-[#e000b8]"
                @click="confirmDialog"
              >
                {{ dialogState.confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.22s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
