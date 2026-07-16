<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getApiLocale, registerPartner } from '@/api';
import { useDialog } from '@/composables/useDialog';
import { useNotifications } from '@/composables/useNotifications';
import { validateRegisterFormFields } from '@/utils/formValidation';

const { t, locale } = useI18n();
const router = useRouter();
const { error: notifyError } = useNotifications();
const { openDialog } = useDialog();

const form = ref({
  name: '',
  email: '',
  password: '',
  company: '',
  city: '',
  language: '',
  tin: '',
});
const formErrors = ref({});

const clearFieldError = (field) => {
  if (!formErrors.value[field]) {
    return;
  }

  const nextErrors = { ...formErrors.value };
  delete nextErrors[field];
  formErrors.value = nextErrors;
};

// === КАСТОМНЫЙ СЕЛЕКТ ===
const isCompanyOpen = ref(false);
const isLangOpen = ref(false);

const companyOptions = [
  { id: 'AGENCY', label: computed(() => t('register.agency')) },
  { id: 'OPERATOR', label: computed(() => t('register.operator')) },
  { id: 'TRANSPORT', label: computed(() => t('register.transport')) },
];

const languageOptions = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'uz', label: "O'zbek" },
];

const selectCompany = (opt) => {
  form.value.company = opt.id;
  isCompanyOpen.value = false;
  clearFieldError('company');
};

const selectLanguage = (lang) => {
  form.value.language = lang.id;
  isLangOpen.value = false;
  clearFieldError('language');
};

// Закрытие при клике вне
const companyRef = ref(null);
const langRef = ref(null);

const onDocClick = (e) => {
  if (companyRef.value && !companyRef.value.contains(e.target)) isCompanyOpen.value = false;
  if (langRef.value && !langRef.value.contains(e.target)) isLangOpen.value = false;
};

