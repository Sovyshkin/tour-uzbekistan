import { readonly, ref } from 'vue';

const notifications = ref([]);

function removeNotification(id) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function showNotification({
  title,
  message,
  type = 'info',
  duration = 4000,
}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  notifications.value = [
    ...notifications.value,
    {
      id,
      title,
      message,
      type,
    },
  ];

  if (duration > 0) {
    window.setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  return id;
}

export function useNotifications() {
  return {
    notifications: readonly(notifications),
    showNotification,
    removeNotification,
    success(message, title = 'Success') {
      return showNotification({ title, message, type: 'success' });
    },
    error(message, title = 'Something went wrong') {
      return showNotification({ title, message, type: 'error', duration: 5000 });
    },
    info(message, title = 'Notice') {
      return showNotification({ title, message, type: 'info' });
    },
  };
}
