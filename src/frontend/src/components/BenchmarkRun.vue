<template>
  <div>
    <div class="page-header">
      <h2>Benchmark Run</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="$emit('start')" :disabled="isRunning">▶ Start Benchmark</button>
        <button class="btn btn-danger" @click="$emit('stop')" :disabled="!isRunning && benchStatus !== 'stopped'">■ Stop</button>
        <button class="btn btn-secondary" @click="$emit('save-report')">💾 Save Report</button>
      </div>
    </div>

    <div class="run-layout">
      <div class="run-info">
        <div class="run-status-card">
          <h3>Current Status</h3>
          <div class="status-display">
            <span class="status-icon">{{ statusIcon }}</span>
            <span class="status-label">{{ statusLabel }}</span>
          </div>
          <div class="run-details">
            <div class="detail-row">
              <span class="detail-label">Test Run:</span>
              <span class="detail-value">{{ testRun || '—' }}</span>
            </div>
          </div>
        </div>

        <div class="run-metrics-card">
          <h3>Live Metrics</h3>
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-label">Avg Prompt Tok/s</div>
              <div class="metric-value">{{ lastResult?.avgPromptTokensPerSec ? formatNumber(lastResult.avgPromptTokensPerSec) : '—' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Avg Gen Tok/s</div>
              <div class="metric-value">{{ lastResult?.avgGenTokensPerSec ? formatNumber(lastResult.avgGenTokensPerSec) : '—' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Gen Tokens</div>
              <div class="metric-value">{{ lastResult?.totalGenTokens ? formatNumber(lastResult.totalGenTokens) : '—' }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Time (ms)</div>
              <div class="metric-value">{{ lastResult?.totalTimeMs ? formatNumber(lastResult.totalTimeMs) : '—' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="log-container">
        <div class="log-header">
          <h3>Live Log</h3>
          <button class="btn btn-small btn-outline" @click="$emit('clear-log')">Clear</button>
        </div>
        <div class="log-output" ref="logOutput">
          <div v-if="!logs.length" class="log-line log-info">Ready to start benchmark. Click "Start Benchmark" to begin.</div>
          <div v-for="(log, i) in logs" :key="i" class="log-line" :class="logClass(log)">{{ log.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { formatNumber } from '../utils.js';

const props = defineProps({
  benchStatus: String,
  testRun: Number,
  liveResults: Array,
  logs: Array,
  configs: Object,
});

defineEmits(['start', 'stop', 'save-report', 'clear-log']);

const logOutput = ref(null);

const isRunning = computed(() => props.benchStatus === 'building' || props.benchStatus === 'testing');

const statusIcon = computed(() => {
  const map = { idle: '⏸', building: '🔨', testing: '🧪', error: '❌', stopped: '⏹' };
  return map[props.benchStatus] || '⏸';
});

const statusLabel = computed(() => {
  const map = {
    idle: 'Ready',
    building: 'Building...',
    testing: `Testing (Run #${props.testRun})`,
    error: 'Error',
    stopped: 'Stopped',
  };
  return map[props.benchStatus] || 'Ready';
});

const lastResult = computed(() => props.liveResults[props.liveResults.length - 1]);

function logClass(log) {
  const lower = log.text.toLowerCase();
  if (lower.includes('error') || lower.includes('failure')) return 'log-stderr';
  if (lower.includes('success') || lower.includes('complete')) return 'log-success';
  if (lower.includes('warning')) return 'log-warning';
  if (log.text.includes('==========') || log.text.includes('===')) return 'log-highlight';
  return log.type === 'stderr' ? 'log-stderr' : 'log-stdout';
}

// Auto-scroll log
watch(() => props.logs.length, () => {
  if (logOutput.value) {
    logOutput.value.scrollTop = logOutput.value.scrollHeight;
  }
});
</script>

<style scoped>
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid var(--border-color);
  border-radius: 4px; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--btn-primary-bg); color: #fff; border-color: var(--btn-primary-bg); }
.btn-primary:hover:not(:disabled) { background: var(--btn-primary-hover); }
.btn-danger { background: var(--btn-danger-bg); color: #fff; border-color: var(--btn-danger-bg); }
.btn-danger:hover:not(:disabled) { background: var(--btn-danger-hover); }
.btn-secondary { background: var(--btn-secondary-bg); color: var(--text-primary); }
.btn-secondary:hover:not(:disabled) { background: var(--btn-secondary-hover); }
.btn-outline { background: transparent; color: var(--text-secondary); }
.btn-outline:hover:not(:disabled) { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-small { padding: 4px 10px; font-size: 0.8rem; }

.run-layout {
  display: grid; grid-template-columns: 320px 1fr;
  gap: 16px; min-height: 500px;
}

.run-info { display: flex; flex-direction: column; gap: 16px; }

.run-status-card, .run-metrics-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 16px 20px;
}

.run-status-card h3, .run-metrics-card h3 {
  font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);
  margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;
}

.status-display {
  display: flex; align-items: center; gap: 10px;
  padding: 12px; background: var(--bg-primary); border-radius: 4px; margin-bottom: 12px;
}
.status-icon { font-size: 1.5rem; }
.status-label { font-size: 1rem; font-weight: 600; color: var(--text-primary); }

.run-details { display: flex; flex-direction: column; gap: 6px; }
.detail-row { display: flex; justify-content: space-between; font-size: 0.85rem; }
.detail-label { color: var(--text-secondary); }
.detail-value { color: var(--text-primary); font-weight: 500; }

.metrics-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.metric { background: var(--bg-primary); border-radius: 4px; padding: 12px; }
.metric-label { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; }
.metric-value { font-size: 1.2rem; font-weight: 600; color: var(--accent-cyan); }

.log-container {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); display: flex; flex-direction: column;
  min-height: 500px;
}
.log-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}
.log-header h3 {
  font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px; margin: 0;
}
.log-output {
  flex: 1; overflow-y: auto; padding: 12px 16px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.8rem; line-height: 1.6; background: #0a0e14;
}
.log-line { white-space: pre-wrap; word-break: break-all; }
.log-line.log-info { color: var(--text-secondary); }
.log-line.log-stdout { color: var(--text-primary); }
.log-line.log-stderr { color: var(--accent-red); }
.log-line.log-success { color: var(--accent-green); }
.log-line.log-warning { color: var(--accent-orange); }
.log-line.log-highlight { color: var(--accent-blue); font-weight: 600; }

@media (max-width: 900px) {
  .run-layout { grid-template-columns: 1fr; }
  .run-info { order: 1; }
  .log-container { order: 2; min-height: 200px; }
}
</style>
