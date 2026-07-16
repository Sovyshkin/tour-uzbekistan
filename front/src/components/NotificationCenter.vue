<script setup>
import { useNotifications } from '@/composables/useNotifications';

const { notifications, removeNotification } = useNotifications();
</script>

<template>
  <Teleport to="body">
    <div class="notification-center pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100vw-32px)] max-w-[420px] flex-col gap-3">
      <TransitionGroup name="notification">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="pointer-events-auto overflow-hidden rounded-[18px] border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
          :class="{
            'border-[#ffd4ea]': item.type === 'error',
            'border-[#cde8ff]': item.type === 'info',
            'border-[#d7f0df]': item.type === 'success',
          }"
        >
          <div class="flex items-start gap-4 px-5 py-4">
            <div
              class="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[16px] font-medium"
              :class="{
                'bg-[#fff1f8] text-[#b0006d]': item.type === 'error',
                'bg-[#eff6ff] text-[#285aff]': item.type === 'info',
                'bg-[#eefbf1] text-[#1d7f43]': item.type === 'success',
              }"
            >
              <span v-if="item.type === 'success'">+</span>
              <span v-else-if="item.type === 'error'">!</span>
              <span v-else>i</span>
            </div>

            <div class="min-w-0 flex-1">
              <p class="mb-1 text-[16px] font-medium leading-[1.2] text-[#111]">
                {{ item.title }}
              </p>
              <p class="text-[13px] leading-[1.55] text-[#555]">
                {{ item.message }}
              </p>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#e7e7e8] text-[#777] transition hover:border-[#111] hover:text-[#111]"
              @click="removeNotification(item.id)"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.25s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.notification-move {
  transition: transform 0.25s ease;
}

@media (max-width: 768px) {
  .notification-center {
    left: 12px;
    right: 12px;
    top: 12px;
    width: auto;
    max-width: none;
  }
}
</style>
