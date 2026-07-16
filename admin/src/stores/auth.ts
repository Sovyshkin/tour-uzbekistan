import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import http from '@/lib/http';

type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'ADMIN' | 'MANAGER';
  preferredLocale: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'MANAGER';
  };
};

const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  const user = ref<AuthUser | null>(null);
  const initialized = ref(false);
  const loading = ref(false);
  const forbiddenMessage = ref('');

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));

  const setTokens = (payload: AuthResponse) => {
    accessToken.value = payload.accessToken;
    refreshToken.value = payload.refreshToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  };

  const clearTokens = () => {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  const fetchMe = async () => {
    const { data } = await http.get<AuthUser>('/admin/auth/me');
    user.value = data;
  };

  const bootstrap = async () => {
    if (!accessToken.value) {
      initialized.value = true;
      return;
    }

    try {
      await fetchMe();
    } catch {
      clearTokens();
    } finally {
      initialized.value = true;
    }
  };

  const login = async (email: string, password: string) => {
    loading.value = true;
    forbiddenMessage.value = '';
    try {
      const { data } = await http.post<AuthResponse>('/admin/auth/login', {
        email,
        password,
      });
      setTokens(data);
      await fetchMe();
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    if (!refreshToken.value) {
      throw new Error('No refresh token');
    }

    const { data } = await http.post<AuthResponse>('/admin/auth/refresh', {
      refreshToken: refreshToken.value,
    });
    setTokens(data);
    if (!user.value) {
      await fetchMe();
    }
  };

  const logout = () => {
    clearTokens();
  };

  return {
    accessToken,
    refreshToken,
    user,
    initialized,
    loading,
    forbiddenMessage,
    isAuthenticated,
    bootstrap,
    login,
    refresh,
    fetchMe,
    logout,
  };
});
