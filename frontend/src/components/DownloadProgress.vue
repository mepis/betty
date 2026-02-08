<template>
  <div class="bg-dark-800 rounded-lg p-4 border border-dark-700">
    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <h4 class="text-sm font-medium text-white">{{ download.filename }}</h4>
        <div class="flex items-center gap-2 text-xs text-dark-400 mt-1">
          <span>{{ formatBytes(download.bytesDownloaded) }} / {{ formatBytes(download.totalBytes) }}</span>
          <span v-if="download.speed">• {{ formatSpeed(download.speed) }}</span>
        </div>
      </div>
      <button
        @click="$emit('cancel')"
        class="text-dark-400 hover:text-red-400 transition-colors"
        title="Cancel download"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="w-full bg-dark-700 rounded-full h-2">
      <div
        class="bg-blue-600 h-2 rounded-full transition-all duration-300"
        :style="{ width: `${download.progress}%` }"
      ></div>
    </div>

    <div class="text-xs text-dark-400 mt-1 text-right">
      {{ download.progress }}%
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  download: {
    type: Object,
    required: true,
  },
});

defineEmits(['cancel']);

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSecond) => {
  return formatBytes(bytesPerSecond) + '/s';
};
</script>
