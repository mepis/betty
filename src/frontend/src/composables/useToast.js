import { ref } from 'vue';

const toasts = ref([]);

function toast(message, type = 'info') {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3000);
}

export { toasts, toast };
