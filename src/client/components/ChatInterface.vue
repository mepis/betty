<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Message } from '../../shared/types.js';
import MessageBubble from './MessageBubble.vue';

const props = defineProps<{ messages: Message[] }>();
const emit = defineEmits<{ send: [content: string] }>();

const inputText = ref('');
const chatContainer = ref<HTMLElement | null>(null);
const isStreaming = ref(false);

// Auto-scroll to bottom when new messages arrive
function scrollToBottom(): void {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

async function handleSend(): Promise<void> {
  const content = inputText.value.trim();
  if (!content || isStreaming.value) return;

  inputText.value = '';
  scrollToBottom();
  emit('send', content);
  // Wait a tick for optimistic update, then scroll again
  await nextTick();
  scrollToBottom();
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

// Watch for new messages and scroll
let lastLength = props.messages.length;
const observer = setInterval(() => {
  const el = chatContainer.value;
  if (el) {
    // Only auto-scroll if user is near bottom (within 100px)
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (atBottom && props.messages.length > lastLength) {
      scrollToBottom();
    }
  }
  lastLength = props.messages.length;
}, 500);

defineExpose({ inputText, isStreaming });
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Messages area -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto bg-slate-50 scroll-smooth">
      <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center px-4">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-900 mb-2">Start a conversation</h2>
        <p class="text-slate-500 max-w-sm">Send a message to begin. You can branch from any assistant response to create new chat threads.</p>

        <!-- Quick prompts -->
        <div class="mt-6 grid gap-2 w-full max-w-md">
          <button @click="inputText = 'Explain how blockchain works in simple terms'"
            class="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm text-slate-600 transition">
            Explain how blockchain works in simple terms
          </button>
          <button @click="inputText = 'Help me write a Python script to parse CSV files'"
            class="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm text-slate-600 transition">
            Help me write a Python script to parse CSV files
          </button>
          <button @click="inputText = 'What are the best practices for REST API design?'
" class="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm text-slate-600 transition">
            What are the best practices for REST API design?
          </button>
        </div>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="animate-fade-in">
        <MessageBubble :message="msg" @fork="$emit('send', '')" />
      </div>
    </div>

    <!-- Input area -->
    <div class="p-4 border-t border-slate-200 bg-white">
      <form @submit.prevent="handleSend" class="max-w-3xl mx-auto flex gap-3 items-end">
        <textarea v-model="inputText" @keydown="handleKeydown" rows="1" placeholder="Type a message…"
          class="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition max-h-32"
          :disabled="isStreaming" />
        <button type="submit" :disabled="!inputText.trim() || isStreaming"
          class="h-[46px] w-[46px] rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center transition shrink-0">
          <svg v-if="!isStreaming" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          <svg v-else class="w-5 h-5 text-white animate-pulse" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3" fill="currentColor"/><circle cx="18" cy="6" r="3" fill="currentColor"/><circle cx="6" cy="18" r="3" fill="currentColor"/></svg>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
