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
        @new-session="newSession"
        @fork-session="forkSession"
        @compact="compactSession"
        @export="exportHtml"
        @show-clone="showCloneModal = true"
        @model-change="changeModel"
        @thinking-change="changeThinkingLevel"
        @switch-session="switchSession"
        @delete-session="deleteSession"
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
          @send="sendMessage"
          @abort="abortStream"
          @toggle-sidebar="toggleSidebar"
          @select-command="selectCommand"
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from './composables/useWebSocket.js';
import { createMessageStreaming } from './composables/useStreaming.js';
import { hasMessageById } from './composables/useMessageStore.js';
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

// ─── State ──────────────────────────────────────────────────────────────
const activeTab = ref('chat');
const sidebarCollapsed = ref(false);
const showCloneModal = ref(false);
const showFolderPicker = ref(false);
const authChecking = ref(true);
const currentPath = ref(window.location.pathname);

const { connected, connect: connectWs, send, on, onAny } = useWebSocket();

const messages = ref([]);
const isStreaming = ref(false);
const streamingMsgId = ref(null); // ID of the message currently streaming
const { displayText: streamingText, thinkingText: streamingThinking, appendDelta, appendThinkingDelta, complete: completeStreaming, reset: resetStreaming } = createMessageStreaming();
const models = ref([]);
const currentModel = ref(null);
const selectedModelId = ref('');
const thinkingLevel = ref('medium');
const workspace = ref('');
const availableCommands = ref([]);
const sessions = ref([]);
const activeSessionId = ref('');
const contextTokens = ref(null);
const contextLimit = ref(null);
let statsInterval = null;

// Track pending tool calls for real-time display
const pendingToolCalls = ref(new Map()); // toolCallId -> { name, args, status, result }

// Keep the streaming message's content in sync with the paced display text.
// The pacing loop updates streamingText/streamingThinking asynchronously via
// setTimeout, so we need watchers to propagate those changes back into the
// message object that ChatMessage renders.
watch(streamingText, (text) => {
  if (!streamingMsgId.value) return;
  const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
  if (streamMsg) streamMsg.content = text;
});

watch(streamingThinking, (thinking) => {
  if (!streamingMsgId.value) return;
  const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
  if (streamMsg) streamMsg.thinking = thinking;
});

