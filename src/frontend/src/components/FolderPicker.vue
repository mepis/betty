<template>
  <div class="modal-overlay" v-if="show" @click.self="close">
    <div class="modal-content folder-picker">
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="modal-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>Choose Workspace</h3>
        </div>
        <button class="modal-close" @click="close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <!-- Breadcrumb -->
        <div class="breadcrumb" v-if="currentPath">
          <button class="breadcrumb-item" @click="navigateTo('/')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </button>
          <template v-for="(segment, i) in pathSegments" :key="i">
            <svg class="breadcrumb-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <button
              v-if="i < pathSegments.length - 1"
              class="breadcrumb-item"
              @click="navigateToSegment(i)"
            >
              {{ segment }}
            </button>
            <span v-else class="breadcrumb-item active">{{ segment }}</span>
          </template>
        </div>

        <!-- Loading -->
        <div class="loading-state" v-if="loading">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Loading directory…</span>
        </div>

        <!-- Error -->
        <div class="error-state" v-else-if="error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ error }}</span>
          <button class="retry-btn" @click="loadCurrentPath">Retry</button>
        </div>

        <!-- Directory listing -->
        <div class="directory-list" v-else>
          <div class="list-header">
            <span></span>
            <span class="col-name">Name</span>
            <span class="col-type">Type</span>
            <span class="col-count">Items</span>
          </div>
          <div class="list-items">
            <div
              v-for="item in sortedEntries"
              :key="item.name"
              class="list-item"
              @click="handleClick(item)"
            >
              <div class="item-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-type">Folder</span>
              <span class="item-count">{{ item.itemCount }}</span>
            </div>
            <div class="empty-state" v-if="sortedEntries.length === 0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>This folder is empty</span>
            </div>
          </div>
        </div>

        <!-- Selected path display -->
        <div class="selected-path">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="path-text">{{ currentPath }}</span>
        </div>

        <!-- Actions -->
        <div class="picker-actions">
          <button class="btn btn-primary" :disabled="!currentPath || applying" @click="applyPath">
            {{ applying ? 'Applying…' : 'Set Workspace' }}
          </button>
          <button class="btn btn-ghost" @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['close', 'select']);

const loading = ref(false);
const applying = ref(false);
const error = ref('');
const currentPath = ref('');
const directory = ref({ directories: [], files: [] });

const pathSegments = computed(() => {
  if (!currentPath.value) return [];
  return currentPath.value.split('/').filter(Boolean);
});

const sortedEntries = computed(() => {
  return directory.value.directories.map(item => ({
    name: item.name,
    isDirectory: true,
    itemCount: item.itemCount,
  }));
});

function joinPath(base, name) {
  if (!base || base === '/') return '/' + name;
  return base + '/' + name;
}

async function loadPath(path) {
  loading.value = true;
  error.value = '';
  try {
    const resp = await fetch(`/api/directory?path=${encodeURIComponent(path)}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    directory.value = data;
    currentPath.value = data.path || path;
  } catch (err) {
    error.value = err.message || 'Failed to load directory';
  } finally {
    loading.value = false;
  }
}

function loadCurrentPath() {
  loadPath(currentPath.value || '/');
}

async function navigateTo(path) {
  await loadPath(path);
}

async function navigateToSegment(index) {
  const segments = pathSegments.value.slice(0, index + 1);
  const path = '/' + segments.join('/');
  await loadPath(path);
}

async function handleClick(item) {
  const childPath = joinPath(currentPath.value, item.name);
  await loadPath(childPath);
}

async function applyPath() {
  if (!currentPath.value.trim()) return;
  applying.value = true;
  try {
    const resp = await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath.value.trim() }),
    });
    const data = await resp.json();
    if (data.workspace) {
      emit('select', data.workspace);
      close();
    }
  } catch (err) {
    error.value = err.message || 'Failed to set workspace';
  } finally {
    applying.value = false;
  }
}

function close() {
  directory.value = { directories: [], files: [] };
  emit('close');
}

watch(() => props.show, (val) => {
  if (val) {
    fetch('/api/workspace')
      .then(r => r.json())
      .then(data => loadPath(data.workspace || '/'))
      .catch(() => loadPath('/'));
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 520px;
  max-width: 92vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  width: 30px;
  height: 30px;
  background: var(--accent-dim);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.modal-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.modal-close {
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
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  overflow-x: auto;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.breadcrumb-item:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.breadcrumb-item.active {
  color: var(--text-primary);
  font-weight: 500;
  cursor: default;
}

.breadcrumb-item.active:hover {
  background: transparent;
}

.breadcrumb-sep {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* Loading / Error */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.loading-state svg {
  color: var(--accent);
}

.error-state svg {
  color: var(--error);
}

.retry-btn {
  padding: 5px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Directory listing */
.directory-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: grid;
  grid-template-columns: 28px 1fr 70px 80px;
  gap: 10px;
  padding: 6px 12px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

.list-items {
  flex: 1;
  overflow-y: auto;
}

.list-item {
  display: grid;
  grid-template-columns: 28px 1fr 70px 80px;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--transition-fast);
  align-items: center;
}

.list-item:hover {
  background: var(--accent-dim-soft);
}

.item-icon {
  display: flex;
  align-items: center;
  color: var(--accent);
}

.item-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-type {
  font-size: 11.5px;
  color: var(--text-muted);
}

.item-count {
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 20px;
  color: var(--text-muted);
  font-size: 12.5px;
}

.empty-state svg {
  opacity: 0.4;
}

/* Selected path */
.selected-path {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--accent-dim-soft);
  border: 1px solid var(--accent-dim);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  flex-shrink: 0;
}

.selected-path svg {
  color: var(--accent);
  flex-shrink: 0;
}

.path-text {
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions */
.picker-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: 1px solid var(--btn-primary-bg);
}

.btn-primary:hover:not(:disabled) {
  background: var(--btn-primary-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
