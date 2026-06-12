<template>
  <div class="modal-overlay" v-if="show" @click.self="close">
    <div class="modal-content clone-modal">
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="modal-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M16 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/>
              <polyline points="8 8 12 4 16 8"/>
              <line x1="12" y1="4" x2="12" y2="16"/>
            </svg>
          </div>
          <h3>Clone Repository</h3>
        </div>
        <button class="modal-close" @click="close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="clone-field">
          <label for="cloneUrl">Repository URL</label>
          <input type="text" id="cloneUrl" v-model="url" placeholder="https://github.com/user/repo.git" value="https://github.com/ggml-org/llama.cpp">
        </div>
        <div class="clone-field">
          <label for="cloneBranch">Branch <span class="optional">(optional)</span></label>
          <input type="text" id="cloneBranch" v-model="branch" placeholder="main">
        </div>
        <div class="clone-field">
          <label for="cloneDir">Target Directory</label>
          <input type="text" id="cloneDir" v-model="dir" placeholder="repo-name">
        </div>
        <div class="clone-actions">
          <button class="btn btn-primary" :disabled="cloning" @click="startClone">
            {{ cloning ? 'Cloning...' : 'Clone' }}
          </button>
          <button class="btn btn-ghost" @click="close">Cancel</button>
        </div>
        <div class="clone-status" v-if="cloning || cloneDone || cloneError">
          <div class="clone-status-header">
            <span class="clone-status-icon" :class="{ done: cloneDone, error: cloneError }">
              <svg v-if="!cloneDone && !cloneError" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <svg v-else-if="cloneError" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <span class="clone-status-text">{{ cloneStatusText }}</span>
          </div>
          <div class="clone-progress" v-if="cloning">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
          <div class="clone-log" v-if="cloneLog.length">
            <div v-for="(line, i) in cloneLog" :key="i" class="log-line" :class="'log-' + line.type">{{ line.text }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['close']);

const url = ref('https://github.com/ggml-org/llama.cpp');
const branch = ref('');
const dir = ref('llama.cpp');
const cloning = ref(false);
const cloneDone = ref(false);
const cloneError = ref(false);
const cloneStatusText = ref('Cloning...');
const progress = ref(0);
const cloneLog = ref([]);
let controller = null;

function close() {
  if (controller) {
    controller.abort();
    controller = null;
  }
  emit('close');
}

function addLog(text, type = 'info') {
  cloneLog.value.push({ text, type });
}

async function startClone() {
  if (!url.value.trim()) return;

  cloning.value = true;
  cloneDone.value = false;
  cloneError.value = false;
  cloneStatusText.value = 'Cloning...';
  progress.value = 0;
  cloneLog.value = [];

  addLog(`Cloning ${url.value}...`, 'info');
  progress.value = 10;

  try {
    controller = new AbortController();

    const response = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.value, branch: branch.value, dir: dir.value }),
      signal: controller.signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const progressMatch = line.match(/^PROGRESS:(\d+)$/);
        if (progressMatch) {
          progress.value = Math.min(90, parseInt(progressMatch[1], 10));
          continue;
        }

        const statusMatch = line.match(/^STATUS:(.+)$/);
        if (statusMatch) {
          cloneStatusText.value = statusMatch[1];
          continue;
        }

        const lower = line.toLowerCase();
        if (lower.includes('error') || lower.includes('failed')) addLog(line, 'error');
        else if (lower.includes('success') || lower.includes('complete') || lower.includes('done')) addLog(line, 'success');
        else if (lower.includes('warning')) addLog(line, 'warning');
        else addLog(line, 'info');
      }
    }

    progress.value = 100;

    if (!response.ok) {
      throw new Error('Clone failed');
    }

    cloneDone.value = true;
    cloneStatusText.value = 'Clone complete!';
    addLog('✓ Repository cloned successfully!', 'success');
  } catch (err) {
    if (err.name === 'AbortError') {
      cloneStatusText.value = 'Clone cancelled';
      addLog('Clone cancelled by user', 'warning');
    } else {
      cloneError.value = true;
      cloneStatusText.value = 'Clone failed';
      addLog(`✕ ${err.message}`, 'error');
    }
  } finally {
    cloning.value = false;
    controller = null;
  }
}
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
  width: 480px;
  max-width: 90vw;
  max-height: 85vh;
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
  padding: 20px;
  overflow-y: auto;
}

.clone-field {
  margin-bottom: 14px;
}

.clone-field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.optional {
  color: var(--text-muted);
  font-weight: 400;
}

.clone-field input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13.5px;
  font-family: inherit;
  transition: border-color var(--transition-fast);
}

.clone-field input::placeholder {
  color: var(--text-muted);
}

.clone-field input:focus {
  outline: none;
  border-color: var(--accent);
}

.clone-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
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

.clone-status {
  margin-top: 18px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.clone-status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.clone-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.clone-status-icon:not(.done):not(.error) {
  color: var(--accent);
}

.clone-status-icon.done {
  color: var(--success);
}

.clone-status-icon.error {
  color: var(--error);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}

.clone-status-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.clone-progress {
  margin-top: 6px;
}

.progress-track {
  height: 3px;
  background: var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.clone-log {
  margin-top: 10px;
  max-height: 180px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.log-line {
  padding: 1px 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-success { color: var(--success); }
.log-error { color: var(--error); }
.log-warning { color: var(--warning); }
.log-info { color: var(--text-secondary); }

@media (max-width: 600px) {
  .modal-content {
    width: 95vw;
  }
}
</style>