onMounted(() => {
  document.addEventListener('click', onDocClick);
  if (!form.value.language) {
    form.value.language = getApiLocale(locale.value);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
});

const selectedCompanyLabel = computed(() => {
  const option = companyOptions.find((item) => item.id === form.value.company);
  return option?.label?.value || '';
});

const selectedLanguageLabel = computed(() => {
  const option = languageOptions.find((item) => item.id === form.value.language);
  return option?.label || 'English';
});

const handleSubmit = async () => {
  const validationErrors = validateRegisterFormFields(form.value);
  formErrors.value = validationErrors;

  if (Object.keys(validationErrors).length) {
    notifyError(Object.values(validationErrors)[0], t('notifications.validationTitle'));
    return;
  }

  const parts = form.value.name.trim().split(/\s+/);
  const firstName = parts[0] || form.value.name.trim();
  const lastName = parts.slice(1).join(' ') || '-';

  try {
    await registerPartner({
      firstName,
      lastName,
      email: form.value.email,
      password: form.value.password,
      companyName: form.value.name,
      partnerType: form.value.company || 'AGENCY',
      city: form.value.city || undefined,
      tin: form.value.tin || undefined,
      preferredLocale: form.value.language || getApiLocale(locale.value),
    });
    formErrors.value = {};

    openDialog({
      title: t('notifications.registrationCompletedTitle'),
      message: t('notifications.registrationCompletedMessage'),
      tone: 'success',
      confirmLabel: t('notifications.continue'),
      onConfirm: () => router.push('/tours'),
    });
  } catch (error) {
    notifyError(error.message || t('notifications.registrationFailed'), t('notifications.registrationFailed'));
  }
};
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col items-center py-10 px-4">
    <h1 class="text-[32px] sm:text-[42px] font-normal text-black mb-8">
      {{ t('register.title') }}
    </h1>

    <form
      @submit.prevent="handleSubmit"
      class="w-full max-w-[420px] border border-[#e6e6e7] rounded-[16px] p-6 sm:p-8 flex flex-col gap-4"
    >
      <!-- Name -->
      <div>
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.name') }}</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
          :class="formErrors.name ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#ccc]'"
          @input="clearFieldError('name')"
          required
        />
        <p v-if="formErrors.name" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.name }}</p>
      </div>

      <!-- Email -->
      <div>
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.email') }}</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
          :class="formErrors.email ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#ccc]'"
          @input="clearFieldError('email')"
          required
        />
        <p v-if="formErrors.email" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.email }}</p>
      </div>

      <!-- Password -->
      <div>
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.password') }}</label>
        <input
          v-model="form.password"
          type="password"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
          :class="formErrors.password ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#ccc]'"
          @input="clearFieldError('password')"
          required
        />
        <p v-if="formErrors.password" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.password }}</p>
      </div>

      <!-- Company — кастомный селект -->
      <div ref="companyRef" class="relative">
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.partner_type') }}</label>
        <button
          type="button"
          @click="isCompanyOpen = !isCompanyOpen"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] text-left outline-none focus:border-[#285aff] transition flex items-center justify-between"
          :class="formErrors.company ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : (isCompanyOpen ? 'border-[#285aff] ring-1 ring-[#285aff]' : 'border-[#ccc]')"
        >
          <span :class="selectedCompanyLabel ? 'text-[#333]' : 'text-[#888]'">
            {{ selectedCompanyLabel || t('register.select_partner') }}
          </span>
          <svg 
            class="w-4 h-4 text-[#666] transition-transform" 
            :class="{ 'rotate-180': isCompanyOpen }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        
        <div 
          v-if="isCompanyOpen"
          class="absolute top-full left-0 right-0 mt-2 bg-[#f5f5f5] border border-[#e6e6e7] rounded-[12px] shadow-lg z-50 overflow-hidden"
        >
          <button
            v-for="opt in companyOptions"
            :key="opt.id"
            type="button"
            @click="selectCompany(opt)"
            class="w-full text-left px-4 py-3 text-[14px] text-[#333] hover:bg-[#e8e8e8] transition border-b border-[#e0e0e0] last:border-0"
            :class="{ 'bg-[#e8e8e8] font-medium': form.company === opt.id }"
          >
            {{ opt.label.value }}
          </button>
        </div>
        <p v-if="formErrors.company" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.company }}</p>
      </div>

      <!-- City -->
      <div>
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.city') }}</label>
        <input
          v-model="form.city"
          type="text"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
          :class="formErrors.city ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#ccc]'"
          @input="clearFieldError('city')"
          required
        />
        <p v-if="formErrors.city" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.city }}</p>
      </div>

      <!-- Language — кастомный селект -->
      <div ref="langRef" class="relative">
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.language') }}</label>
        <button
          type="button"
          @click="isLangOpen = !isLangOpen"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] text-left outline-none focus:border-[#285aff] transition flex items-center justify-between"
          :class="formErrors.language ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : (isLangOpen ? 'border-[#285aff] ring-1 ring-[#285aff]' : 'border-[#ccc]')"
        >
          <span :class="selectedLanguageLabel ? 'text-[#333]' : 'text-[#888]'">
            {{ selectedLanguageLabel }}
          </span>
          <svg 
            class="w-4 h-4 text-[#666] transition-transform" 
            :class="{ 'rotate-180': isLangOpen }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        
        <div 
          v-if="isLangOpen"
          class="absolute top-full left-0 right-0 mt-2 bg-[#f5f5f5] border border-[#e6e6e7] rounded-[12px] shadow-lg z-50 overflow-hidden"
        >
          <button
            v-for="lang in languageOptions"
            :key="lang.id"
            type="button"
            @click="selectLanguage(lang)"
            class="w-full text-left px-4 py-3 text-[14px] text-[#333] hover:bg-[#e8e8e8] transition border-b border-[#e0e0e0] last:border-0"
            :class="{ 'bg-[#e8e8e8] font-medium': form.language === lang.id }"
          >
            {{ lang.label }}
          </button>
        </div>
        <p v-if="formErrors.language" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.language }}</p>
      </div>

      <!-- TIN -->
      <div>
        <label class="block text-[11px] text-[#888] mb-1 ml-1">{{ t('register.tin') }}</label>
        <input
          v-model="form.tin"
          type="text"
          class="w-full px-4 py-3 rounded-[10px] border bg-[#f5f5f5] text-[14px] outline-none focus:border-[#285aff] transition"
          :class="formErrors.tin ? 'border-[#ff00cc] ring-1 ring-[#ff00cc]' : 'border-[#ccc]'"
          @input="clearFieldError('tin')"
          required
        />
        <p v-if="formErrors.tin" class="mt-1 ml-1 text-[12px] text-[#cc008f]">{{ formErrors.tin }}</p>
      </div>

      <button
        type="submit"
        class="w-full py-3 rounded-[10px] bg-[#ff00cc] text-white text-[14px] font-medium hover:bg-[#e000b8] transition mt-2 cursor-pointer"
      >
        {{ t('register.continue_btn') }}
      </button>
    </form>

    <p class="mt-4 text-[12px] text-[#666] text-center">
      {{ t('register.terms_text') }}
    </p>
  </div>
</template>

<style scoped>
/* стили без изменений */
</style>
