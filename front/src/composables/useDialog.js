import { readonly, ref } from 'vue';

const dialogState = ref({
  isOpen: false,
  title: '',
  message: '',
  tone: 'info',
  confirmLabel: 'Close',
  onConfirm: null,
});

function closeDialog() {
  dialogState.value = {
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
    confirmLabel: 'Close',
    onConfirm: null,
  };
}

function openDialog({
  title,
  message,
  tone = 'info',
  confirmLabel = 'Close',
  onConfirm = null,
}) {
  dialogState.value = {
    isOpen: true,
    title,
    message,
    tone,
    confirmLabel,
    onConfirm,
  };
}

function confirmDialog() {
  const action = dialogState.value.onConfirm;
  closeDialog();

  if (typeof action === 'function') {
    action();
  }
}

export function useDialog() {
  return {
    dialogState: readonly(dialogState),
    openDialog,
    closeDialog,
    confirmDialog,
  };
}
