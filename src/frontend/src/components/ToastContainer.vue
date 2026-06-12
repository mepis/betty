<template>
  <div class="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="t.type"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<script setup>
import { toasts } from '../composables/useToast.js';
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
  box-shadow: 0 4px 12px var(--shadow);
  animation: slideIn 0.2s ease;
  max-width: 350px;
}

.toast.error { border-left: 3px solid var(--red); }
.toast.success { border-left: 3px solid var(--green); }
.toast.info { border-left: 3px solid var(--accent); }

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
