const normalizeApiBaseUrl = (value) => {
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

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

const getRuntimeOrigin = () =>
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3000';

const getApiUrl = (path = '') => {
  const baseUrl = new URL(API_BASE_URL, getRuntimeOrigin());
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  baseUrl.pathname = `${basePath}${normalizedPath}`.replace(/\/{2,}/g, '/');
  return baseUrl;
};

const AUTH_STORAGE_KEY = 'tour_uzbekistan_auth';

function buildUrl(path, query) {
  const url = getApiUrl(path);

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
  window.dispatchEvent(new CustomEvent('tour-auth-changed'));
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('tour-auth-changed'));
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

  const response = await fetch(path.startsWith('http') ? path : getApiUrl(path).toString(), {
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

export function isB2BAuthenticated() {
  const auth = getStoredAuth();
  return Boolean(auth?.accessToken && auth?.user?.role === 'PARTNER');
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

const optimizedPublicAssets = new Map([
  ['/assets/icons/8ec662fe56344049271e593f6db12dfdb7df8bdb.png', '/assets/icons/8ec662fe56344049271e593f6db12dfdb7df8bdb.webp'],
  ['/assets/icons/about-us.jpg', '/assets/icons/about-us.webp'],
  ['/assets/icons/booking.jpg', '/assets/icons/booking.webp'],
  ['/assets/icons/card-news1.jpg', '/assets/icons/card-news1.webp'],
  ['/assets/icons/card-news2.jpg', '/assets/icons/card-news2.webp'],
  ['/assets/icons/card-news3.png', '/assets/icons/card-news3.webp'],
  ['/assets/icons/card-news4.jpg', '/assets/icons/card-news4.webp'],
  ['/assets/icons/card-news5.jpg', '/assets/icons/card-news5.webp'],
  ['/assets/icons/card-news6.jpg', '/assets/icons/card-news6.webp'],
  ['/assets/icons/card.png', '/assets/icons/card1.webp'],
  ['/assets/icons/card1.png', '/assets/icons/card1.webp'],
  ['/assets/icons/card2.png', '/assets/icons/card2.webp'],
  ['/assets/icons/card3.png', '/assets/icons/card3.webp'],
  ['/assets/icons/card4.png', '/assets/icons/card4.webp'],
  ['/assets/icons/card5.png', '/assets/icons/card5.webp'],
  ['/assets/icons/card6.png', '/assets/icons/card6.webp'],
  ['/assets/icons/countryPage.jpg', '/assets/icons/countryPage.webp'],
  ['/assets/icons/countryPage2.jpg', '/assets/icons/countryPage2.webp'],
  ['/assets/icons/directions.jpg', '/assets/icons/directions.webp'],
  ['/assets/icons/dmc-detail.png', '/assets/icons/dmc-detail.webp'],
  ['/assets/icons/dmc.png', '/assets/icons/dmc.webp'],
  ['/assets/icons/dmc1.png', '/assets/icons/dmc1.webp'],
  ['/assets/icons/dmc2.jpg', '/assets/icons/dmc2.webp'],
  ['/assets/icons/dmc3.jpg', '/assets/icons/dmc3.webp'],
  ['/assets/icons/gorizontalDMC.jpg', '/assets/icons/gorizontalDMC.webp'],
  ['/assets/icons/news-detail.jpg', '/assets/icons/news-detail.webp'],
  ['/assets/icons/news1.jpg', '/assets/icons/news1.webp'],
  ['/assets/icons/news2.jpg', '/assets/icons/news2.webp'],
  ['/assets/icons/news3.jpg', '/assets/icons/news3.webp'],
  ['/assets/icons/services.jpg', '/assets/icons/services.webp'],
  ['/assets/icons/tours.png', '/assets/icons/tours.webp'],
  ['/assets/icons/zona-turbulentnosti.jpg', '/assets/icons/zona-turbulentnosti.webp'],
]);

export function resolveAssetUrl(value) {
  if (!value) {
    return '';
  }

  const optimizedAsset = optimizedPublicAssets.get(value);
  if (optimizedAsset) {
    return optimizedAsset;
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
    try {
      const url = new URL(value, getRuntimeOrigin());
      const optimizedPath = optimizedPublicAssets.get(url.pathname);
      if (optimizedPath) {
        url.pathname = optimizedPath;
        return url.toString();
      }
    } catch {
      return value;
    }

    return value;
  }

  if (value.startsWith('/uploads')) {
    return `${new URL(API_BASE_URL, getRuntimeOrigin()).origin}${value}`;
  }

  return value;
}

export function normalizeImageSettings(settings) {
  const normalizeRange = (value, fallback, min, max) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(numberValue)));
  };

  let source = settings;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }

  if (!source || typeof source !== 'object') {
    return { positionX: 50, positionY: 50, scale: 100 };
  }

  return {
    positionX: normalizeRange(source.positionX, 50, 0, 100),
    positionY: normalizeRange(source.positionY, 50, 0, 100),
    scale: normalizeRange(source.scale, 100, 100, 300),
  };
}

export function imageObjectStyle(settings) {
  const normalized = normalizeImageSettings(settings);

  return {
    width: '100%',
    height: '100%',
    maxWidth: 'none',
    display: 'block',
    objectFit: 'cover',
    objectPosition: `${normalized.positionX}% ${normalized.positionY}%`,
    transform: `scale(${normalized.scale / 100})`,
    transformOrigin: `${normalized.positionX}% ${normalized.positionY}%`,
    willChange: 'transform, object-position',
  };
}

export function backgroundImageStyle(imageUrl, settings) {
  if (!imageUrl) {
    return undefined;
  }

  const normalized = normalizeImageSettings(settings);

  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundPosition: `${normalized.positionX}% ${normalized.positionY}%`,
    backgroundSize: normalized.scale === 100 ? 'cover' : `${normalized.scale}% auto`,
  };
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
