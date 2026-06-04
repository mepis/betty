<template>
  <div class="input-area">
    <!-- Queue indicator -->
    <div v-if="pendingSteer > 0 || pendingFollowUp > 0" class="queue-indicator">
      {{ pendingSteer + pendingFollowUp }} messages queued
    </div>

    <!-- Compaction result -->
    <div v-if="compactionResult" class="compaction-result">
      Compacted: {{ compactionTokens }} tokens
    </div>

    <div class="input-container">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="chat-input"
        placeholder="Ask me anything..."
        rows="1"
        :disabled="isStreaming"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || isStreaming"
        @click="sendMessage"
      >
        <svg v-if="!isStreaming" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useWebSocket } from '@/composables/useWebSocket';

const chatStore = useChatStore();
const { sendCommand } = useWebSocket();

const inputText = ref('');
const inputRef = ref<HTMLTextAreaElement | null>(null);

const isStreaming = computed(() => chatStore.isStreaming);
const pendingSteer = computed(() => chatStore.pendingSteerMessages);
const pendingFollowUp = computed(() => chatStore.pendingFollowUpMessages);
const compactionResult = computed(() => chatStore.lastCompactionResult !== null);
const compactionTokens = computed(() => {
  if (!chatStore.lastCompactionResult) return '';
  const { tokensBefore, tokensAfter } = chatStore.lastCompactionResult;
  if (tokensAfter !== undefined) {
    return `${tokensBefore - tokensAfter} saved`;
  }
  return `${tokensBefore} before`;
});

function autoResize() {
  if (!inputRef.value) return;
  inputRef.value.style.height = 'auto';
  inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 128) + 'px';
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
  // Shift+Enter allows newline (default behavior)
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || chatStore.isStreaming) return;

  inputText.value = '';
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
  }

  // Add user message to store
  chatStore.addUserMessage(text);

  // Send to backend
  try {
    await sendCommand('prompt', { text });
  } catch (err: any) {
    console.error('Failed to send message:', err);
  }
}
</script>
