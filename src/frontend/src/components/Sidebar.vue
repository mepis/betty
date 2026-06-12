<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <h1>
        <span class="logo">B</span>
        Betty
      </h1>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Connection</div>
      <div class="status-indicator">
        <span class="status-dot" :class="connectionStatusClass"></span>
        <span>{{ connectionText }}</span>
      </div>
      <div class="model-info">{{ modelLabel }}</div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Model</div>
      <select class="model-select" :value="selectedModelId" @change="onModelChange($event.target.value)">
        <option v-if="!models.length" value="">Loading...</option>
        <option v-for="m in models" :key="m.id" :value="m.id" :data-provider="m.provider">
          {{ m.name || m.id }} ({{ m.provider }})
        </option>
      </select>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Thinking Level</div>
      <select class="thinking-select" :value="thinkingLevel" @change="onThinkingChange($event.target.value)">
        <option value="off">Off</option>
        <option value="minimal">Minimal</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="xhigh">XHigh</option>
      </select>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Workspace</div>
      <button class="sidebar-btn" @click="$emit('show-workspace')">
        <span class="icon">📁</span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ workspaceLabel }}</span>
      </button>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Views</div>
      <button class="sidebar-btn" :class="{ active: activeTab === 'chat' }" @click="$emit('switch-tab', 'chat')">
        <span class="icon">💬</span> Chat
      </button>
      <button class="sidebar-btn" :class="{ active: activeTab === 'benchmark' }" @click="$emit('switch-tab', 'benchmark')">
        <span class="icon">⚡</span> Benchmark
      </button>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Actions</div>
      <button class="sidebar-btn" @click="$emit('new-session')">
        <span class="icon">✦</span> New Session
      </button>
      <button class="sidebar-btn" @click="$emit('fork-session')">
        <span class="icon">↗</span> Fork Session
      </button>
      <button class="sidebar-btn" @click="$emit('compact')">
        <span class="icon">◈</span> Compact Context
      </button>
      <button class="sidebar-btn" @click="$emit('export')">
        <span class="icon">↓</span> Export HTML
      </button>
      <button class="sidebar-btn" @click="$emit('show-clone')">
        <span class="icon">↯</span> Clone Repository
      </button>
    </div>

    <div style="flex:1"></div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Keyboard Shortcuts</div>
      <div style="font-size:12px; color:var(--text-secondary); line-height:1.8;">
        <div><kbd>Enter</kbd> Send message</div>
        <div><kbd>Shift</kbd>+<kbd>Enter</kbd> New line</div>
        <div><kbd>Esc</kbd> Abort / Clear</div>
        <div><kbd>Ctrl</kbd>+<kbd>D</kbd> Disconnect</div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  activeTab: String,
  isCollapsed: Boolean,
  connected: Boolean,
  isStreaming: Boolean,
  models: Array,
  currentModel: Object,
  selectedModelId: String,
  thinkingLevel: String,
  workspace: String,
});

const emit = defineEmits([
  'switch-tab',
  'show-workspace',
  'new-session',
  'fork-session',
  'compact',
  'export',
  'show-clone',
  'model-change',
  'thinking-change',
]);

const connectionStatusClass = computed(() => {
  if (props.isStreaming) return 'stream';
  if (props.connected) return 'connected';
  return '';
});

const connectionText = computed(() => {
  if (props.isStreaming) return 'Streaming...';
  if (props.connected) return 'Connected';
  return 'Disconnected';
});

const modelLabel = computed(() => {
  if (props.currentModel) return `Model: ${props.currentModel.name || props.currentModel.id}`;
  return 'Model: --';
});

const workspaceLabel = computed(() => {
  if (!props.workspace) return 'Loading...';
  const home = window.__ENV?.HOME || '';
  let display = props.workspace;
  if (display.startsWith(home)) {
    display = '~' + display.slice(home.length);
  }
  if (display.length > 30) {
    display = '/' + display.split('/').slice(-3).join('/');
  }
  return display;
});

function onModelChange(modelId) {
  const select = document.querySelector('.model-select');
  const opt = select.options[select.selectedIndex];
  const provider = opt.dataset.provider;
  emit('model-change', { provider, modelId });
}

function onThinkingChange(level) {
  emit('thinking-change', level);
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s ease, min-width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 0;
  min-width: 0;
  border-right: none;
}

.sidebar.collapsed .sidebar-header,
.sidebar.collapsed .sidebar-section {
  display: none;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h1 {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-header h1 .logo {
  width: 24px;
  height: 24px;
  background: var(--accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.sidebar-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.sidebar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar-btn .icon {
  width: 16px;
  text-align: center;
  font-size: 14px;
}

.sidebar-btn.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}

.status-dot.connected { background: var(--green); }
.status-dot.stream { background: var(--yellow); animation: pulse 1s infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.model-info {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 12px 8px;
}

.thinking-select, .model-select {
  width: 100%;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.thinking-select:focus, .model-select:focus {
  outline: none;
  border-color: var(--accent);
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    width: 260px;
    min-width: 260px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar.collapsed {
    width: 260px;
    min-width: 260px;
  }
  .sidebar.collapsed .sidebar-header,
  .sidebar.collapsed .sidebar-section {
    display: flex;
  }
}
</style>
