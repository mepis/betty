<template>
  <div v-if="indicator" class="streaming-indicator flex items-center gap-2 py-2 px-4">
    <div v-if="indicator.type === 'compacting' || indicator.type === 'retrying'" class="spinner">
      <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
    <div v-else class="flex gap-1">
      <span class="pulse-dot w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
      <span class="pulse-dot w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
      <span class="pulse-dot w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
    </div>
    <span class="text-sm text-gray-400">{{ indicator.text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

const indicator = computed(() => chatStore.streamingIndicator);
</script>

<style scoped>
.streaming-indicator {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(31, 41, 55, 0.5);
  background: rgba(17, 24, 39, 0.3);
}
</style>
