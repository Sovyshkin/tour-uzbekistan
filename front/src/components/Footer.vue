<template>
  <div
    class="wrapper border-t bg-[#f8f8f8] px-5 py-10 sm:px-8 lg:px-[80px] xl:px-[140px] lg:py-[26px]"
  >
    <!-- Верхняя часть -->
    <div class="mb-8 lg:mb-[53px]">
      <h2 class="text-[24px] lg:text-[32px] font-medium mb-[15px]">
        <!-- Мобильный текст -->
        <span class="lg:hidden uppercase font-medium italic text-[18px] tracking-[0%] leading-[100%]">
          {{ $t('footer.title_mobile') }}
        </span>
        <!-- Десктопный текст -->
        <span class="hidden lg:inline text-[#285aaf]">
          {{ $t('footer.title') }}
        </span>
      </h2>
      <div class="flex items-center gap-[10px]">
        <p class="text-[16px] lg:text-[20px] font-medium tracking-[-0.01em]">
          {{ $t('footer.air_company') }}
        </p>
        <img
          src="../assets/icons/centrum-air.svg"
          alt="Centrum Air"
          class="footer-air-logo"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>

    <!-- Основной контент -->
    <div class="flex flex-col gap-10 lg:gap-0">
      <div
        class="flex flex-col lg:flex-row justify-between lg:mb-[46px] gap-10 lg:gap-0"
      >
        <!-- Навигация -->
        <nav>
          <ul
            class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 sm:gap-y-4 lg:gap-[55px]"
          >
            <div class="flex flex-col gap-3 sm:gap-4">
              <li>
                <router-link
                  to="/"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.main_page') }}
                </router-link>
              </li>
              <li>
                <router-link
                  to="/about"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.who_we_are') }}
                </router-link>
              </li>
              <li>
                <router-link
                  to="/services"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.services') }}
                </router-link>
              </li>
              <li>
                <router-link
                  to="/directions"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.direction') }}
                </router-link>
              </li>
              <li>
                <router-link
                  to="/about"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.about_us') }}
                </router-link>
              </li>
              <li>
                <router-link
                  to="/news"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.news') }}
                </router-link>
              </li>
            </div>
            <div class="flex flex-col gap-3 sm:gap-4">
              <li v-for="country in footerCountries" :key="country.id">
                <router-link
                  :to="`/countries/${country.slug}`"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ country.name }}
                </router-link>
              </li>
              <li>
                <router-link
                  to="/privacy-policy"
                  class="hover:text-[#285aff] transition text-[14px] lg:text-[16px]"
                >
                  {{ $t('footer.privacy_policy') }}
                </router-link>
              </li>
            </div>
          </ul>
        </nav>

        <!-- Контакты -->
        <div class="contact">
          <div class="icons flex flex-col gap-[11px] mb-4 lg:mb-[15px]">
            <div class="flex gap-[11px] justify-start lg:justify-end">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/tg.png" alt="Telegram" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/inst.png" alt="Instagram" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/in.png" alt="LinkedIn" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/vk.png" alt="VK" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
            </div>
            <div class="flex gap-[11px] justify-start lg:justify-end">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/dz.png" alt="Dzen" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/routube.png" alt="Rutube" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <img src="../assets/icons/youtube.png" alt="YouTube" class="w-6 h-6" loading="lazy" decoding="async" />
              </a>
            </div>
          </div>
          <div class="address">
            <p class="text-[14px] lg:text-[16px] text-start lg:text-end">
              <a :href="footerEmailHref" class="hover:text-[#285aff] transition">
                {{ footerEmail }}
              </a>
            </p>
            <p class="text-[14px] lg:text-[16px] text-start lg:text-end">
              <a :href="footerPhoneHref" class="hover:text-[#285aff] transition">
                {{ footerPhone }}
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- Копирайт -->
      <div class="pt-6 border-t border-[#e6e6e7] lg:border-0 lg:pt-0">
        <p class="text-[12px] sm:text-[14px] lg:text-[16px] text-[#666] lg:text-black">
          {{ $t('footer.copyright') }} {{ currentYear }} {{ $t('footer.all_rights') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getApiLocale, getCountries } from '@/api';

const { t, locale } = useI18n();
const currentYear = computed(() => new Date().getFullYear());
const footerCountries = ref([]);

const cmsValue = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const loadFooterCountries = async () => {
  try {
    footerCountries.value = await getCountries(getApiLocale(locale.value));
  } catch {
    footerCountries.value = [];
  }
};

const footerEmail = computed(() => cmsValue('footer.email', 'info@centrumholidaysdmc.uz'));
const footerPhone = computed(() => cmsValue('footer.phone', '+998(77) 290-08-80'));
const footerEmailHref = computed(() => `mailto:${footerEmail.value}`);
const footerPhoneHref = computed(() => `tel:${footerPhone.value.replace(/[^\d+]/g, '')}`);

watch(() => locale.value, loadFooterCountries);
onMounted(loadFooterCountries);
</script>

<style scoped>
.wrapper {
  font-family: 'Aeonik Pro', sans-serif;
}

li {
  font-size: 16px;
}

@media (max-width: 1023px) {
  img[alt='Centrum Air'] {
    width: 122px;
  }
  li {
    font-size: 14px;
  }
}

.footer-air-logo {
  width: 122px;
  height: auto;
  object-fit: contain;
}

@media (min-width: 1024px) {
  .footer-air-logo {
    width: 156px;
  }
}
</style>
