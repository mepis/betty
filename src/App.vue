<template>
  <!-- Login Page -->
  <LoginPage v-if="!authStore.isAuthenticated" />

  <!-- Main App (authenticated) -->
  <div v-else class="app" :class="{ 'show-sidebar': showSidebar }">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: showSidebar }">
      <div class="sidebar-header">
        <h2>Sessions</h2>
        <button class="btn btn-icon" @click="showSidebar = false" title="Close sidebar">✕</button>
      </div>
      <div class="sidebar-actions">
        <button class="btn btn-primary" @click="handleNewSession">
          <span class="icon">+</span> New Session
        </button>
      </div>
      <div class="sidebar-list">
        <div class="session-item current">
          <span class="session-name">{{ sessionName || 'Untitled' }}</span>
          <span class="session-meta">{{ messageCount }} msgs</span>
        </div>
      </div>
      <div class="sidebar-footer">
        <button class="btn btn-text" @click="showSettings = true">⚙ Settings</button>
        <button class="btn btn-text" @click="getAvailableModels">🔄 Refresh Models</button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main">
      <!-- Header -->
      <header class="header">
        <button class="btn btn-icon" @click="showSidebar = !showSidebar" title="Toggle sidebar">☰</button>
        <div class="header-center">
          <h1 class="logo">🤖 Betty</h1>
        </div>
        <div class="header-right">
          <div class="user-info" :title="authStore.user?.username">
            <span class="user-avatar">👤</span>
            <span class="user-name">{{ authStore.user?.username }}</span>
            <span class="user-role-badge" :class="authStore.user?.role">{{ authStore.user?.role }}</span>
          </div>
          <div class="model-badge" @click="showModelSelector = true" :title="currentModel?.name || 'Select model'">
            <span class="model-name">{{ currentModel?.name || 'Select Model' }}</span>
            <span class="model-provider">{{ currentModel?.provider }}</span>
          </div>
          <div class="thinking-badge" @click="cycleThinkingLevel" :title="`Thinking: ${thinkingLevel}`">
            💭 {{ thinkingLevel }}
          </div>
          <div class="connection-status" :class="{ connected: wsConnected, error: !!wsError }">
            <span class="status-dot"></span>
            {{ wsConnected ? 'Connected' : wsError || 'Connecting...' }}
          </div>
          <button class="btn btn-icon" @click="handleLogout" title="Logout">🚪</button>
        </div>
      </header>

      <!-- Messages -->
      <div class="messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">🤖</div>
          <h2>Welcome to Betty</h2>
          <p>Your AI coding assistant</p>
          <div class="suggestions">
            <button class="suggestion" @click="useSuggestion('List all TypeScript files in the current directory')">
              List all TypeScript files
            </button>
            <button class="suggestion" @click="useSuggestion('Explain how this project is structured')">
              Explain the project structure
            </button>
            <button class="suggestion" @click="useSuggestion('Help me write a Vue 3 component')">
              Help me write a Vue component
            </button>
          </div>
        </div>

        <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-role">
              {{ msg.role === 'user' ? 'You' : 'Betty' }}
              <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="message-body" v-html="formatContent(msg.content)"></div>

            <!-- Tool calls -->
            <div v-if="msg.toolCalls?.length" class="tool-calls">
              <div v-for="tc in msg.toolCalls" :key="tc.id" class="tool-call" :class="{ complete: tc.isComplete, error: tc.isError }">
                <div class="tool-call-header">
                  <span class="tool-icon">{{ tc.isComplete ? (tc.isError ? '❌' : '✅') : '⏳' }}</span>
                  <span class="tool-name">{{ tc.name }}</span>
                </div>
                <pre v-if="tc.args" class="tool-args">{{ JSON.stringify(tc.args, null, 2) }}</pre>
                <pre v-if="tc.result" class="tool-result">{{ truncate(tc.result, 200) }}</pre>
              </div>
            </div>

            <!-- Streaming indicator -->
            <div v-if="msg.isStreaming" class="streaming-indicator">
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
              <span>Thinking...</span>
            </div>
          </div>
        </div>

        <!-- Scroll anchor -->
        <div ref="scrollAnchor"></div>
      </div>

      <!-- Input bar -->
      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputEl"
            v-model="inputText"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.shift.enter.prevent="inputText += '\n'"
            placeholder="Ask Betty anything... (Enter to send, Shift+Enter for new line)"
            :disabled="isStreaming"
            rows="1"
          ></textarea>
          <button
            class="btn btn-send"
            @click="isStreaming ? abort() : sendMessage()"
            :disabled="!inputText.trim() && !isStreaming"
            :title="isStreaming ? 'Abort' : 'Send'"
          >
            <span v-if="isStreaming" class="abort-icon">■</span>
            <span v-else class="send-icon">↑</span>
          </button>
        </div>
        <div class="input-footer">
          <span class="hint">Press Enter to send · Shift+Enter for new line</span>
          <span v-if="isStreaming" class="hint warning">Agent is working...</span>
        </div>
      </div>
    </main>

    <!-- Model selector modal -->
    <Teleport to="body">
      <div v-if="showModelSelector" class="modal-overlay" @click.self="showModelSelector = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Select Model</h3>
            <button class="btn btn-icon" @click="showModelSelector = false">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="availableModels.length === 0" class="empty-state">
              <p>Loading models...</p>
              <button class="btn btn-primary" @click="getAvailableModels">Refresh</button>
            </div>
            <div v-else class="model-list">
              <div
                v-for="model in availableModels"
                :key="model.id"
                class="model-option"
                :class="{ active: currentModel?.id === model.id }"
                @click="selectModel(model)"
              >
                <div class="model-info">
                  <span class="model-label">{{ model.name }}</span>
                  <span class="model-provider-badge">{{ model.provider }}</span>
                </div>
                <span v-if="currentModel?.id === model.id" class="check-icon">✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Settings modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
        <div class="modal modal-large">
          <div class="modal-header">
            <h3>Settings</h3>
            <button class="btn btn-icon" @click="showSettings = false">✕</button>
          </div>
          <!-- Settings tabs -->
          <div class="settings-tabs">
            <button
              class="btn btn-text"
              :class="{ active: activeSettingsTab === 'general' }"
              @click="activeSettingsTab = 'general'"
            >General</button>
            <button
              v-if="authStore.isAdmin"
              class="btn btn-text"
              :class="{ active: activeSettingsTab === 'users' }"
              @click="activeSettingsTab = 'users'"
            >Users</button>
          </div>
          <div class="modal-body">
            <!-- General Settings -->
            <div v-if="activeSettingsTab === 'general'">
            <div class="settings-section">
              <h4>Thinking Level</h4>
              <div class="setting-options">
                <button
                  v-for="level in ['off', 'minimal', 'low', 'medium', 'high', 'xhigh']"
                  :key="level"
                  class="btn"
                  :class="{ active: thinkingLevel === level }"
                  @click="setThinkingLevel(level)"
                >
                  {{ level }}
                </button>
              </div>
            </div>

            <div class="settings-section">
              <h4>Session</h4>
              <div class="setting-actions">
                <button class="btn btn-primary" @click="handleNewSession">New Session</button>
                <button class="btn btn-warning" @click="showNewSessionConfirm = true">Clear Messages</button>
                <button class="btn" @click="compact(compactInstructions)">Compact Context</button>
              </div>
              <div class="setting-input">
                <input
                  v-model="compactInstructions"
                  placeholder="Custom compaction instructions (optional)"
                />
              </div>
            </div>

            <div class="settings-section">
              <h4>Session Info</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Session ID</span>
                  <span class="info-value">{{ sessionId || 'N/A' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Messages</span>
                  <span class="info-value">{{ messageCount }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Pending</span>
                  <span class="info-value">{{ pendingMessageCount }}</span>
                </div>
              </div>
            </div>
            </div>

            <!-- User Management (admin only) -->
            <div v-if="activeSettingsTab === 'users' && authStore.isAdmin">
              <UserManagement v-if="authStore.token" :token="authStore.token" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm clear -->
    <Teleport to="body">
      <div v-if="showNewSessionConfirm" class="modal-overlay" @click.self="showNewSessionConfirm = false">
        <div class="modal modal-small">
          <div class="modal-header">
            <h3>Clear Messages</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to clear all messages? This cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="showNewSessionConfirm = false">Cancel</button>
            <button class="btn btn-warning" @click="clearMessages; showNewSessionConfirm = false">Clear</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from "vue";
import { useChatStore } from "./stores/chat";
import { useAuthStore } from "./stores/auth";
import LoginPage from "./components/LoginPage.vue";
import UserManagement from "./components/UserManagement.vue";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
  async: false,
});

const store = useChatStore();
const authStore = useAuthStore();

const messagesContainer = ref<HTMLElement | null>(null);
const scrollAnchor = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLTextAreaElement | null>(null);
const inputText = ref("");

// ─── Computed from store ───────────────────────────────────────────────────
const {
  messages,
  isStreaming,
  wsConnected,
  wsError,
  currentModel,
  availableModels,
  thinkingLevel,
  sessionId,
  sessionName,
  messageCount,
  pendingMessageCount,
  showSidebar,
  showModelSelector,
  showSettings,
  showCompactDialog,
  compactInstructions,
  showNewSessionConfirm,
} = store;

const activeSettingsTab = ref("general");

// ─── Auto-scroll ───────────────────────────────────────────────────────────
function scrollToBottom(): void {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(messages, scrollToBottom, { flush: "post", deep: true });
watch(isStreaming, scrollToBottom, { flush: "post" });

// ─── Actions ───────────────────────────────────────────────────────────────
function sendMessage(): void {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = "";
  store.sendMessage(text);
  nextTick(() => inputEl.value?.focus());
}

function useSuggestion(text: string): void {
  inputText.value = text;
  inputEl.value?.focus();
}

function abort(): void {
  store.abort();
}

function selectModel(model: (typeof availableModels.value)[0]): void {
  store.setModel(model.provider, model.id);
}

function handleNewSession(): void {
  store.newSession();
  showSidebar.value = false;
}

function clearMessages(): void {
  store.clearMessages();
}

function handleLogout(): void {
  store.disconnect();
  authStore.logout();
}

// ─── Formatting ────────────────────────────────────────────────────────────
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}

function formatContent(content: string | undefined): string {
  if (!content) return "";
  return marked.parse(content);
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  store.connect();
  store.getAvailableModels();
  store.getState();
});
</script>

