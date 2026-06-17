<template>
  <!-- Auth guard: show login/register when not authenticated -->
  <template v-if="!authStore.isAuthenticated && !authChecking">
    <LoginPage v-if="!authStore.authEnabled || authStore.user" />
    <LoginPage v-else-if="currentPath === '/login'" />
    <RegisterPage v-else-if="currentPath === '/register'" />
    <LoginPage v-else />
  </template>

  <!-- Main app: only when authenticated -->
  <template v-else>
    <div class="app">
      <Sidebar
        :is-collapsed="sidebarCollapsed"
        :connected="connected"
        :is-streaming="isStreaming"
        :models="models"
        :current-model="currentModel"
        :selected-model-id="selectedModelId"
        :thinking-level="thinkingLevel"
        :workspace="workspace"
        :sessions="sessions"
        :active-session-id="activeSessionId"
        :user-name="authStore.user?.name"
        @show-workspace="showFolderPicker = true"
        @show-users="activeTab = 'users'"
        @new-session="boundActions.newSession"
        @fork-session="boundActions.forkSession"
        @compact="boundActions.compactSession"
        @export="boundActions.exportHtml"
        @show-clone="showCloneModal = true"
        @model-change="boundActions.changeModel"
        @thinking-change="boundActions.changeThinkingLevel"
        @switch-session="boundActions.switchSession"
        @delete-session="boundActions.deleteSession"
        @logout="handleLogout"
      />

      <template v-if="activeTab === 'chat'">
        <ChatView
          :messages="messages"
          :is-streaming="isStreaming"
          :connected="connected"
          :available-commands="availableCommands"
          :context-tokens="contextTokens"
          :context-limit="contextLimit"
          @send="(payload) => boundActions.sendMessage(payload)"
          @abort="boundActions.abortStream"
          @toggle-sidebar="toggleSidebar"
          @select-command="(name) => boundActions.selectCommand(name)"
        />
      </template>

      <template v-if="activeTab === 'users'">
        <UsersPage @close="activeTab = 'chat'" />
      </template>

      <CloneModal :show="showCloneModal" @close="showCloneModal = false" />
      <FolderPicker :show="showFolderPicker" @close="showFolderPicker = false" @select="workspace = $event" />
      <ToastContainer />
    </div>
  </template>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useWebSocket } from './composables/useWebSocket.js';
import { chatState } from './composables/useChatState.js';
import { setupChatEventHandlers } from './composables/useChatWebSocket.js';
import { toast } from './composables/useToast.js';
import { authStore } from './stores/auth.js';
import Sidebar from './components/Sidebar.vue';
import ChatView from './components/ChatView.vue';
import CloneModal from './components/CloneModal.vue';
import FolderPicker from './components/FolderPicker.vue';
import ToastContainer from './components/ToastContainer.vue';
import LoginPage from './pages/LoginPage.vue';
import RegisterPage from './pages/RegisterPage.vue';
import UsersPage from './pages/UsersPage.vue';

// ─── UI State (remains in App.vue) ───────────────────────────────────────
const activeTab = ref('chat');
const sidebarCollapsed = ref(false);
const showCloneModal = ref(false);
const showFolderPicker = ref(false);
const authChecking = ref(true);
const currentPath = ref(window.location.pathname);

// ─── WebSocket ───────────────────────────────────────────────────────────
const { connected, connect: connectWs, send, on, onAny, disconnect: disconnectWs } = useWebSocket();

// ─── Chat State (imported from useChatState) ────────────────────────────
const messages = computed(() => chatState.messages.value);
const isStreaming = computed(() => chatState.isStreaming.value);
const sessions = computed(() => chatState.sessions.value);
const activeSessionId = computed({
  get: () => chatState.activeSessionId.value,
  set: (v) => { chatState.activeSessionId.value = v; },
});
const models = computed(() => chatState.models.value);
const currentModel = computed(() => chatState.currentModel.value);
const selectedModelId = computed(() => chatState.selectedModelId.value);
const thinkingLevel = computed(() => chatState.thinkingLevel.value);
const workspace = computed({
  get: () => chatState.workspace.value,
  set: (v) => { chatState.workspace.value = v; },
});
const availableCommands = computed(() => chatState.availableCommands.value);
const contextTokens = computed(() => chatState.contextTokens.value);
const contextLimit = computed(() => chatState.contextLimit.value);

// Bind actions to the WebSocket send function
let boundActions = {};

// ─── Fork selection callback ────────────────────────────────────────────
chatState._onForkSelected = (entryId) => {
  send({ type: 'prompt', message: `/fork ${entryId}` });
};

// ─── Extension UI ───────────────────────────────────────────────────────
// Stored on chatState so WebSocket handlers can access send
chatState._sendFn = send;

// ─── Actions (bound wrappers) ───────────────────────────────────────────
function createBoundActions() {
  return chatState.bindSend(send, connected);
}

