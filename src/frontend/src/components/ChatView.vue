<template>
  <main class="main">
    <div class="chat-header">
      <div class="chat-header-left">
        <button class="sidebar-toggle" @click="$emit('toggle-sidebar')" title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h2>Chat</h2>
      </div>
      <div class="chat-header-right">
        <div class="connection-badge" :class="{ connected, streaming: isStreaming }">
          <span class="badge-dot"></span>
        </div>
      </div>
    </div>

    <div class="messages" ref="messagesEl">
      <div v-if="!messages.length && !streamingMsg" class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2>How can I help?</h2>
        <p>Ask me anything about your codebase, and I'll help you write, debug, and refactor.</p>
        <div class="suggestions">
          <button class="suggestion-btn" @click="sendSuggestion('List the files in the current directory')">
            <span class="suggestion-icon">📂</span>
            <span>List files in current directory</span>
          </button>
          <button class="suggestion-btn" @click="sendSuggestion('Explain how this project is structured')">
            <span class="suggestion-icon">🔍</span>
            <span>Explain project structure</span>
          </button>
          <button class="suggestion-btn" @click="sendSuggestion('What tools are available to you?')">
            <span class="suggestion-icon">🛠️</span>
            <span>What tools are available?</span>
          </button>
        </div>
      </div>

      <!-- Non-virtualized rendering (small sessions) -->
      <template v-if="!shouldVirtualize">
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :msg="msg"
          :is-streaming="msg.isStreaming"
        />
      </template>

      <!-- Virtualized rendering (large sessions) -->
      <template v-else>
        <div class="virtual-spacer" :style="{ height: visibleRange.offsetTop + 'px' }" v-if="visibleRange.offsetTop > 0"></div>
        <ChatMessage
          v-for="{ index, item: msg } in visibleItems"
          :key="msg.id"
          :ref="(el) => el && measureItem(index, el)"
          :msg="msg"
          :is-streaming="msg.isStreaming"
        />
        <div class="virtual-spacer" :style="{ height: visibleRange.offsetBottom + 'px' }" v-if="visibleRange.offsetBottom > 0"></div>
      </template>

      <!-- Jump to bottom button -->
      <button
        v-if="showResumeButton"
        class="resume-btn"
        @click="scrollToBottom"
        title="Jump to bottom"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAutoScroll } from '../composables/useAutoScroll.js';
import { useVirtualList } from '../composables/useVirtualList.js';
import ChatMessage from './ChatMessage.vue';
import MessageInput from './MessageInput.vue';

const props = defineProps({
  messages: Array,
  isStreaming: Boolean,
  connected: Boolean,
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

// Auto-scroll
const { showResumeButton, onContentChange, onUserScroll, scrollToBottom: autoScrollToBottom } = useAutoScroll(messagesEl, () => props.isStreaming);

// Virtualization — enabled for sessions with many messages
const VIRTUAL_THRESHOLD = 50;
const shouldVirtualize = computed(() => props.messages.length >= VIRTUAL_THRESHOLD);
const { visibleItems, visibleRange, totalHeight, getOffsetTop, onScroll: onVirtualScroll, measureItem } = useVirtualList(props.messages, messagesEl);

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

watch(inputText, (val) => {
  if (val.startsWith('/') && !showCommandPalette.value) {
    showCommandPalette.value = true;
    commandSelectedIndex.value = 0;
  } else if (showCommandPalette.value && !val.startsWith('/')) {
    showCommandPalette.value = false;
  }
});

watch(() => props.messages.length, () => {
  scrollToBottom();
});

// Watch the last streaming message's content for auto-scroll during streaming
watch(() => {
  const last = props.messages[props.messages.length - 1];
  return last?.isStreaming ? last.content : null;
}, () => {
  scrollToBottom();
});

function scrollToBottom() {
  onContentChange();
  nextTick(() => {
    autoScrollToBottom();
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
  inputText.value = '';
  emit('select-command', name);
}

function navigateCommands(direction) {
  if (filteredCommands.value.length === 0) return;
  commandSelectedIndex.value += direction;
  if (commandSelectedIndex.value < 0) commandSelectedIndex.value = filteredCommands.value.length - 1;
  if (commandSelectedIndex.value >= filteredCommands.value.length) commandSelectedIndex.value = 0;
}

onMounted(() => {
  if (messagesEl.value) {
    messagesEl.value.addEventListener('scroll', onUserScroll, { passive: true });
    messagesEl.value.addEventListener('scroll', onVirtualScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (messagesEl.value) {
    messagesEl.value.removeEventListener('scroll', onUserScroll);
    messagesEl.value.removeEventListener('scroll', onVirtualScroll);
  }
});
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
  backdrop-filter: blur(8px);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header h2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.sidebar-toggle {
  display: none;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.chat-header-right {
  display: flex;
  align-items: center;
}

.connection-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--error);
  transition: background var(--transition-fast);
}

.connection-badge.connected .badge-dot {
  background: var(--success);
}

.connection-badge.streaming .badge-dot {
  background: var(--warning);
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Virtual list spacer */
.virtual-spacer {
  width: 100%;
  max-width: 720px;
  flex-shrink: 0;
}

/* Jump to bottom button */
.resume-btn {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  transition: all var(--transition-fast);
  animation: fadeInUp 0.2s ease;
  z-index: 5;
}

.resume-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  transform: translateX(-50%) scale(1.05);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
  max-width: 480px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  background: var(--accent-dim-soft);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: 20px;
  opacity: 0.7;
}

.empty-state h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 360px;
}

.suggestions {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 380px;
}

.suggestion-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 13.5px;
  font-family: inherit;
  transition: all var(--transition-fast);
  text-align: left;
}

.suggestion-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-light);
}

.suggestion-icon {
  font-size: 15px;
  flex-shrink: 0;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
}

.typing-indicator span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing 1.4s ease infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 40;
}

.sidebar-overlay.active {
  display: block;
}

.message {
  width: 100%;
  max-width: 720px;
  margin-bottom: 24px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-left: 0;
}

.message-avatar {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.message-avatar:not([class*="user"]) {
  background: var(--accent-dim);
  color: var(--accent);
}

.message-role {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 400;
}

.message-content {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text-primary);
  padding-left: 0;
}

.streaming-cursor::after {
  content: '▋';
  animation: blink 1s infinite;
  color: var(--accent);
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@media (max-width: 768px) {
  .sidebar-toggle {
    display: flex;
  }

  .messages {
    padding: 16px 12px;
  }

  .chat-header {
    padding: 10px 14px;
  }
}
</style>
