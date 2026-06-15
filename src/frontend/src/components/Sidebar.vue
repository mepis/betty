<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div class="logo-group">
        <div class="logo-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="logo-text">betty</span>
      </div>
    </div>

    <div class="sidebar-section">
      <button class="new-session-btn" @click="$emit('new-session')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>New chat</span>
      </button>
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-section">
      <div class="section-label">Settings</div>

      <div class="setting-group">
        <label class="setting-label">Model</label>
        <select class="setting-select" :value="selectedModelId" @change="onModelChange($event.target.value)">
          <option v-if="!models.length" value="">Loading...</option>
          <option v-for="m in models" :key="m.id" :value="m.id" :data-provider="m.provider">
            {{ m.name || m.id }}
          </option>
        </select>
      </div>

      <div class="setting-group">
        <label class="setting-label">Thinking</label>
        <select class="setting-select" :value="thinkingLevel" @change="onThinkingChange($event.target.value)">
          <option value="off">Off</option>
          <option value="minimal">Minimal</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="xhigh">XHigh</option>
        </select>
      </div>

      <div class="setting-group">
        <label class="setting-label">Workspace</label>
        <button class="workspace-btn" @click="$emit('show-workspace')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="workspace-path">{{ workspaceLabel }}</span>
        </button>
      </div>

      <div class="setting-group">
        <button class="nav-btn" @click="$emit('show-users')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Users</span>
        </button>
      </div>

      <div class="setting-group">
        <button class="nav-btn" @click="$emit('switch-tab', 'terminal')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          <span>Terminal</span>
        </button>
      </div>
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-section">
      <div class="section-label">Actions</div>
      <div class="action-grid">
        <Tooltip text="Fork session">
          <button class="action-btn" @click="$emit('fork-session')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v3a3 3 0 0 0 3 3h9"/>
            </svg>
          </button>
        </Tooltip>
        <Tooltip text="Compact context">
          <button class="action-btn" @click="$emit('compact')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        </Tooltip>

        <Tooltip text="Clone repository">
          <button class="action-btn" @click="$emit('show-clone')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M16 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/><polyline points="8 8 12 4 16 8"/><line x1="12" y1="4" x2="12" y2="16"/>
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>

    <div style="flex:1"></div>

    <div class="sidebar-footer">
      <div class="connection-status" :class="{ streaming: isStreaming, connected: connected }">
        <span class="status-dot"></span>
        <span class="status-text">{{ connectionText }}</span>
      </div>
      <div class="current-model" v-if="currentModel">
        <span class="model-name">{{ currentModel.name || currentModel.id }}</span>
      </div>
      <div v-if="userName" class="user-footer">
        <div class="user-info">
          <div class="user-avatar">{{ userName.charAt(0).toUpperCase() }}</div>
          <span class="user-name">{{ userName }}</span>
        </div>
        <button class="logout-btn" @click="$emit('logout')" title="Logout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import Tooltip from './Tooltip.vue';

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
  userName: String,
});

const emit = defineEmits([
  'switch-tab',
  'show-workspace',
  'show-users',
  'new-session',
  'fork-session',
  'compact',

  'show-clone',
  'model-change',
  'thinking-change',
  'logout',
]);

const connectionText = computed(() => {
  if (props.isStreaming) return 'Streaming';
  if (props.connected) return 'Connected';
  return 'Disconnected';
});

const workspaceLabel = computed(() => {
  if (!props.workspace) return '—';
  const home = window.__ENV?.HOME || '';
  let display = props.workspace;
  if (display.startsWith(home)) {
    display = '~' + display.slice(home.length);
  }
  if (display.length > 28) {
    display = '/' + display.split('/').slice(-2).join('/');
  }
  return display;
});

function onModelChange(modelId) {
  const select = document.querySelector('.setting-select');
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
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-slow), min-width var(--transition-slow), opacity var(--transition-slow);
  overflow: hidden;
}

.sidebar.collapsed {
  width: 0;
  min-width: 0;
  border-right: none;
  opacity: 0;
  pointer-events: none;
}

/* Header */
.sidebar-header {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--border);
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-mark {
  width: 28px;
  height: 28px;
  background: var(--accent-dim);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.logo-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

/* New session button */
.sidebar-section {
  padding: 12px;
}

.new-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  background: var(--accent-dim);
  border: 1px solid transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.new-session-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
  opacity: 0.9;
}

/* Section label */
.section-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-muted);
  margin-bottom: 6px;
  margin-left: 6px;
  font-weight: 600;
}

/* Divider */
.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 12px;
}

/* Settings */
.setting-group {
  margin-bottom: 10px;
}

.setting-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 5px;
  margin-left: 6px;
  font-weight: 500;
}

.setting-select {
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color var(--transition-fast);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2352525a' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.setting-select:hover {
  border-color: var(--border-light);
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent);
}

.workspace-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
  text-align: left;
}

.workspace-btn:hover {
  border-color: var(--border-light);
  color: var(--text-primary);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
  text-align: left;
}

.nav-btn:hover {
  border-color: var(--border-light);
  color: var(--text-primary);
}

.workspace-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Action grid */
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-color: var(--border);
}

.action-btn svg {
  width: 15px;
  height: 15px;
}

/* Footer */
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--error);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.connection-status.connected .status-dot {
  background: var(--success);
}

.connection-status.streaming .status-dot {
  background: var(--warning);
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-weight: 500;
}

.current-model {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 13px;
}

.model-name {
  color: var(--text-secondary);
}

.user-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 0;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-dim);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.logout-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.logout-btn:hover {
  background: var(--error-dim);
  color: var(--error);
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
}
</style>
