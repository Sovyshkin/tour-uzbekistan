<script setup lang="ts">
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
});

const submit = async () => {
  try {
    await authStore.login(form.email, form.password);
    ElMessage.success('Вход выполнен');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.push(redirect);
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, 'Не удалось войти'));
  }
};
</script>

<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="login-title">Вход в админ-панель</div>
      <div class="login-subtitle">
        Используй учетную запись с ролью ADMIN или MANAGER
      </div>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="Email">
          <el-input v-model="form.email" placeholder="superadmin@centrum-holidays.test" />
        </el-form-item>

        <el-form-item label="Пароль">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="Введите пароль"
          />
        </el-form-item>

        <el-button
          type="primary"
          class="submit-button"
          :loading="authStore.loading"
          @click="submit"
        >
          Войти
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

.login-subtitle {
  color: #6b7280;
  margin-bottom: 24px;
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
