<script setup lang="ts">
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { locale, locales, t } = useAdminI18n();

const form = reactive({
  email: '',
  password: '',
});

const normalizeRedirect = (value: string) => {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  if (basePath && value.startsWith(`${basePath}/`)) {
    return value.slice(basePath.length) || '/';
  }

  return value || '/';
};

const submit = async () => {
  try {
    await authStore.login(form.email, form.password);
    ElMessage.success(t('login.success'));
    const redirect = normalizeRedirect(typeof route.query.redirect === 'string' ? route.query.redirect : '/');
    router.push(redirect);
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('login.failed')));
  }
};
</script>

<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="login-top">
        <div>
          <div class="login-title">{{ t('login.title') }}</div>
          <div class="login-subtitle">
            {{ t('login.subtitle') }}
          </div>
        </div>
        <el-segmented
          v-model="locale"
          class="login-language"
          :options="locales.map((item) => ({ label: item.label, value: item.code }))"
        />
      </div>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="Email">
          <el-input v-model="form.email" placeholder="superadmin@centrum-holidays.test" />
        </el-form-item>

        <el-form-item :label="t('login.password')">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="t('login.passwordPlaceholder')"
          />
        </el-form-item>

        <el-button
          type="primary"
          class="submit-button"
          :loading="authStore.loading"
          @click="submit"
        >
          {{ t('login.submit') }}
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 30%),
    radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.18), transparent 28%),
    #f5f7fb;
}

.login-card {
  width: 100%;
  max-width: 440px;
  border-radius: 12px;
  min-width: 0;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.login-language {
  flex-shrink: 0;
}

.login-subtitle {
  color: #6b7280;
  line-height: 1.5;
}

.submit-button {
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 520px) {
  .login-page {
    align-items: flex-start;
    padding: 16px 12px;
  }

  .login-card {
    margin-top: 48px;
  }

  .login-title {
    font-size: 24px;
    line-height: 1.2;
  }

  .login-subtitle {
    margin-bottom: 18px;
  }
}
</style>
