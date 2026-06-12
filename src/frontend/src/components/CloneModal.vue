<template>
  <div class="modal-overlay" v-if="show" @click.self="close">
    <div class="modal-content clone-modal">
      <div class="modal-header">
        <h3>↯ Clone Repository</h3>
        <button class="modal-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="clone-field">
          <label for="cloneUrl">Repository URL</label>
          <input type="text" id="cloneUrl" v-model="url" placeholder="https://github.com/user/repo.git" value="https://github.com/ggml-org/llama.cpp">
        </div>
        <div class="clone-field">
          <label for="cloneBranch">Branch (optional)</label>
          <input type="text" id="cloneBranch" v-model="branch" placeholder="main (default)">
        </div>
        <div class="clone-field">
          <label for="cloneDir">Target Directory</label>
          <input type="text" id="cloneDir" v-model="dir" placeholder="llama.cpp">
        </div>
        <div class="clone-actions">
          <button class="btn btn-primary" :disabled="cloning" @click="startClone">
            {{ cloning ? '⟳ Cloning...' : '▶ Clone' }}
          </button>
          <button class="btn btn-outline" @click="close">Cancel</button>
        </div>
        <div class="clone-status" v-if="cloning || cloneDone || cloneError">
          <div class="clone-status-header">
            <span class="clone-status-icon" :class="{ done: cloneDone, error: cloneError }">
              {{ cloneError ? '✕' : (cloneDone ? '✓' : '⟳') }}
            </span>
            <span class="clone-status-text">{{ cloneStatusText }}</span>
          </div>
          <div class="clone-progress" v-if="cloning">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
          <div class="clone-log">
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
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 520px; max-width: 90vw; max-height: 85vh;
  display: flex; flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
}
.modal-header h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); }

.modal-close {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all 0.15s;
}
.modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }

.modal-body { padding: 20px; overflow-y: auto; }

.clone-field { margin-bottom: 16px; }
.clone-field label {
  display: block; font-size: 12px; font-weight: 500;
  color: var(--text-secondary); margin-bottom: 6px;
}
.clone-field input {
  width: 100%; padding: 8px 12px; background: var(--bg-primary);
  border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-primary); font-size: 14px; font-family: inherit;
}
.clone-field input:focus { outline: none; border-color: var(--accent); }

.clone-actions { display: flex; gap: 8px; margin-top: 20px; }
.btn {
  flex: 1; padding: 8px 16px; border-radius: 6px; font-size: 14px;
  font-weight: 500; cursor: pointer; border: 1px solid var(--border);
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--btn-primary-bg); color: #fff; border-color: var(--btn-primary-bg); }
.btn-primary:hover:not(:disabled) { background: var(--btn-primary-hover); }
.btn-outline { background: transparent; color: var(--text-secondary); }
.btn-outline:hover { background: var(--bg-hover); color: var(--text-primary); }

.clone-status {
  margin-top: 20px; padding: 12px; background: var(--bg-primary);
  border: 1px solid var(--border); border-radius: 8px;
}
.clone-status-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.clone-status-icon { font-size: 18px; }
.clone-status-icon:not(.done):not(.error) { animation: spin 1s linear infinite; }
.clone-status-text { font-size: 13px; font-weight: 500; color: var(--text-primary); }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.clone-progress { margin-top: 8px; }
.progress-bar {
  height: 4px; background: var(--border); border-radius: 2px;
  overflow: hidden; margin-top: 8px;
}
.progress-fill {
  height: 100%; background: var(--accent); border-radius: 2px;
  transition: width 0.3s ease;
}

.clone-log {
  margin-top: 10px; max-height: 200px; overflow-y: auto;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 11px; line-height: 1.5; color: var(--text-secondary);
}
.clone-log .log-line { padding: 1px 0; white-space: pre-wrap; word-break: break-all; }
.clone-log .log-info { color: var(--text-secondary); }
.clone-log .log-success { color: var(--accent-green); }
.clone-log .log-error { color: var(--accent-red); }
.clone-log .log-warning { color: var(--accent-orange); }

@media (max-width: 600px) {
  .modal-content { width: 95vw; }
}
</style>
