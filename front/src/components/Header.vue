<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { clearAuth, getApiLocale, getAuth, getCountries, isAuthenticated as hasAuth, login } from '@/api';
import { validateLoginFormFields } from '@/utils/formValidation';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();

const headerRef = ref(null);
const isCountriesOpen = ref(false);
const isLanguageOpen = ref(false);
const isMobileMenuOpen = ref(false);
const isMobileLangOpen = ref(false);
const mobileMenuTop = ref(0);

// === МОДАЛКА РОЛИ ===
const showRoleModal = ref(false);
const roleStep = ref('choose'); // 'choose' | 'login'
const loginForm = ref({
  email: '',
  password: '',
});
const authState = ref(getAuth());
const authMessage = ref('');
const loginErrors = ref({});

const clearLoginError = (field) => {
  if (!loginErrors.value[field]) {
    return;
  }

  const nextErrors = { ...loginErrors.value };
  delete nextErrors[field];
  loginErrors.value = nextErrors;
};

const openRoleModal = () => {
  showRoleModal.value = true;
  roleStep.value = 'choose';
};

const openLoginModal = () => {
  showRoleModal.value = true;
  roleStep.value = 'login';
};

const closeRoleModal = () => {
  showRoleModal.value = false;
  roleStep.value = 'choose';
  authMessage.value = '';
  loginErrors.value = {};
  loginForm.value = {
    email: '',
    password: '',
  };

  if (route.query.auth === 'login') {
    const nextQuery = { ...route.query };
    delete nextQuery.auth;
    delete nextQuery.reason;
    delete nextQuery.redirect;
    router.replace({ query: nextQuery });
  }
};

const selectTourist = () => {
  closeRoleModal();
  router.push('/tours');
};

const selectAgent = () => {
  roleStep.value = 'login';
};

const goToRegister = () => {
  closeRoleModal();
  router.push('/register');
};

const submitLogin = async () => {
  const validationErrors = validateLoginFormFields(loginForm.value);
  loginErrors.value = validationErrors;

  if (Object.keys(validationErrors).length) {
    authMessage.value = Object.values(validationErrors)[0];
    return;
  }

  try {
    const auth = await login(loginForm.value);
    authState.value = auth;
    loginErrors.value = {};
    const redirectTarget = typeof route.query.redirect === 'string' ? route.query.redirect : '/tours';
    closeRoleModal();
    router.push(redirectTarget);
  } catch (error) {
    authMessage.value = error.message || t('notifications.loginFailed');
  }
};

const logout = () => {
  clearAuth();
  authState.value = null;
};
// ===================

const countriesList = ref([]);

const languages = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'uz', label: "O'zbek" },
];

const currentLanguageLabel = computed(() => {
  const lang = languages.find((l) => l.code === locale.value);
  return lang ? lang.code.toUpperCase() : 'EN';
});

const cmsValue = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const headerPhone = computed(() => cmsValue('footer.phone', '+998(77) 290-08-80'));
const headerPhoneHref = computed(() => `tel:${headerPhone.value.replace(/[^\d+]/g, '')}`);
const headerWhatsappHref = computed(() => {
  const digits = headerPhone.value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : 'https://wa.me/998772900880';
});

const loadCountriesList = async () => {
  try {
    countriesList.value = await getCountries(getApiLocale(locale.value));
  } catch {
    countriesList.value = [];
  }
};

const updateMobileMenuTop = () => {
  mobileMenuTop.value = headerRef.value?.getBoundingClientRect().bottom ?? 0;
};

const syncBodyScroll = () => {
  document.body.style.overflow = isMobileMenuOpen.value ? 'hidden' : '';
};

const resetMobileDropdowns = () => {
  isCountriesOpen.value = false;
  isLanguageOpen.value = false;
  isMobileLangOpen.value = false;
};

const toggleMobileMenu = async () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  resetMobileDropdowns();

  if (isMobileMenuOpen.value) {
    await nextTick();
    updateMobileMenuTop();
  }
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
  resetMobileDropdowns();
};

const changeLanguage = (langCode) => {
  locale.value = langCode;
  localStorage.setItem('language', langCode);
  document.documentElement.lang = langCode;
  isLanguageOpen.value = false;
  isMobileLangOpen.value = false;
};

const isAuthenticated = computed(() => Boolean(authState.value?.accessToken));

watch(
  () => route.query.auth,
  (authQuery) => {
    authState.value = getAuth();

    if (authQuery === 'login' && !hasAuth()) {
      authMessage.value =
        route.query.reason === 'unauthorized'
          ? t('notifications.unauthorized')
          : '';
      openLoginModal();
    }
  },
  { immediate: true },
);

