const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const AUTH_STORAGE_KEY = 'tour_uzbekistan_auth';

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      (typeof payload === 'string' ? payload : 'Request failed');

    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return payload;
}

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function request(path, options = {}, retry = true) {
  const auth = getStoredAuth();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (auth?.accessToken && !headers.Authorization && options.withAuth !== false) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(path.startsWith('http') ? path : `${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && auth?.refreshToken && options.withAuth !== false) {
    const refreshed = await refreshTokens(auth.refreshToken).catch(() => null);

    if (refreshed?.accessToken) {
      return request(path, options, false);
    }
  }

  return parseResponse(response);
}

export async function refreshTokens(refreshToken) {
  const payload = await request(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      withAuth: false,
    },
    false,
  );

  setStoredAuth(payload);
  return payload;
}

export function getAuth() {
  return getStoredAuth();
}

export function isAuthenticated() {
  return Boolean(getStoredAuth()?.accessToken);
}

export function setAuth(auth) {
  setStoredAuth(auth);
}

export function clearAuth() {
  clearStoredAuth();
}

export function getApiLocale(locale) {
  return ['ru', 'en', 'uz'].includes(locale) ? locale : 'en';
}

export function formatBackendDate(value, locale = 'en') {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function resolveAssetUrl(value) {
  if (!value) {
    return '';
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }

  if (value.startsWith('/uploads')) {
    return `${new URL(API_BASE_URL).origin}${value}`;
  }

  return value;
}

export async function getHome(locale) {
  return request(buildUrl('/home', { locale }));
}

export async function getSiteSettings(locale) {
  return request(buildUrl('/settings', { locale }));
}

export async function getPage(slug, locale) {
  return request(buildUrl(`/pages/${slug}`, { locale }));
}

export async function getCountries(locale) {
  return request(buildUrl('/countries', { locale }));
}

export async function getCountry(slug, locale) {
  return request(buildUrl(`/countries/${slug}`, { locale }));
}

export async function getServices(params) {
  return request(buildUrl('/services', params));
}

export async function getService(slug, locale) {
  return request(buildUrl(`/services/${slug}`, { locale }));
}

export async function getWhyUsCategories(locale) {
  return request(buildUrl('/why-us/categories', { locale }));
}

export async function getNews(params) {
  return request(buildUrl('/news', params));
}

export async function getNewsItem(slug, locale) {
  return request(buildUrl(`/news/${slug}`, { locale }));
}

export async function getTours(params) {
  return request(buildUrl('/tours', params));
}

export async function getTour(slug, locale) {
  return request(buildUrl(`/tours/${slug}`, { locale }));
}

export async function submitLead(payload) {
  return request('/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
    withAuth: false,
  });
}

export async function registerPartner(payload) {
  const auth = await request('/auth/register/partner', {
    method: 'POST',
    body: JSON.stringify(payload),
    withAuth: false,
  });

  setStoredAuth(auth);
  return auth;
}

export async function login(payload) {
  const auth = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    withAuth: false,
  });

  setStoredAuth(auth);
  return auth;
}

export async function createBooking(payload) {
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyBookings() {
  return request('/bookings/me');
}
