<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="onCancel"
  >
    <div class="bg-dark-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-white mb-2">
        {{ title }}
      </h3>
      <p class="text-dark-300 mb-6">
        {{ message }}
      </p>
      <div class="flex justify-end gap-3">
        <button
          @click="onCancel"
          class="px-4 py-2 rounded bg-dark-700 text-dark-200 hover:bg-dark-600 transition-colors"
        >
          {{ cancelText }}
        </button>
        <button
          @click="onConfirm"
          class="px-4 py-2 rounded transition-colors"
          :class="confirmClass"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirm Action',
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  confirmClass: {
    type: String,
    default: 'bg-blue-600 text-white hover:bg-blue-700',
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('cancel');
};
</script>