// ─── WebSocket Setup ────────────────────────────────────────────────────
function setupWebSocket() {
  on('agent_status', (data) => {
    if (data.status === 'running') {
      // Agent is running
    }
  });

  on('agent_start', () => {
    isStreaming.value = true;
    resetStreaming();
    // Add streaming message to the main array immediately
    const streamId = 'streaming-' + Date.now();
    streamingMsgId.value = streamId;
    messages.value.push({
      id: streamId,
      role: 'assistant',
      content: '',
      thinking: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    });
  });

  on('agent_end', (data) => {
    isStreaming.value = false;
    completeStreaming();

    // Remove temporary tool execution messages (they'll be replaced by final messages)
    messages.value = messages.value.filter(m => !m.id.startsWith('tool-'));
    pendingToolCalls.value.clear();

    // Finalize the streaming message in the array
    if (streamingMsgId.value) {
      const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
      if (streamMsg) {
        streamMsg.isStreaming = false;
        // If agent_end provided the final message with a real ID, replace the streaming one
        if (data.messages && data.messages.length > 0) {
          const finalMsg = data.messages[data.messages.length - 1];
          if (finalMsg && finalMsg.role === 'assistant' && finalMsg.id !== streamingMsgId.value) {
            // Replace streaming message with the final one
            const idx = messages.value.findIndex(m => m.id === streamingMsgId.value);
            if (idx >= 0) {
              messages.value[idx] = finalMsg;
            }
          }
        }
      }
      streamingMsgId.value = null;
    }

    // Add any additional messages from the agent
    if (data.messages) {
      for (const msg of data.messages) {
        if (msg.role === 'user') continue;
        if (!hasMessageById(messages.value, msg.id)) {
          messages.value.push(msg);
        }
      }
      // Update current session metadata
      if (activeSessionId.value) {
        const session = sessions.value.find(s => s.id === activeSessionId.value);
        if (session) {
          session.messageCount = (session.messageCount || 0) + (data.messages?.length || 0);
          session.updatedAt = Date.now();
        }
      }
    }
    // Refresh context stats after each agent turn
    fetchSessionStats();
  });

  on('message_update', (data) => {
    const evt = data.assistantMessageEvent;
    if (!evt) return;

    // Update the streaming message in the main array
    if (streamingMsgId.value) {
      const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
      if (!streamMsg) return;

      if (evt.type === 'text_delta') {
        appendDelta(evt.delta);
        streamMsg.content = streamingText.value;
      }
      if (evt.type === 'thinking_delta') {
        appendThinkingDelta(evt.delta);
        streamMsg.thinking = streamingThinking.value;
      }
    }
  });

  on('message_end', () => {
    // Streaming content is done being received; finalize pacing
    completeStreaming();
    if (streamingMsgId.value) {
      const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
      if (streamMsg) {
        // Ensure final content is set
        streamMsg.content = streamingText.value;
        streamMsg.thinking = streamingThinking.value;
      }
    }
  });

  // ─── Tool Execution Events (real-time tool call display) ───
  on('tool_execution_start', (data) => {
    const toolMsgId = 'tool-' + data.toolCallId;
    // Check if this tool message already exists
    if (!hasMessageById(messages.value, toolMsgId)) {
      messages.value.push({
        id: toolMsgId,
        role: 'toolResult',
        toolName: data.toolName,
        content: '',
        arguments: data.args || {},
        isError: false,
        status: 'running',
        timestamp: new Date().toISOString(),
      });
    }
    pendingToolCalls.value.set(data.toolCallId, {
      name: data.toolName,
      args: data.args || {},
      status: 'running',
      result: undefined,
    });
  });

  on('tool_execution_update', (data) => {
    const toolMsgId = 'tool-' + data.toolCallId;
    const toolMsg = messages.value.find(m => m.id === toolMsgId);
    if (toolMsg && data.partialResult) {
      toolMsg.content = data.partialResult.content || '';
      toolMsg.status = 'running';
    }
    if (pendingToolCalls.value.has(data.toolCallId)) {
      pendingToolCalls.value.get(data.toolCallId).result = data.partialResult;
    }
  });

  on('tool_execution_end', (data) => {
    const toolMsgId = 'tool-' + data.toolCallId;
    const toolMsg = messages.value.find(m => m.id === toolMsgId);
    if (toolMsg) {
      toolMsg.content = data.result?.content || '';
      toolMsg.isError = data.isError || false;
      toolMsg.status = data.isError ? 'error' : 'completed';
      toolMsg.details = data.result?.details;
    }
    if (pendingToolCalls.value.has(data.toolCallId)) {
      const tc = pendingToolCalls.value.get(data.toolCallId);
      tc.result = data.result;
      tc.status = data.isError ? 'error' : 'completed';
    }
  });

  on('messages', (data) => {
    messages.value = data.messages || [];
  });

  on('state', (data) => {
    if (data.state) {
      const model = data.state.model;
      if (model) {
        currentModel.value = model;
        selectedModelId.value = model.id;
      }
      if (data.state.thinkingLevel) {
        thinkingLevel.value = data.state.thinkingLevel;
      }
    }
  });

  on('models', (data) => {
    models.value = data.models || [];
  });

  on('model_set', (data) => {
    if (data.data) {
      currentModel.value = data.data;
      selectedModelId.value = data.data.id;
    }
  });

  on('thinking_level_set', () => {});

  on('commands', (data) => {
    availableCommands.value = (data.commands || []).map(cmd => ({
      name: cmd.name || cmd,
      description: cmd.description || '',
      icon: cmd.icon || '⚡',
    }));
  });

  on('fork_messages', (data) => {
    showForkList(data.messages);
  });

  on('session_new', (data) => {
    messages.value = [];
    resetStreaming();
    streamingMsgId.value = null;
    pendingToolCalls.value.clear();
    if (data.sessionId) {
      activeSessionId.value = data.sessionId;
      // Add new session to the list
      const newSession = {
        id: data.sessionId,
        name: data.sessionName || `Session ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
      };
      sessions.value = [newSession, ...sessions.value];
    }
    toast('New session started', 'success');
  });

  on('sessions_list', (data) => {
    sessions.value = data.sessions || [];
  });

  on('session_switched', (data) => {
    activeSessionId.value = data.sessionId;
    messages.value = data.messages || [];
    resetStreaming();
    streamingMsgId.value = null;
    toast('Session switched', 'info');
  });

  on('session_deleted', (data) => {
    sessions.value = sessions.value.filter(s => s.id !== data.sessionId);
    toast('Session deleted', 'info');
  });

  on('session_renamed', (data) => {
    const idx = sessions.value.findIndex(s => s.id === data.session.id);
    if (idx >= 0) {
      sessions.value[idx] = data.session;
    }
  });

  on('compacted', () => {
    toast('Context compacted', 'success');
    fetchSessionStats();
  });

  on('session_stats', (data) => {
    if (data.data && data.data.contextUsage) {
      contextTokens.value = data.data.contextUsage.tokens;
      contextLimit.value = data.data.contextUsage.contextWindow;
    }
  });

  on('html_exported', (data) => {
    if (data.data && data.data.path) {
      toast(`Exported to: ${data.data.path}`, 'success');
    }
  });

  on('agent_exit', (data) => {
    toast(`Agent exited (code: ${data.code})`, 'error');
  });

  on('agent_error', (data) => {
    toast(`Agent error: ${data.message}`, 'error');
  });

  on('extension_ui_request', (data) => {
    handleExtensionUI(data);
  });

  on('error', (data) => {
    toast(data.message, 'error');
  });

}

// ─── Session Stats ──────────────────────────────────────────────────────
function fetchSessionStats() {
  send({ type: 'get_session_stats' });
}

// ─── Actions ────────────────────────────────────────────────────────────
function sendMessage({ text, images }) {
  if ((!text && !images.length) || !connected.value) return;

  // Show user message immediately
  const msgId = 'msg-' + Date.now();
  const trackingContent = [];
  if (images.length > 0) {
    trackingContent.push({ type: 'image', imageUrl: images.map(img => img.name).join(', ') });
  }
  if (text) {
    trackingContent.push({ type: 'text', text });
  }
  messages.value.push({ id: msgId, role: 'user', content: trackingContent, timestamp: new Date().toISOString() });

  const imagesData = images.map(img => {
    const commaIdx = img.dataUrl.indexOf(',');
    const prefix = img.dataUrl.slice(0, commaIdx);
    const base64Data = img.dataUrl.slice(commaIdx + 1);
    const mimeMatch = prefix.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    return { type: 'image', mimeType, data: base64Data };
  });

  const sendMsg = { type: 'prompt', message: text };
  if (imagesData.length > 0) {
    sendMsg.images = imagesData;
  }
  send(sendMsg);
}

function abortStream() {
  send({ type: 'abort' });
  isStreaming.value = false;
  resetStreaming();
  // Remove the streaming message and temporary tool messages from the array
  if (streamingMsgId.value) {
    messages.value = messages.value.filter(m => m.id !== streamingMsgId.value && !m.id.startsWith('tool-'));
    streamingMsgId.value = null;
  }
  pendingToolCalls.value.clear();
  toast('Aborted', 'info');
}

function newSession() {
  send({ type: 'new_session' });
}

function switchSession(sessionId) {
  if (!connected.value) {
    toast('Not connected', 'error');
    return;
  }
  send({ type: 'switch_session', sessionId });
}

function deleteSession(sessionId) {
  const session = sessions.value.find(s => s.id === sessionId);
  if (!session) return;
  if (!confirm(`Delete "${session.name}"?`)) return;
  send({ type: 'delete_session', sessionId });
}

function loadSessions() {
  send({ type: 'list_sessions' });
}

function forkSession() {
  send({ type: 'get_fork_messages' });
}

function showForkList(messages) {
  if (!messages || messages.length === 0) {
    toast('No fork points available', 'info');
    return;
  }
  const entryIds = messages.map(m => `${m.entryId} - ${(m.text || '').slice(0, 40)}`).join('\n');
  const entryId = prompt(`Available fork points:\n${entryIds}\n\nEnter an entry ID to fork from:`, messages[0].entryId);
  if (entryId) {
    send({ type: 'prompt', message: `/fork ${entryId.trim()}` });
  }
}

function compactSession() {
  const instructions = prompt('Custom compaction instructions (optional, press Cancel to skip):');
  if (instructions !== null) {
    send({ type: 'compact', customInstructions: instructions || undefined });
  }
}

function exportHtml() {
  send({ type: 'export_html' });
}

function changeModel({ provider, modelId }) {
  send({ type: 'set_model', provider, modelId });
}

function changeThinkingLevel(level) {
  thinkingLevel.value = level;
  send({ type: 'set_thinking_level', level });
}

function selectCommand(name) {
  switch (name) {
    case 'help':
      toast('Type / to open the command palette. Enter=Send, Shift+Enter=New line, Esc=Abort, Ctrl+D=Disconnect', 'info');
      break;
    case 'shortcuts':
      toast('Enter=Send, Shift+Enter=New line, Esc=Abort, Ctrl+D=Disconnect, /=Command palette', 'info');
      break;
    case 'clear':
      messages.value = [];
      toast('Session cleared', 'success');
      break;
    case 'compact':
      compactSession();
      break;
    case 'export':
      exportHtml();
      break;
    case 'new':
      newSession();
      break;
    default:
      send({ type: 'prompt', message: `/${name}` });
  }
}

function toggleSidebar() {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
}

function handleLogout() {
  authStore.logout();
  window.location.href = '/login';
}

// ─── Extension UI ───────────────────────────────────────────────────────
function handleExtensionUI(req) {
  switch (req.method) {
    case 'select': {
      const optionsStr = req.options.join('\n');
      const selected = prompt(`${req.title || 'Select'}\n\nOptions:\n${optionsStr}\n\nEnter your choice:`, req.options[0]);
      send({ type: 'extension_ui_response', id: req.id, value: selected || req.options[0] });
      break;
    }
    case 'confirm': {
      const confirmed = confirm(`${req.title || 'Confirm'}\n\n${req.message || ''}`);
      send({ type: 'extension_ui_response', id: req.id, confirmed });
      break;
    }
    case 'input': {
      const inputValue = prompt(req.title || 'Input', req.placeholder || '');
      if (inputValue !== null) {
        send({ type: 'extension_ui_response', id: req.id, value: inputValue });
      } else {
        send({ type: 'extension_ui_response', id: req.id, cancelled: true });
      }
      break;
    }
    case 'editor': {
      const editorValue = prompt(`${req.title || 'Editor'}\n\n(Paste your text below. Press Cancel to abort.):`, req.prefill || '');
      if (editorValue !== null) {
        send({ type: 'extension_ui_response', id: req.id, value: editorValue });
      } else {
        send({ type: 'extension_ui_response', id: req.id, cancelled: true });
      }
      break;
    }
    case 'notify':
      toast(req.message || '', req.notifyType || 'info');
      break;
    case 'setStatus':
      if (req.statusText) toast(`[${req.statusKey}] ${req.statusText}`, 'info');
      break;
    case 'setWidget':
      if (req.widgetLines) toast(`[${req.widgetKey}] ${req.widgetLines.join(', ')}`, 'info');
      break;
    case 'set_editor_text':
      // Would need ref to input
      break;
  }
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────
function handleGlobalKeydown(e) {
  if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    // Disconnect
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  // Initialize auth first
  await authStore.init();
  authChecking.value = false;

  // Only set up WebSocket and app if authenticated
  if (authStore.isAuthenticated) {
    setupWebSocket();
    connectWs();
    document.addEventListener('keydown', handleGlobalKeydown);

    // Load workspace
    fetch('/api/workspace')
      .then(r => r.json())
      .then(data => { workspace.value = data.workspace; })
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

/* Global functions for inline handlers */
</style>

<script>
// Global functions for inline event handlers in v-html rendered content
window.toggleThinking = function(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector('span:last-child');
  content.classList.toggle('collapsed');
  arrow.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
};

window.toggleTool = function(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector('span:last-child');
  content.classList.toggle('collapsed');
  arrow.textContent = content.classList.contains('collapsed') ? '▼' : '▲';
};

window.copyCode = function(id, btn) {
  const code = document.getElementById(id);
  if (code) {
    navigator.clipboard.writeText(code.textContent).then(() => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  }
};
</script>