<style>
/* ─── CSS Variables ─────────────────────────────────────────────────────── */
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --bg-hover: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #484f58;
  --accent: #58a6ff;
  --accent-hover: #79b8ff;
  --green: #3fb950;
  --red: #f85149;
  --orange: #d29922;
  --border: #30363d;
  --shadow: rgba(0, 0, 0, 0.3);
  --radius: 8px;
  --radius-lg: 12px;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Consolas, monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  --transition: 150ms ease;
}

/* ─── Reset ─────────────────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

/* ─── App Layout ────────────────────────────────────────────────────────── */
.app {
  display: flex;
  height: 100vh;
  width: 100vw;
  position: relative;
}

/* ─── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width: 280px;
  min-width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: transform var(--transition), opacity var(--transition);
  z-index: 100;
}

.sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-actions {
  padding: 12px 16px;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--transition);
}

.session-item:hover {
  background: var(--bg-hover);
}

.session-item.current {
  background: var(--bg-tertiary);
  border-left: 3px solid var(--accent);
}

.session-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ─── Main ─────────────────────────────────────────────────────────────── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

/* ─── Header ───────────────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  gap: 12px;
  min-height: 48px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), #a371f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 4px 12px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background var(--transition);
  border: 1px solid transparent;
}

.model-badge:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.model-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.model-provider {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ─── User Info ─────────────────────────────────────────────────────────── */
.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  transition: background var(--transition);
  cursor: default;
}

