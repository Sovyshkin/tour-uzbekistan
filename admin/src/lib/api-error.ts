const messageTranslations: Record<string, string> = {
  'password must be longer than or equal to 8 characters': 'Пароль должен быть не короче 8 символов',
  'email must be an email': 'Введите корректный email',
  'Invalid email or password': 'Неверный email или пароль',
  Unauthorized: 'Необходимо войти в систему',
  Forbidden: 'Недостаточно прав для выполнения действия',
};

const translateMessage = (message: unknown) => {
  const text = String(message ?? '').trim();
  return messageTranslations[text] ?? text;
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
