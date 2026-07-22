import axios from 'axios';

import { useAuthStore } from '@/stores/auth';

const normalizeApiBaseUrl = (value?: string) => {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return '/api/v1';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const http = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
});

let refreshPromise: Promise<void> | null = null;

const isAdminAuthRequest = (url?: string) => {
  return Boolean(
    url?.includes('/admin/auth/login') ||
      url?.includes('/admin/auth/refresh'),
  );
};

const redirectToLogin = () => {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const loginPath = `${basePath}/login`;

  if (window.location.pathname === loginPath) {
    return;
  }

  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`${loginPath}?redirect=${encodeURIComponent(redirect)}`);
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
