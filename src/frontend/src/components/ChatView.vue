<template>
  <main class="main">
    <div class="chat-header">
      <div class="chat-header-left">
        <button class="sidebar-toggle" @click="$emit('toggle-sidebar')">☰</button>
        <h2>Session</h2>
      </div>
    </div>

    <div class="messages" ref="messagesEl">
      <div v-if="!messages.length && !streamingMsg" class="empty-state">
        <div class="icon">💬</div>
        <h2>Welcome to Betty</h2>
        <p>Your AI coding agent is ready. Start a conversation and it will help you write, debug, and refactor code.</p>
        <div class="suggestions">
          <button class="suggestion-btn" @click="sendSuggestion('List the files in the current directory')">📂 List files in current directory</button>
          <button class="suggestion-btn" @click="sendSuggestion('Explain how this project is structured')">🔍 Explain project structure</button>
          <button class="suggestion-btn" @click="sendSuggestion('What tools are available to you?')">🛠️ What tools are available?</button>
        </div>
      </div>

      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :msg="msg"
      />

      <div v-if="streamingMsg" class="message assistant">
        <div class="message-header">
          <div class="message-avatar">B</div>
          <span class="message-role">Betty</span>
          <span class="message-time">just now</span>
        </div>
        <div class="message-content streaming-cursor" v-html="streamingHtml"></div>
      </div>
    </div>

    <MessageInput
      ref="inputRef"
      v-model="inputText"
      :is-streaming="isStreaming"
      :connected="connected"
      :show-command-palette="showCommandPalette"
      :filtered-commands="filteredCommands"
      :command-selected-index="commandSelectedIndex"
      @send="sendMessage"
      @abort="abortStream"
      @select-command="selectCommand"
      @navigate-commands="navigateCommands"
      @close-command-palette="showCommandPalette = false"
      @images-selected="selectedImages = $event"
    />

    <div class="sidebar-overlay" :class="{ active: sidebarOpen }" @click="sidebarOpen = false"></div>
  </main>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { renderMarkdown } from '../utils.js';
import ChatMessage from './ChatMessage.vue';
import MessageInput from './MessageInput.vue';

const props = defineProps({
  messages: Array,
  isStreaming: Boolean,
  connected: Boolean,
  streamingMsg: Object,
  availableCommands: Array,
});

const emit = defineEmits([
  'send',
  'abort',
  'toggle-sidebar',
  'select-command',
]);

const inputText = ref('');
const messagesEl = ref(null);
const inputRef = ref(null);
const sidebarOpen = ref(false);
const showCommandPalette = ref(false);
const commandSelectedIndex = ref(0);
const selectedImages = ref([]);

const BUILT_IN_COMMANDS = [
  { name: 'help', description: 'Show help and available commands', icon: '❓' },
  { name: 'shortcuts', description: 'Show keyboard shortcuts', icon: '⌨️' },
  { name: 'clear', description: 'Clear the current session', icon: '🗑️' },
  { name: 'compact', description: 'Compact the context window', icon: '◈' },
  { name: 'export', description: 'Export session as HTML', icon: '↓' },
  { name: 'new', description: 'Start a new session', icon: '✦' },
];

const filteredCommands = computed(() => {
  const all = [...BUILT_IN_COMMANDS, ...props.availableCommands];
  const val = inputText.value;
  if (!val.startsWith('/')) return all.map((cmd, i) => ({ ...cmd, index: i }));
  const q = val.toLowerCase().slice(1);
  return all
    .map((cmd, i) => ({ ...cmd, index: i }))
    .filter(cmd =>
      cmd.name.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q))
    );
});

const streamingHtml = computed(() => {
  if (!props.streamingMsg) return '';
  let html = '';
  if (props.streamingMsg.thinking) {
    html += `<div class="thinking-block">
      <div class="thinking-header" onclick="toggleThinking(this)">
        🧠 <span>Thinking</span>
        <span style="margin-left:auto; font-size:10px">▼</span>
      </div>
      <div class="thinking-content">${renderMarkdown(props.streamingMsg.thinking)}</div>
    </div>`;
  }
  return html + renderMarkdown(props.streamingMsg.content);
});

// Watch input for command palette
watch(inputText, (val) => {
  if (val.startsWith('/') && !showCommandPalette.value) {
    showCommandPalette.value = true;
    commandSelectedIndex.value = 0;
  } else if (showCommandPalette.value && !val.startsWith('/')) {
    showCommandPalette.value = false;
  }
});

// Auto-scroll
watch(() => props.messages.length, () => {
  scrollToBottom();
});

watch(() => props.streamingMsg?.content, () => {
  scrollToBottom();
});

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  });
}

function sendMessage() {
  const text = inputText.value.trim();
  if ((!text && !selectedImages.value.length) || !props.connected) return;

  emit('send', { text, images: selectedImages.value });
  inputText.value = '';
  selectedImages.value = [];
  showCommandPalette.value = false;
}

function sendSuggestion(text) {
  inputText.value = text;
  sendMessage();
}

function abortStream() {
  emit('abort');
}

function selectCommand(name) {
  showCommandPalette.value = false;
  emit('select-command', name);
}

function navigateCommands(direction) {
  if (filteredCommands.value.length === 0) return;
  commandSelectedIndex.value += direction;
  if (commandSelectedIndex.value < 0) commandSelectedIndex.value = filteredCommands.value.length - 1;
  if (commandSelectedIndex.value >= filteredCommands.value.length) commandSelectedIndex.value = 0;
}
</script>

<style scoped>
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header h2 {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-toggle {
  display: flex;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.sidebar-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
}

.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  padding: 40px;
}

.empty-state .icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  max-width: 400px;
  line-height: 1.5;
}

.empty-state .suggestions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-btn {
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: all 0.15s;
  max-width: 400px;
}

.suggestion-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--accent);
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

.sidebar-overlay.active {
  display: block;
}

@media (max-width: 768px) {
  .sidebar-toggle { display: flex; }
}
</style>
