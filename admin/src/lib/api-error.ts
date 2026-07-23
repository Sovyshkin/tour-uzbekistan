import { translateAdmin } from '@/i18n';

const translateMessage = (message: unknown) => {
  const text = String(message ?? '').trim();
  const translated = translateAdmin(`errors.${text}`);
  return translated === `errors.${text}` ? text : translated;
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as any)?.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    const messages = responseMessage.map(translateMessage).filter(Boolean);
    return messages.length > 0 ? messages.join('\n') : fallback;
  }

  if (responseMessage) {
    return translateMessage(responseMessage);
  }

  const errorMessage = (error as any)?.message;
  return errorMessage ? translateMessage(errorMessage) : fallback;
};
