<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import DialogCenter from './components/DialogCenter.vue';
import NotificationCenter from './components/NotificationCenter.vue';
import { loadCmsSettings } from './composables/useCmsSettings';

const i18n = useI18n();
const { locale } = i18n;

const applyCmsSettings = async () => {
  await loadCmsSettings(i18n, locale.value).catch(() => undefined);
};

const showScrollTop = ref(false);
const scrollTopVisibleOffset = 140;

const updateScrollTopVisibility = () => {
  showScrollTop.value = window.scrollY > scrollTopVisibleOffset;
};

watch(() => locale.value, applyCmsSettings);
onMounted(() => {
  applyCmsSettings();
  updateScrollTopVisibility();
  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScrollTopVisibility);
});

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};
</script>

<template>
  <div class="app">
    <header>
      <Header />
    </header>
    <main class="grow">
      <router-view />
    </main>
    <footer>
      <Footer />
    </footer>
    <DialogCenter />
    <NotificationCenter />
    <Transition name="scroll-top-fade">
      <button v-if="showScrollTop" @click="scrollToTop" class="up-btn" aria-label="Наверх">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.7773 11.2975H17.5145C17.386 11.2975 17.2631 11.242 17.1765 11.1448L11.0615 4.13669V19.7778C11.0615 19.9 10.961 20 10.838 20H9.16195C9.03904 20 8.93847 19.9 8.93847 19.7778V4.13669L2.8235 11.1448C2.73969 11.242 2.61678 11.2975 2.48549 11.2975H0.22275C0.0327921 11.2975 -0.0705674 11.0725 0.0551401 10.9309L9.32677 0.306274C9.41058 0.210136 9.51419 0.133034 9.63059 0.0801907C9.74698 0.0273476 9.87344 0 10.0014 0C10.1294 0 10.2558 0.0273476 10.3722 0.0801907C10.4886 0.133034 10.5922 0.210136 10.676 0.306274L19.9449 10.9309C20.0706 11.0753 19.9672 11.2975 19.7773 11.2975Z"
            fill="black"
          />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.up-btn {
  position: fixed;
  bottom: 60px;
  right: 45px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  z-index: 100;

  /* Тень по вашему ТЗ: X -1, Y 2, Blur 10.4, Spread 0, цвет #000000 25% */
  box-shadow: -1px 2px 10.4px 0 rgba(0, 0, 0, 0.25);
}

/* Ховер как у синих кнопок */
.up-btn:hover {
  background: #285aff;
  transform: translateY(-3px);
  box-shadow: -1px 5px 15px 0 rgba(40, 90, 255, 0.35);
}

.up-btn:hover img {
  filter: brightness(0) invert(1); /* делает иконку белой */
}

.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