// ─── Sidebar toggle ─────────────────────────────────────────────────────
function toggleSidebar() {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────
function handleLogout() {
  authStore.logout();
  window.location.href = '/login';
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────
function handleGlobalKeydown(e) {
  if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    // Disconnect
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────
let statsInterval = null;

onMounted(async () => {
  // Initialize auth first
  await authStore.init();
  authChecking.value = false;

  // Only set up WebSocket and app if authenticated
  if (authStore.isAuthenticated) {
    // Bind dependencies now that `send` is available
    chatState.bindToast(toast);
    boundActions = createBoundActions();
    chatState._boundActions = boundActions;

    // Set up all WebSocket event handlers
    setupChatEventHandlers({ on }, chatState);

    connectWs();
    document.addEventListener('keydown', handleGlobalKeydown);

    // Load workspace
    fetch('/api/workspace')
      .then(r => r.json())
      .then(data => { chatState.workspace.value = data.workspace; })
      .catch(() => {});

    // Initial requests after connection
    setTimeout(() => {
      send({ type: 'get_available_models' });
      send({ type: 'get_state' });
      send({ type: 'get_messages' });
      send({ type: 'get_commands' });
      send({ type: 'list_sessions' });
      send({ type: 'get_session_stats' });
    }, 1000);

    // Refresh session stats periodically
    statsInterval = setInterval(() => {
      send({ type: 'get_session_stats' });
    }, 15000);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  if (statsInterval) clearInterval(statsInterval);
});

// Watch for WebSocket disconnect
watch(connected, (isConnected) => {
  if (!isConnected && chatState.isStreaming.value) {
    chatState.isStreaming.value = false;
    chatState.completeStreaming();
    if (chatState.streamingMsgId.value) {
      chatState.messages.value = chatState.messages.value.filter(m => m.id !== chatState.streamingMsgId.value && !m.id.startsWith('tool-'));
      chatState.streamingMsgId.value = null;
    }
    chatState.pendingToolCalls.value.clear();
  }
});
</script>

<style>
/* Global styles */
@import './styles/variables.css';

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  height: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

.app {
  display: flex;
  height: 100vh;
}

/* Shared content styles */
.message-content {
  font-size: 14.5px;
  line-height: 1.7;
}

.message-content p {
  margin-bottom: 10px;
}
.message-content p:last-child {
  margin-bottom: 0;
}

.message-content strong {
  font-weight: 600;
  color: var(--text-primary);
}

.message-content em {
  font-style: italic;
  color: var(--text-secondary);
}

.message-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition-fast);
}
.message-content a:hover {
  border-bottom-color: var(--accent);
}

.message-content ul, .message-content ol {
  margin: 10px 0;
  padding-left: 22px;
}
.message-content li {
  margin-bottom: 4px;
}

.message-content h1, .message-content h2, .message-content h3,
.message-content h4, .message-content h5, .message-content h6 {
  margin: 20px 0 10px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.message-content h1 { font-size: 1.5em; }
.message-content h2 { font-size: 1.3em; }
.message-content h3 { font-size: 1.15em; }

.message-content blockquote {
  border-left: 2px solid var(--accent);
  padding-left: 14px;
  margin: 12px 0;
  color: var(--text-secondary);
  font-style: italic;
}

.message-content hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 20px 0;
}

.message-content del {
  text-decoration: line-through;
  color: var(--text-muted);
}

.message-content table {
  border-collapse: collapse;
  margin: 12px 0;
  width: 100%;
  font-size: 13.5px;
}
.message-content th,
.message-content td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
.message-content th {
  background: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}
.message-content tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.01);
}

/* Code blocks */
.code-block {
  margin: 12px 0;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--code-border);
  background: var(--code-bg);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--code-border);
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.code-copy {
  padding: 3px 10px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all var(--transition-fast);
}
.code-copy:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-color: var(--border-light);
}
.code-copy.copied {
  color: var(--success);
  border-color: var(--success);
}

.code-block pre {
  padding: 14px 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}

.code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  background: none;
  padding: 0;
  font-size: inherit;
}

/* highlight.js overrides within code blocks */
.code-block pre code.hljs {
  background: transparent !important;
  padding: 0 !important;
  display: block !important;
}

.code-block pre code.hljs .hljs-keyword {
  color: #c678dd;
}
.code-block pre code.hljs .hljs-string {
  color: #98c379;
}
.code-block pre code.hljs .hljs-number {
  color: #d19a66;
}
.code-block pre code.hljs .hljs-comment {
  color: #5c6370;
  font-style: italic;
}
.code-block pre code.hljs .hljs-function {
  color: #61afef;
}
.code-block pre code.hljs .hljs-title {
  color: #e5c07b;
}
.code-block pre code.hljs .hljs-type {
  color: #e5c07b;
}
.code-block pre code.hljs .hljs-attr {
  color: #d19a66;
}
.code-block pre code.hljs .hljs-built_in {
  color: #56b6c2;
}
.code-block pre code.hljs .hljs-variable {
  color: #e06c75;
}
.code-block pre code.hljs .hljs-operator {
  color: #56b6c2;
}
.code-block pre code.hljs .hljs-tag {
  color: #e06c75;
}
.code-block pre code.hljs .hljs-params {
  color: #e06c75;
}
.code-block pre code.hljs .hljs-property {
  color: #e06c75;
}
.code-block pre code.hljs .hljs-literal {
  color: #d19a66;
}
.code-block pre code.hljs .hljs-meta {
  color: #61afef;
}

.message-content > code {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  background: var(--code-bg);
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.88em;
  border: 1px solid var(--code-border);
  color: var(--text-secondary);
}

/* Thinking blocks */
.thinking-block {
  margin: 10px 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--warning-dim);
  overflow: hidden;
}

.thinking-header {
  padding: 8px 14px;
  background: rgba(251, 191, 36, 0.04);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--warning);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  font-weight: 500;
  transition: background var(--transition-fast);
}
.thinking-header:hover {
  background: rgba(251, 191, 36, 0.07);
}

.thinking-content {
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
}
.thinking-content.collapsed { display: none; }

/* Streaming cursor */
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

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

/* Selection */
::selection {
  background: var(--accent-dim);
  color: var(--text-primary);
}

</style>