watch(isMobileMenuOpen, () => {
  syncBodyScroll();
});

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu();
  },
);

watch(() => locale.value, loadCountriesList);

onMounted(() => {
  loadCountriesList();
  updateMobileMenuTop();
  window.addEventListener('resize', updateMobileMenuTop);
});

onBeforeUnmount(() => {
  syncBodyScroll();
  document.body.style.overflow = '';
  window.removeEventListener('resize', updateMobileMenuTop);
});
</script>

<template>
  <header ref="headerRef" class="wrapper border-b bg-white relative z-60">
    <nav class="flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="brand-link flex-shrink-0">
        <img
          src="../assets/icons/logo_dmc_b.svg"
          alt="Centrum Holidays"
          class="brand-logo"
        />
      </router-link>

      <!-- Desktop Navigation -->
      <div class="hidden xl:flex items-center gap-5 xl:gap-[20px]">
        <router-link class="nav-link" to="/about">{{
          $t('nav.about')
        }}</router-link>
        <router-link class="nav-link" to="/directions">{{
          $t('nav.directions')
        }}</router-link>
        <router-link class="nav-link" to="/services">{{
          $t('nav.services')
        }}</router-link>
        <router-link class="nav-link" to="/why-we">{{
          $t('nav.why_we')
        }}</router-link>

        <!-- Countries Dropdown Desktop -->
        <div class="relative">
          <button
            @click="isCountriesOpen = !isCountriesOpen"
            class="flex items-center gap-1 nav-link"
          >
            {{ $t('nav.countries') }}
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': isCountriesOpen }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <transition name="fade">
            <div
              v-if="isCountriesOpen"
              v-click-outside="() => (isCountriesOpen = false)"
              class="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg w-[160px] py-2 z-50"
            >
              <router-link
                v-for="c in countriesList"
                :key="c.id"
                :to="`/countries/${c.slug}`"
                class="block px-4 py-2 text-sm hover:bg-gray-50"
                @click="isCountriesOpen = false"
              >
                {{ c.name }}
              </router-link>
            </div>
          </transition>
        </div>

        <router-link class="nav-link" to="/tours">{{
          $t('nav.tours')
        }}</router-link>
      </div>

      <!-- Desktop Right Block -->
      <div class="hidden xl:flex items-center gap-4 xl:gap-[21px]">
        <a
          :href="headerPhoneHref"
          class="text-sm hover:text-blue-600 transition"
          >{{ headerPhone }}</a
        >
        <div class="h-5 border-l border-black"></div>

        <!-- For Agent — открывает модалку -->
        <button
          v-if="!isAuthenticated"
          @click="openRoleModal"
          class="border border-black rounded-[5px] px-3 py-1 text-sm hover:bg-gray-50 transition cursor-pointer"
        >
          {{ $t('nav.for_agent') }}
        </button>
        <button
          v-else
          @click="logout"
          class="border border-black rounded-[5px] px-3 py-1 text-sm hover:bg-gray-50 transition cursor-pointer"
        >
          Logout
        </button>

        <div class="h-5 border-l border-black"></div>
        <a :href="headerWhatsappHref" target="_blank">
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.601 2.32606C12.8676 1.58555 11.9941 0.998501 11.0314 0.599149C10.0688 0.199797 9.03621 -0.00386082 7.994 5.54251e-05C3.627 5.54251e-05 0.068 3.55806 0.064 7.92606C0.064 9.32506 0.43 10.6861 1.121 11.8911L0 16.0001L4.204 14.8981C5.36649 15.5323 6.66975 15.8641 7.994 15.8631H7.998C12.366 15.8631 15.924 12.3051 15.928 7.93306C15.9289 6.89112 15.7237 5.85929 15.3241 4.897C14.9246 3.9347 14.3396 3.06095 13.601 2.32606ZM7.994 14.5211C6.81318 14.5201 5.65422 14.2024 4.638 13.6011L4.398 13.4571L1.904 14.1111L2.57 11.6781L2.414 11.4271C1.75381 10.3774 1.40465 9.16208 1.407 7.92206C1.407 4.29606 4.364 1.33806 7.998 1.33806C8.86374 1.3365 9.72123 1.50633 10.521 1.83775C11.3208 2.16916 12.0471 2.65562 12.658 3.26906C13.2709 3.8802 13.7568 4.6066 14.0877 5.40638C14.4186 6.20617 14.5879 7.06352 14.586 7.92906C14.582 11.5681 11.625 14.5211 7.994 14.5211ZM11.609 9.58706C11.412 9.48806 10.439 9.00906 10.256 8.94106C10.074 8.87606 9.941 8.84206 9.811 9.04006C9.678 9.23705 9.298 9.68606 9.184 9.81505C9.07 9.94806 8.952 9.96305 8.754 9.86506C8.557 9.76505 7.918 9.55706 7.162 8.88006C6.572 8.35506 6.177 7.70506 6.059 7.50806C5.945 7.31006 6.048 7.20406 6.147 7.10506C6.234 7.01706 6.344 6.87305 6.443 6.75906C6.543 6.64506 6.576 6.56106 6.641 6.42906C6.706 6.29506 6.675 6.18106 6.626 6.08206C6.576 5.98306 6.181 5.00606 6.014 4.61206C5.854 4.22306 5.691 4.27706 5.569 4.27206C5.455 4.26506 5.322 4.26506 5.189 4.26506C5.08857 4.26761 4.98976 4.29087 4.89873 4.33337C4.80771 4.37587 4.72643 4.4367 4.66 4.51206C4.478 4.71006 3.969 5.18906 3.969 6.16606C3.969 7.14305 4.679 8.08206 4.779 8.21506C4.877 8.34806 6.173 10.3471 8.162 11.2071C8.632 11.4121 9.002 11.5331 9.291 11.6251C9.766 11.7771 10.195 11.7541 10.537 11.7051C10.917 11.6471 11.708 11.2251 11.875 10.7621C12.039 10.2981 12.039 9.90206 11.989 9.81906C11.94 9.73506 11.807 9.68606 11.609 9.58706Z"
              fill="#00000A"
            />
          </svg>
        </a>

        <!-- Language Desktop -->
        <div class="relative">
          <button
            @click="isLanguageOpen = !isLanguageOpen"
            class="flex items-center gap-1 text-sm px-2 py-1 hover:bg-gray-100 rounded transition cursor-pointer"
          >
            {{ currentLanguageLabel }}
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': isLanguageOpen }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <transition name="fade">
            <div
              v-if="isLanguageOpen"
              v-click-outside="() => (isLanguageOpen = false)"
              class="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg w-[140px] py-2 z-50"
            >
              <button
                v-for="lang in languages"
                :key="lang.code"
                @click="changeLanguage(lang.code)"
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between"
              >
                {{ $t(`languages.${lang.code}`) }}
                <span v-if="locale === lang.code" class="text-green-600"
                  >✓</span
                >
              </button>
            </div>
          </transition>
        </div>
      </div>

      <!-- Mobile Right Block -->
      <div class="flex xl:hidden items-center gap-3">
        <button
          v-if="!isAuthenticated"
          type="button"
          @click="openRoleModal"
          class="border border-black rounded-[5px] px-2 py-1 text-xs cursor-pointer"
        >
          {{ $t('nav.for_agent') }}
        </button>
        <button
          v-else
          type="button"
          @click="logout"
          class="border border-black rounded-[5px] px-2 py-1 text-xs cursor-pointer"
        >
          Logout
        </button>

        <!-- Burger -->
        <button type="button" @click="toggleMobileMenu" class="p-1" aria-label="Menu">
          <svg
            v-if="!isMobileMenuOpen"
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
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
    </nav>

    <!-- Mobile Menu -->
    <transition name="slide-down">
      <div
        v-if="isMobileMenuOpen"
        class="xl:hidden fixed inset-x-0 bottom-0 bg-white z-40 overflow-y-auto shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
        :style="{ top: `${mobileMenuTop}px` }"
      >
        <div class="px-5 py-4 flex flex-col gap-1">
          <!-- Language Mobile -->
          <div class="border-b border-gray-100">
            <button
              @click="isMobileLangOpen = !isMobileLangOpen"
              class="mobile-link w-full flex justify-between items-center"
            >
              Language ({{ currentLanguageLabel }})
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': isMobileLangOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div v-if="isMobileLangOpen" class="pl-4 pb-3 flex flex-col gap-2">
              <button
                v-for="lang in languages"
                :key="lang.code"
                @click="changeLanguage(lang.code)"
                class="text-sm py-2 px-2 hover:bg-gray-50 rounded flex justify-between items-center"
              >
                {{ $t(`languages.${lang.code}`) }}
                <span v-if="locale === lang.code" class="text-green-600 text-xs"
                  >✓</span
                >
              </button>
            </div>
          </div>

          <router-link
            to="/about"
            class="mobile-link"
            @click="closeMobileMenu"
            >{{ $t('nav.about') }}</router-link
          >
          <router-link
            to="/directions"
            class="mobile-link"
            @click="closeMobileMenu"
            >{{ $t('nav.directions') }}</router-link
          >
          <router-link
            to="/services"
            class="mobile-link"
            @click="closeMobileMenu"
            >{{ $t('nav.services') }}</router-link
          >
          <router-link
            to="/why-we"
            class="mobile-link"
            @click="closeMobileMenu"
            >{{ $t('nav.why_we') }}</router-link
          >

          <!-- Countries Mobile -->
          <div class="border-b border-gray-100">
            <button
              @click="isCountriesOpen = !isCountriesOpen"
              class="mobile-link w-full flex justify-between items-center"
            >
              {{ $t('nav.countries') }}
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': isCountriesOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div v-if="isCountriesOpen" class="pl-4 pb-2 flex flex-col gap-2">
              <router-link
                v-for="c in countriesList"
                :key="c.id"
                :to="`/countries/${c.slug}`"
                class="text-sm text-gray-600 py-2"
                @click="closeMobileMenu"
              >
                {{ c.name }}
              </router-link>
            </div>
          </div>

          <router-link
            to="/tours"
            class="mobile-link"
            @click="closeMobileMenu"
            >{{ $t('nav.tours') }}</router-link
          >
        </div>

        <!-- Mobile Bottom -->
        <div class="mt-auto px-5 py-5 border-t border-gray-100">
          <div class="flex items-center justify-between">
            <a :href="headerPhoneHref" class="text-sm font-medium"
              >{{ headerPhone }}</a
            >
            <div class="flex items-center gap-3">
              <a :href="headerWhatsappHref" target="_blank">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.601 2.32606C12.8676 1.58555 11.9941 0.998501 11.0314 0.599149C10.0688 0.199797 9.03621 -0.00386082 7.994 5.54251e-05C3.627 5.54251e-05 0.068 3.55806 0.064 7.92606C0.064 9.32506 0.43 10.6861 1.121 11.8911L0 16.0001L4.204 14.8981C5.36649 15.5323 6.66975 15.8641 7.994 15.8631H7.998C12.366 15.8631 15.924 12.3051 15.928 7.93306C15.9289 6.89112 15.7237 5.85929 15.3241 4.897C14.9246 3.9347 14.3396 3.06095 13.601 2.32606ZM7.994 14.5211C6.81318 14.5201 5.65422 14.2024 4.638 13.6011L4.398 13.4571L1.904 14.1111L2.57 11.6781L2.414 11.4271C1.75381 10.3774 1.40465 9.16208 1.407 7.92206C1.407 4.29606 4.364 1.33806 7.998 1.33806C8.86374 1.3365 9.72123 1.50633 10.521 1.83775C11.3208 2.16916 12.0471 2.65562 12.658 3.26906C13.2709 3.8802 13.7568 4.6066 14.0877 5.40638C14.4186 6.20617 14.5879 7.06352 14.586 7.92906C14.582 11.5681 11.625 14.5211 7.994 14.5211ZM11.609 9.58706C11.412 9.48806 10.439 9.00906 10.256 8.94106C10.074 8.87606 9.941 8.84206 9.811 9.04006C9.678 9.23705 9.298 9.68606 9.184 9.81505C9.07 9.94806 8.952 9.96305 8.754 9.86506C8.557 9.76505 7.918 9.55706 7.162 8.88006C6.572 8.35506 6.177 7.70506 6.059 7.50806C5.945 7.31006 6.048 7.20406 6.147 7.10506C6.234 7.01706 6.344 6.87305 6.443 6.75906C6.543 6.64506 6.576 6.56106 6.641 6.42906C6.706 6.29506 6.675 6.18106 6.626 6.08206C6.576 5.98306 6.181 5.00606 6.014 4.61206C5.854 4.22306 5.691 4.27706 5.569 4.27206C5.455 4.26506 5.322 4.26506 5.189 4.26506C5.08857 4.26761 4.98976 4.29087 4.89873 4.33337C4.80771 4.37587 4.72643 4.4367 4.66 4.51206C4.478 4.71006 3.969 5.18906 3.969 6.16606C3.969 7.14305 4.679 8.08206 4.779 8.21506C4.877 8.34806 6.173 10.3471 8.162 11.2071C8.632 11.4121 9.002 11.5331 9.291 11.6251C9.766 11.7771 10.195 11.7541 10.537 11.7051C10.917 11.6471 11.708 11.2251 11.875 10.7621C12.039 10.2981 12.039 9.90206 11.989 9.81906C11.94 9.73506 11.807 9.68606 11.609 9.58706Z"
                    fill="#00000A"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ═══ МОДАЛКА ВЫБОРА РОЛИ (внутри хедера) ═══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showRoleModal"
          class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
          @click.self="closeRoleModal"
        >
          <Transition name="scale" mode="out-in">
            <!-- Шаг 1: Выбор роли -->
            <div
              v-if="roleStep === 'choose'"
              key="choose"
              class="bg-white rounded-[16px] w-full max-w-[360px] overflow-hidden shadow-xl"
            >
              <div class="px-6 pt-6 pb-4 text-center">
                <h3 class="text-[18px] font-medium text-black">
                  {{ t('roleModal.title') }}
                </h3>
              </div>
              <div class="flex border-t border-[#e6e6e7]">
                <button
                  @click="selectTourist"
                  class="flex-1 py-4 text-[14px] text-[#333] hover:bg-[#f5f5f5] transition border-r border-[#e6e6e7] cursor-pointer"
                >
                  {{ t('roleModal.tourist') }}
                </button>
                <button
                  @click="selectAgent"
                  class="flex-1 py-4 text-[14px] text-white bg-[#ff00cc] hover:bg-[#e000b8] transition font-medium cursor-pointer"
                >
                  {{ t('roleModal.agent') }}
                </button>
              </div>
            </div>

            <!-- Шаг 2: Ввод данных -->
            <div
              v-else-if="roleStep === 'login'"
              key="login"
              class="bg-white rounded-[16px] w-full max-w-[360px] p-6 shadow-xl"
            >
              <h3 class="text-[18px] font-medium text-black text-center mb-6">
                {{ t('roleModal.login_title') }}
              </h3>

              <p
                v-if="authMessage"
                class="mb-4 rounded-[8px] border border-[#ffd4ea] bg-[#fff4fb] px-4 py-3 text-[13px] text-[#a10073]"
              >
                {{ authMessage }}
              </p>

              <form class="flex flex-col gap-3 mb-4" @submit.prevent="submitLogin">
                <input
                  v-model="loginForm.email"
                  type="email"
                  :placeholder="t('roleModal.email_placeholder')"
                  class="w-full px-4 py-3 rounded-[8px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
                  :class="loginErrors.email ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#e6e6e7]'"
                  @input="clearLoginError('email')"
                  required
                />
                <p v-if="loginErrors.email" class="mt-1 text-[12px] text-[#cc008f]">
                  {{ loginErrors.email }}
                </p>
                <input
                  v-model="loginForm.password"
                  type="password"
                  :placeholder="t('roleModal.password_placeholder')"
                  class="w-full px-4 py-3 rounded-[8px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
                  :class="loginErrors.password ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#e6e6e7]'"
                  @input="clearLoginError('password')"
                  required
                />
                <p v-if="loginErrors.password" class="mt-1 text-[12px] text-[#cc008f]">
                  {{ loginErrors.password }}
                </p>
                <button
                  type="submit"
                  class="w-full py-3 rounded-[8px] bg-[#ff00cc] text-white text-[14px] font-medium hover:bg-[#e000b8] transition mb-3 cursor-pointer"
                >
                  {{ t('roleModal.continue') }}
                </button>
              </form>

              <p class="text-center text-[12px] text-[#888]">
                {{ t('roleModal.no_account') }}
                <button
                  @click="goToRegister"
                  class="text-[#285aff] hover:underline cursor-pointer"
                >
                  {{ t('roleModal.register') }}
                </button>
              </p>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.wrapper {
  padding: 16px 20px;
  font-family: 'Aeonik Pro', sans-serif;
}

.brand-link {
  display: flex;
  align-items: center;
}

.brand-logo {
  display: block;
  width: 150px;
  height: auto;
  object-fit: contain;
}

@media (min-width: 1024px) {
  .brand-logo {
    width: 186px;
  }

  .wrapper {
    padding: 20px 40px;
  }
}

@media (min-width: 1280px) {
  .wrapper {
    padding: 26px 80px;
  }
}

@media (min-width: 1440px) {
  .wrapper {
    padding: 26px 140px;
  }
}

.nav-link {
  position: relative;
  padding-bottom: 4px;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: -0.02em;
  transition: color 0.3s ease;
  cursor: pointer;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background-color: #285aff;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.nav-link:hover {
  color: #285aff;
}

.nav-link:hover::after {
  width: 100%;
}

.router-link-active.nav-link {
  color: #285aff;
}

.router-link-active.nav-link::after {
  width: 100%;
}

/* Mobile link */
.mobile-link {
  display: flex;
  padding: 14px 0;
  font-size: 16px;
  color: #1a1a1a;
  border-bottom: 1px solid #f3f3f3;
  cursor: pointer;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Modal scale animation */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s ease;
}
.scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
