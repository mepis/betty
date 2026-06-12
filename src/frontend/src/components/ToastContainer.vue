<template>
  <div class="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="t.type"
    >
      <div class="toast-icon">
        <svg v-if="t.type === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else-if="t.type === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <span class="toast-message">{{ t.message }}</span>
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
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--text-primary);
  box-shadow: var(--shadow);
  max-width: 340px;
  animation: slideIn 0.2s ease;
  pointer-events: auto;
}

.toast-icon {
  flex-shrink: 0;
}

.toast.success .toast-icon { color: var(--success); }
.toast.error .toast-icon { color: var(--error); }
.toast.info .toast-icon { color: var(--info); }

.toast-message {
  flex: 1;
  line-height: 1.4;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(16px); }
}
</style>
