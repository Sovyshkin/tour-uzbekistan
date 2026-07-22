<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createBooking, getApiLocale, isAuthenticated } from '@/api';
import { useNotifications } from '@/composables/useNotifications';
import { validateBookingFormFields } from '@/utils/formValidation';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const { error: notifyError } = useNotifications();

const redirectToLogin = () => {
  router.replace({
    name: 'home',
    query: {
      auth: 'login',
      reason: 'unauthorized',
      redirect: route.fullPath,
    },
  });
};

const modalStep = ref(null); // null - форма видна, 2,3 - модальные окна

const formData = ref({
  sex: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  email: '',
  idCard: '',
  nationality: '',
  documentSeries: '',
  documentNumber: '',
  issuedDate: '',
  validUntil: '',
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

const submitForm = async () => {
  if (!isAuthenticated()) {
    redirectToLogin();
    return;
  }

  const validationErrors = validateBookingFormFields(formData.value);
  formErrors.value = validationErrors;

  if (Object.keys(validationErrors).length) {
    notifyError(Object.values(validationErrors)[0], t('notifications.validationTitle'));
    return;
  }

  try {
    await createBooking({
      tourId: route.params.id,
      locale: getApiLocale(locale.value),
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email,
      phone: formData.value.phone || undefined,
      sex: formData.value.sex || undefined,
      birthDate: formData.value.birthDate || undefined,
      nationality: formData.value.nationality || undefined,
      documentType: formData.value.idCard || undefined,
      documentSeries: formData.value.documentSeries || undefined,
      documentNumber: formData.value.documentNumber || undefined,
      documentIssuedAt: formData.value.issuedDate || undefined,
      documentValidUntil: formData.value.validUntil || undefined,
      sourcePage: route.fullPath,
    });
    formErrors.value = {};
    modalStep.value = 2;
  } catch (error) {
    notifyError(error.message || t('notifications.createBookingFailed'), t('notifications.bookingFailed'));
  }
};

const nextStep = () => {
  modalStep.value = 3;
};

const closeModal = () => {
  modalStep.value = null;
  formErrors.value = {};
  document.body.style.overflow = '';
  router.back();
};

const openModal = (step) => {
  modalStep.value = step;
  document.body.style.overflow = 'hidden';
};

onMounted(() => {
  if (!isAuthenticated()) {
    redirectToLogin();
  }
});
</script>

<template>
  <div class="booking-page">
    <!-- Фоновая картинка -->
    <div class="hero-image"></div>
    
    <!-- Контент поверх картинки -->
    <div class="booking-content">
      <div class="form-wrapper">
        <!-- Заголовок формы -->
        <div class="form-header w-[50%]">
          <h2 class="form-title">{{ t('openCard.modal_title') }}</h2>
        </div>
        
        <!-- Статичная форма -->
        <div class="form-container">
          <form @submit.prevent="submitForm" class="booking-form">
            <div class="form-group">
              <label>{{ t('openCard.modal_sex') }}</label>
              <input type="text" v-model="formData.sex" :class="{ 'input-error': formErrors.sex }" @input="clearFieldError('sex')" required />
              <p v-if="formErrors.sex" class="field-error">{{ formErrors.sex }}</p>
            </div>

            <div class="form-group">
              <label>{{ t('openCard.modal_firstname') }}</label>
              <input type="text" v-model="formData.firstName" :class="{ 'input-error': formErrors.firstName }" @input="clearFieldError('firstName')" required />
              <p v-if="formErrors.firstName" class="field-error">{{ formErrors.firstName }}</p>
            </div>

            <div class="form-group">
              <label>{{ t('openCard.modal_lastname') }}</label>
              <input type="text" v-model="formData.lastName" :class="{ 'input-error': formErrors.lastName }" @input="clearFieldError('lastName')" required />
              <p v-if="formErrors.lastName" class="field-error">{{ formErrors.lastName }}</p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ t('openCard.modal_birthdate') }}</label>
                <input type="date" v-model="formData.birthDate" />
              </div>
              <div class="form-group">
                <label>{{ t('openCard.modal_phone') }}</label>
                <input type="tel" v-model="formData.phone" :class="{ 'input-error': formErrors.phone }" @input="clearFieldError('phone')" required />
                <p v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</p>
              </div>
            </div>

            <div class="form-group">
              <label>{{ t('openCard.modal_email') }}</label>
              <input type="email" v-model="formData.email" :class="{ 'input-error': formErrors.email }" @input="clearFieldError('email')" required />
              <p v-if="formErrors.email" class="field-error">{{ formErrors.email }}</p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ t('openCard.modal_doc_type') }}</label>
                <input type="text" v-model="formData.idCard" />
              </div>
              <div class="form-group">
                <label>{{ t('openCard.modal_nationality') }}</label>
                <input type="text" v-model="formData.nationality" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ t('openCard.modal_passport_series') }}</label>
                <input type="text" v-model="formData.documentSeries" />
              </div>
              <div class="form-group">
                <label>{{ t('openCard.modal_doc_number') }}</label>
                <input type="text" v-model="formData.documentNumber" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ t('openCard.modal_issued') }}</label>
                <input type="date" v-model="formData.issuedDate" />
              </div>
              <div class="form-group">
                <label>{{ t('openCard.modal_valid_until') }}</label>
                <input type="date" v-model="formData.validUntil" />
              </div>
            </div>

            <button type="submit" class="form-submit">{{ t('openCard.modal_next') }}</button>
          </form>
        </div>
      </div>
    </div>

    <!-- МОДАЛЬНЫЕ ОКНА -->
    <Transition name="modal">
      <div v-if="modalStep === 2" class="modal-overlay" @click="closeModal">
        <div class="modal-container" @click.stop>
          <button class="modal-close" @click="closeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div class="modal-success">
            <div class="success-icon">✓</div>
            <h2 class="success-title">{{ t('openCard.modal_success_title') }}</h2>
            <button class="modal-submit" @click="nextStep">{{ t('openCard.modal_next') }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="modalStep === 3" class="modal-overlay" @click="closeModal">
        <div class="modal-container" @click.stop>
          <button class="modal-close" @click="closeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div class="modal-success">
            <h2 class="success-title">{{ t('openCard.modal_success_text') }}</h2>
            <button class="modal-submit" @click="closeModal">{{ t('openCard.modal_close') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Все стили остаются без изменений */
.booking-page {
  position: relative;
  min-height: 100vh;
}

.hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 458px;
  max-height: 458px;
  background-image: url('/assets/icons/booking.jpg');
  background-size: cover;
  background-position: center center;
  z-index: 0;
}

.booking-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
}

.form-wrapper {
  max-width: 700px;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.form-header {
  background: white;
  width: 50%;
  padding: 33px 0;
  border-radius: 15px 15px 0 0;
  border-bottom: 1px solid #4d4d54;
  text-align: center;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -3%;
  margin: 0;
}

.form-container {
  padding: 32px;
  background: white;
  border-top-right-radius: 15px;
}

.booking-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.form-group label {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0%;
  color: #999999;
  position: absolute;
  z-index: 20;
  left: 13px;
  top: 5px;
}

.form-group input {
  padding: 20px 12px 10px 12px;
  border: 1px solid #000;
  border-radius: 15px;
  font-size: 16px;
  transition: border 0.2s;
  background-color: #f6f6f6;
  width: 100%;
}

.form-group input:focus {
  outline: none;
  border-color: #285aff;
}

.form-group .input-error {
  border-color: #ff00cc;
  box-shadow: 0 0 0 1px #ff00cc;
}

.field-error {
  margin: 2px 0 0 4px;
  font-size: 12px;
  color: #cc008f;
}

.form-submit {
  background: #ff00e7;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 16px;
}

.form-submit:hover {
  background: #eb02d3;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  position: relative;
  max-width: 500px;
  width: 90%;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
  z-index: 10;
}

.modal-close:hover {
  background: #f5f5f5;
}

.modal-success {
  padding: 48px 32px;
  text-align: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: #4ade80;
  color: white;
  font-size: 48px;
  font-weight: bold;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.success-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 24px;
  line-height: 1.3;
}

.modal-submit {
  background: #ff00e7;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-submit:hover {
  background: #eb02d3;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .form-container {
    padding: 24px;
  }
  .form-title {
    font-size: 16px;
  }
  .success-title {
    font-size: 20px;
  }
}
</style>
