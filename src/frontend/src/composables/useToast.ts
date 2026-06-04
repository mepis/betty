import { ref } from 'vue';

export interface Toast {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  duration?: number;
}

const toasts = ref<Toast[]>([]);

let toastIdCounter = 0;

export function useToast() {
  function showToast(type: Toast['type'], message: string, duration = 5000) {
    const id = `toast_${++toastIdCounter}`;
    toasts.value.push({ id, type, message, duration });

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, showToast, removeToast };
}
