import { getApiLocale, getSiteSettings } from '@/api';

const toNestedMessages = (settings) => {
  return Object.entries(settings || {}).reduce((acc, [key, value]) => {
    if (typeof value !== 'string' || !value.trim()) {
      return acc;
    }

    const parts = key.split('.').filter(Boolean);

    if (!parts.length) {
      return acc;
    }

    let target = acc;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        target[part] = value;
        return;
      }

      target[part] = target[part] || {};
      target = target[part];
    });

    return acc;
  }, {});
};

export const loadCmsSettings = async (i18n, locale) => {
  const apiLocale = getApiLocale(locale);
  const settings = await getSiteSettings(apiLocale);
  const messages = toNestedMessages(settings);

  i18n.mergeLocaleMessage(locale, messages);

  if (apiLocale !== locale) {
    i18n.mergeLocaleMessage(apiLocale, messages);
  }

  return settings;
};
