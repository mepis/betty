<template>
  <div class="app">
    <Sidebar
      v-if="activeTab === 'chat'"
      :active-tab="activeTab"
      :is-collapsed="sidebarCollapsed"
      :connected="connected"
      :is-streaming="isStreaming"
      :models="models"
      :current-model="currentModel"
      :selected-model-id="selectedModelId"
      :thinking-level="thinkingLevel"
      :workspace="workspace"
      @switch-tab="activeTab = $event"
      @show-workspace="showWorkspaceModal"
      @new-session="newSession"
      @fork-session="forkSession"
      @compact="compactSession"
      @export="exportHtml"
      @show-clone="showCloneModal = true"
      @model-change="changeModel"
      @thinking-change="changeThinkingLevel"
    />

    <template v-if="activeTab === 'chat'">
      <ChatView
        :messages="messages"
        :is-streaming="isStreaming"
        :connected="connected"
        :streaming-msg="streamingMsg"
        :available-commands="availableCommands"
        @send="sendMessage"
        @abort="abortStream"
        @toggle-sidebar="toggleSidebar"
        @select-command="selectCommand"
      />
    </template>

    <template v-if="activeTab === 'benchmark'">
      <BenchmarkView
        :bench-status="benchStatus"
        :test-run="benchTestRun"
        :live-results="benchLiveResults"
        :configs="benchConfigs"
        :logs="benchLogs"
        @start="startBenchmark"
        @stop="stopBenchmark"
        @save-report="showSaveReportModal"
        @save-configs="saveBenchmarkConfigs"
        @reset-configs="resetBenchmarkConfigs"
        @clear-log="bench.clearLogs()"
        @load-results="loadBenchmarkResults"
      />
    </template>

    <CloneModal :show="showCloneModal" @close="showCloneModal = false" />
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from './composables/useWebSocket.js';
import { useBenchmark } from './composables/useBenchmark.js';
import { toast } from './composables/useToast.js';
import Sidebar from './components/Sidebar.vue';
import ChatView from './components/ChatView.vue';
import BenchmarkView from './components/BenchmarkView.vue';
import CloneModal from './components/CloneModal.vue';
import ToastContainer from './components/ToastContainer.vue';

// ─── State ──────────────────────────────────────────────────────────────
const activeTab = ref('chat');
const sidebarCollapsed = ref(false);
const showCloneModal = ref(false);

const { connected, connect: connectWs, send, on, onAny } = useWebSocket();
const bench = useBenchmark();

const messages = ref([]);
const isStreaming = ref(false);
const streamingMsg = ref(null);
const models = ref([]);
const currentModel = ref(null);
const selectedModelId = ref('');
const thinkingLevel = ref('medium');
const workspace = ref('');
const availableCommands = ref([]);

// Benchmark reactive refs
const benchStatus = ref('idle');
const benchTestRun = ref(0);
const benchLiveResults = ref([]);
const benchConfigs = ref(null);
const benchLogs = ref([]);