.user-info:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.user-avatar {
  font-size: 14px;
}

.user-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 10px;
}

.user-role-badge.admin {
  background: rgba(248, 81, 73, 0.15);
  color: var(--red);
}

.user-role-badge.user {
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent);
}

.user-role-badge.viewer {
  background: rgba(139, 148, 158, 0.15);
  color: var(--text-secondary);
}

/* ─── Settings Tabs ─────────────────────────────────────────────────────── */
.settings-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.settings-tabs .btn-text {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: var(--radius) var(--radius) 0 0;
}

.settings-tabs .btn-text.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-bottom: 2px solid var(--accent);
}

.thinking-badge {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background var(--transition);
  border: 1px solid transparent;
}

.thinking-badge:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.connection-status.connected {
  color: var(--green);
}

.connection-status.error {
  color: var(--red);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.connection-status.connected .status-dot {
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
}

.connection-status.error .status-dot {
  background: var(--red);
  box-shadow: 0 0 6px var(--red);
}

/* ─── Messages ─────────────────────────────────────────────────────────── */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: var(--bg-hover);
  border-radius: 3px;
}

/* ─── Empty State ──────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 600px;
}

.suggestion {
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}

.suggestion:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--accent);
}

/* ─── Message ──────────────────────────────────────────────────────────── */
.message {
  display: flex;
  gap: 12px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: var(--bg-tertiary);
}

