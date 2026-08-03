import { Locale } from '@prisma/client';

export function pickTranslation<TTranslation extends { locale: Locale }>(
  translations: TTranslation[] | null | undefined,
  locale: Locale,
) {
  if (!translations?.length) {
    return undefined;
  }

  return (
    translations.find((translation) => translation.locale === locale) ||
    translations.find((translation) => translation.locale === Locale.ru) ||
    translations[0]
  );
}