// ─── WebSocket Setup ────────────────────────────────────────────────────
function setupWebSocket() {
  on('agent_status', (data) => {
    if (data.status === 'running') {
      // Agent is running
    }
  });

  on('agent_start', () => {
    isStreaming.value = true;
  });

  on('agent_end', (data) => {
    isStreaming.value = false;
    if (data.messages) {
      for (const msg of data.messages) {
        if (msg.role === 'user') continue;
        if (!messages.value.find(m => m.id === msg.id)) {
          messages.value.push(msg);
        }
      }
    }
  });

  on('message_update', (data) => {
    handleStreamingUpdate(data);
  });

  on('message_end', () => {
    if (streamingMsg.value) {
      streamingMsg.value = null;
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

  on('session_new', () => {
    messages.value = [];
    toast('New session started', 'success');
  });

  on('compacted', () => {
    toast('Context compacted', 'success');
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

  // Benchmark events via WebSocket
  on('benchmark_stdout', (data) => {
    benchLogs.value.push({ text: data.message, type: 'stdout' });
  });

  on('benchmark_stderr', (data) => {
    benchLogs.value.push({ text: data.message, type: 'stderr' });
  });

  on('benchmark_status', (data) => {
    benchStatus.value = data.status;
    benchTestRun.value = data.testRun;
    if (data.liveResults) benchLiveResults.value = data.liveResults;
  });

  on('benchmark_exit', () => {
    benchStatus.value = 'idle';
  });

  on('benchmark_error', (data) => {
    benchStatus.value = 'error';
    toast(`Benchmark error: ${data.message}`, 'error');
  });
}

// ─── Streaming ──────────────────────────────────────────────────────────
function handleStreamingUpdate(data) {
  const evt = data.assistantMessageEvent;
  if (!evt) return;

  if (evt.type === 'text_start' && !streamingMsg.value) {
    streamingMsg.value = {
      id: 'streaming-' + Date.now(),
      content: '',
      thinking: '',
      tools: [],
    };
  }

  if (evt.type === 'text_delta' && streamingMsg.value) {
    streamingMsg.value.content += evt.delta;
  }

  if (evt.type === 'thinking_start' && !streamingMsg.value) {
    streamingMsg.value = {
      id: 'streaming-' + Date.now(),
      content: '',
      thinking: '',
      tools: [],
    };
  }

  if (evt.type === 'thinking_delta' && streamingMsg.value) {
    streamingMsg.value.thinking += evt.delta;
  }
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
  toast('Aborted', 'info');
}

function newSession() {
  send({ type: 'new_session' });
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

function showWorkspaceModal() {
  const currentPath = workspace.value || '/';
  const newPath = prompt('Enter workspace path:', currentPath);
  if (newPath !== null && newPath.trim()) {
    fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath.trim() }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.workspace) {
        workspace.value = data.workspace;
        toast(`Workspace set to: ${newPath.trim()}`, 'success');
      }
    })
    .catch(err => toast('Failed to set workspace: ' + err.message, 'error'));
  }
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

// ─── Benchmark ──────────────────────────────────────────────────────────
async function startBenchmark() {
  const result = await bench.startBenchmark();
  if (result.success) {
    toast('Benchmark started', 'success');
  } else {
    toast('Failed to start: ' + result.error, 'error');
  }
}

async function stopBenchmark() {
  const result = await bench.stopBenchmark();
  if (result.success) {
    toast('Benchmark stopping...', 'info');
  } else {
    toast('Failed to stop: ' + result.error, 'error');
  }
}

function showSaveReportModal() {
  const name = prompt('Report name (optional, press Cancel to use default):', '');
  if (name !== null) {
    bench.saveReport(name.trim()).then(data => {
      if (data.success) {
        toast(`Report saved`, 'success');
      } else {
        toast('Failed to save: ' + data.error, 'error');
      }
    });
  }
}

async function saveBenchmarkConfigs() {
  const data = await bench.saveConfigs();
  if (data.success) {
    toast('Configs saved', 'success');
  } else {
    toast('Failed to save: ' + data.error, 'error');
  }
}

function resetBenchmarkConfigs() {
  if (bench.originalConfigs.value) {
    bench.configs.value = JSON.parse(JSON.stringify(bench.originalConfigs.value));
    toast('Configs reset', 'info');
  }
}

async function loadBenchmarkResults() {
  // Triggered from results page
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────
function handleGlobalKeydown(e) {
  if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    // Disconnect
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────
onMounted(() => {
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
  }, 1000);

  // Setup benchmark SSE
  bench.connectSSE(
    (data) => {
      benchStatus.value = data.status;
      benchTestRun.value = data.testRun;
      if (data.liveResults) benchLiveResults.value = data.liveResults;
    },
    (data) => {
      benchLogs.value.push({ text: data.text, type: data.type });
      if (data.status) benchStatus.value = data.status;
      if (data.testRun !== undefined) benchTestRun.value = data.testRun;
      if (data.liveResults) benchLiveResults.value = data.liveResults;
    },
    (data) => {
      if (data.liveResults) benchLiveResults.value = data.liveResults;
    }
  );

  // Load benchmark configs
  bench.loadConfigs().then(() => {
    benchConfigs.value = bench.configs.value;
  });

  // Sync benchmark configs ref
  watch(() => bench.configs.value, (val) => {
    benchConfigs.value = val;
  }, { deep: true });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  bench.disconnectSSE();
});
</script>

<style>
/* Global styles */
@import './styles/variables.css';

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

.app {
  display: flex;
  height: 100vh;
}

/* Shared styles */
.message-content p { margin-bottom: 8px; }
.message-content p:last-child { margin-bottom: 0; }
.message-content strong { font-weight: 600; color: var(--text-primary); }
.message-content em { font-style: italic; color: var(--text-secondary); }
.message-content a { color: var(--accent); text-decoration: none; }
.message-content a:hover { text-decoration: underline; }
.message-content ul, .message-content ol { margin: 8px 0; padding-left: 24px; }
.message-content li { margin-bottom: 4px; }
.message-content h1, .message-content h2, .message-content h3,
.message-content h4, .message-content h5, .message-content h6 { margin: 16px 0 8px; font-weight: 600; }
.message-content h1 { font-size: 1.5em; }
.message-content h2 { font-size: 1.3em; }
.message-content h3 { font-size: 1.15em; }
.message-content blockquote { border-left: 3px solid var(--accent); padding-left: 12px; margin: 8px 0; color: var(--text-secondary); }
.message-content hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }

.code-block { margin: 10px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); background: var(--code-bg); }
.code-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-muted); }
.code-copy { padding: 2px 8px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.15s; }
.code-copy:hover { background: var(--bg-hover); color: var(--text-primary); }
.code-copy.copied { color: var(--green); border-color: var(--green); }
.code-block pre { padding: 12px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
.code-block code { font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace; background: none; padding: 0; font-size: inherit; }

.message-content > code { font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace; background: var(--code-bg); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; border: 1px solid var(--border); }

.thinking-block { margin: 8px 0; border-radius: 8px; border: 1px solid var(--border); background: rgba(210, 153, 34, 0.05); overflow: hidden; }
.thinking-header { padding: 6px 12px; background: rgba(210, 153, 34, 0.08); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--yellow); cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none; }
.thinking-header:hover { background: rgba(210, 153, 34, 0.12); }
.thinking-content { padding: 10px 12px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; max-height: 200px; overflow-y: auto; }
.thinking-content.collapsed { display: none; }

.tool-call { margin: 8px 0; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); overflow: hidden; }
.tool-header { padding: 6px 12px; background: rgba(88, 166, 255, 0.05); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--accent); cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none; }
.tool-content { padding: 8px 12px; font-size: 12px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; white-space: pre-wrap; word-break: break-all; max-height: 150px; overflow-y: auto; }
.tool-content.collapsed { display: none; }

.streaming-cursor::after { content: '▋'; animation: blink 1s infinite; color: var(--accent); }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }

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
