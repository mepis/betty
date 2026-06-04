<template>
  <div class="connection-bar" :class="connectionState">
    <div class="connection-info">
      <span class="status-dot" :class="connectionState" />
      <span>{{ connectionLabel }}</span>
      <span v-if="currentModel" class="model-info">{{ currentModel }}</span>
      <span v-if="currentSessionName" class="session-info">{{ currentSessionName }}</span>
    </div>
    <button @click="$emit('openSettings')" class="settings-btn">⚙</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';

defineEmits<{
  openSettings: [];
}>();

const chatStore = useChatStore();

const connectionState = computed(() => chatStore.connectionState);

const connectionLabel = computed(() => {
  switch (chatStore.connectionState) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'error':
      return 'Error';
    default:
      return 'Disconnected';
  }
});

const currentModel = computed(() => chatStore.currentModel);
const currentSessionName = computed(() => chatStore.currentSessionName);
</script>
