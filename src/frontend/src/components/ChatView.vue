<template>
  <div class="messages-container" ref="containerRef">
    <!-- Empty state -->
    <div v-if="!hasMessages" class="empty-state">
      <div class="empty-icon">💬</div>
      <h2>Ask me anything...</h2>
      <p>I can help you with coding, debugging, architecture, and more.</p>
      <div class="suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="suggestion-btn"
          @click="fillInput(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- Streaming indicator -->
    <StreamingIndicator v-else-if="chatStore.streamingIndicator" />

    <!-- Messages -->
    <div v-else class="p-4 space-y-1">
      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>

    <!-- Bottom spacer for auto-scroll -->
    <div ref="bottomRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useChatStore } from '@/stores/chat';
import MessageBubble from './MessageBubble.vue';
import StreamingIndicator from './StreamingIndicator.vue';

const chatStore = useChatStore();

const containerRef = ref<HTMLDivElement | null>(null);
const bottomRef = ref<HTMLDivElement | null>(null);

const hasMessages = computed(() => chatStore.hasMessages);
const messages = computed(() => chatStore.messages);

const suggestions = [
  'Explain how this code works',
  'Help me debug this error',
  'Write a test for this function',
  'Review my code for best practices',
];

function fillInput(text: string) {
  // Dispatch a custom event to set the input value
  window.dispatchEvent(
    new CustomEvent('fill-input', { detail: text }),
  );
}

// Auto-scroll to bottom
watch(
  () => [messages.value.length, chatStore.isStreaming],
  async () => {
    if (chatStore.autoScroll) {
      await nextTick();
      bottomRef.value?.scrollIntoView({ behavior: 'smooth' });
    }
  },
);
</script>
