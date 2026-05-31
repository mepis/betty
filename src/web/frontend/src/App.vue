<template>
  <div class="h-screen flex flex-col bg-gray-950 text-gray-100">
    <!-- Status bar -->
    <StatusBar
      :status="status"
      :is-idle="isIdle"
      :session="currentSession"
      :queue-length="queueLength"
      :error="error"
    />

    <!-- Toolbar -->
    <Toolbar
      :messages="messages"
      @new-session="rpc.newSession()"
      @compact="rpc.compact()"
      @cycle-model="rpc.cycleModel()"
      @clear="rpc.clearMessages()"
    />

    <!-- Messages area -->
    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto"
    >
      <div class="max-w-4xl mx-auto py-2 sm:py-4">
        <!-- Welcome message when empty -->
        <div
          v-if="messages.length === 0"
          class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-10 sm:py-20"
        >
          <div class="text-4xl sm:text-5xl mb-3 sm:mb-4">π</div>
          <h2 class="text-xl sm:text-2xl font-bold text-gray-200 mb-2">pi.dev</h2>
          <p class="text-sm sm:text-base text-gray-500 max-w-sm sm:max-w-md">
            Send a message to start. The agent connects to pi.dev's RPC server
            and streams responses in real-time.
          </p>
        </div>

        <!-- Messages -->
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />

        <!-- Typing indicator -->
        <div v-if="!isIdle" class="px-2 sm:px-4 py-2 sm:py-3 flex gap-2 sm:gap-3">
          <div class="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
            π
          </div>
          <div class="flex items-center gap-1 text-gray-400 text-xs sm:text-sm">
            <span class="animate-bounce">●</span>
            <span class="animate-bounce" style="animation-delay: 0.1s">●</span>
            <span class="animate-bounce" style="animation-delay: 0.2s">●</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <ChatInput
      :is-idle="isIdle"
      @send="onSend"
      @steer="rpc.steer"
      @abort="rpc.abort"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, nextTick, computed } from "vue";
import { useRpc } from "./composables/useRpc.js";
import StatusBar from "./components/StatusBar.vue";
import Toolbar from "./components/Toolbar.vue";
import ChatMessage from "./components/ChatMessage.vue";
import ChatInput from "./components/ChatInput.vue";

const rpc = useRpc();
const chatContainer = ref(null);

// Expose reactive refs from the composable
const status = computed(() => rpc.status.value);
const messages = computed(() => rpc.messages.value);
const isIdle = computed(() => rpc.isIdle.value);
const currentSession = computed(() => rpc.currentSession.value);
const queueLength = computed(() => rpc.queueLength.value);
const error = computed(() => rpc.error.value);

function onSend(text) {
  rpc.prompt(text);
  scrollToBottom();
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

// Listen for scroll events from the RPC layer
window.addEventListener("scroll-to-bottom", scrollToBottom);

onMounted(() => {
  rpc.connect();
});

onUnmounted(() => {
  window.removeEventListener("scroll-to-bottom", scrollToBottom);
  rpc.disconnect();
});
</script>