.message.user .message-avatar {
  background: var(--accent);
}

.message.assistant .message-avatar {
  background: linear-gradient(135deg, #a371f7, #58a6ff);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-role {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-role .message-time {
  font-size: 11px;
  color: var(--text-muted);
}

.message-body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  word-wrap: break-word;
}

.message-body code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent);
}

.message-body .inline-code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent);
}

.message-body .code-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}

.message-body pre code {
  background: none;
  padding: 0;
  color: var(--text-primary);
}

.message-body h2, .message-body h3, .message-body h4 {
  margin: 16px 0 8px;
  font-weight: 600;
}

.message-body h2 { font-size: 1.3em; }
.message-body h3 { font-size: 1.15em; }
.message-body h4 { font-size: 1.05em; }

.message-body ul {
  margin: 8px 0;
  padding-left: 20px;
}

.message-body li {
  margin: 4px 0;
}

/* ─── Tool Calls ───────────────────────────────────────────────────────── */
.tool-calls {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-call {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.tool-call.complete {
  border-color: var(--green);
}

.tool-call.error {
  border-color: var(--red);
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  font-size: 12px;
  font-weight: 500;
}

.tool-icon {
  font-size: 12px;
}

.tool-name {
  font-family: var(--font-mono);
  color: var(--accent);
}

.tool-args, .tool-result {
  margin: 0;
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  overflow-x: auto;
  border-top: 1px solid var(--border);
}

.tool-result {
  color: var(--green);
}

.tool-call.error .tool-result {
  color: var(--red);
}

/* ─── Streaming Indicator ──────────────────────────────────────────────── */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* ─── Input Area ───────────────────────────────────────────────────────── */
.input-area {
  padding: 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 900px;
  margin: 0 auto;
}

.input-wrapper textarea {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  resize: none;
  outline: none;
  transition: border-color var(--transition);
  max-height: 200px;
  min-height: 44px;
  line-height: 1.5;
}

.input-wrapper textarea:focus {
  border-color: var(--accent);
}

.input-wrapper textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-wrapper textarea::placeholder {
  color: var(--text-muted);
}

.btn-send {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--accent);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-send .abort-icon {
  font-size: 14px;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  max-width: 900px;
  margin: 8px auto 0;
  font-size: 11px;
  color: var(--text-muted);
}

.input-footer .hint.warning {
  color: var(--orange);
}

/* ─── Buttons ──────────────────────────────────────────────────────────── */
.btn {
  padding: 8px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.btn:hover {
  background: var(--bg-hover);
  border-color: var(--text-muted);
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
  font-weight: 500;
}

.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.btn-warning {
  background: var(--red);
  border-color: var(--red);
  color: white;
}

.btn-warning:hover {
  opacity: 0.9;
}

.btn-text {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 6px 12px;
  text-align: left;
}

.btn-text:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  padding: 4px 8px;
  cursor: pointer;
  transition: color var(--transition);
}

.btn-icon:hover {
  color: var(--text-primary);
}

/* ─── Modals ───────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px var(--shadow);
}

.modal-large {
  min-width: 500px;
  max-width: 700px;
}

.modal-small {
  min-width: 320px;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

/* ─── Model List ───────────────────────────────────────────────────────── */
.model-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--transition);
}

.model-option:hover {
  background: var(--bg-hover);
}

.model-option.active {
  background: var(--bg-tertiary);
  border: 1px solid var(--accent);
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-label {
  font-size: 14px;
  font-weight: 500;
}

.model-provider-badge {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.check-icon {
  color: var(--accent);
  font-weight: bold;
}

/* ─── Settings ─────────────────────────────────────────────────────────── */
.settings-section {
  margin-bottom: 24px;
}

.settings-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.setting-options .btn {
  font-size: 12px;
  padding: 6px 12px;
}

.setting-options .btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.setting-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.setting-input {
  margin-top: 12px;
}

.setting-input input {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition);
}

.setting-input input:focus {
  border-color: var(--accent);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.info-item {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: var(--radius);
}

.info-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.info-value {
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

/* ─── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    z-index: 200;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .modal {
    min-width: auto;
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
  }

  .header-right {
    gap: 6px;
  }

  .model-badge {
    padding: 4px 8px;
  }

  .model-name {
    font-size: 11px;
  }
}
</style>
