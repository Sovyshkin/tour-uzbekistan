import axios from 'axios';

import { useAuthStore } from '@/stores/auth';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
});

let refreshPromise: Promise<void> | null = null;

const isAdminAuthRequest = (url?: string) => {
  return Boolean(
    url?.includes('/admin/auth/login') ||
      url?.includes('/admin/auth/refresh'),
  );
};

const redirectToLogin = () => {
  if (window.location.pathname === '/login') {
    return;
  }

  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
};

http.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore();
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;

    if (isUnauthorized && isAdminAuthRequest(originalRequest?.url)) {
      if (originalRequest?.url?.includes('/admin/auth/refresh')) {
        authStore.logout();
        redirectToLogin();
      }

      return Promise.reject(error);
    }

    if (isUnauthorized && authStore.refreshToken && !originalRequest?._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = authStore.refresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        await refreshPromise;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        authStore.logout();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    if (isUnauthorized) {
      authStore.logout();
      redirectToLogin();
    }

    if (error.response?.status === 403) {
      authStore.forbiddenMessage = 'Недостаточно прав для выполнения действия';
    }

    return Promise.reject(error);
  },
);

export default http;
