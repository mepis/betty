<template>
  <div>
    <h2>Dashboard</h2>
    <div class="dashboard-layout">
      <div class="dashboard-col">
        <div class="dashboard-grid">
          <div class="card">
            <h3>Model</h3>
            <p class="stat">{{ modelLabel }}</p>
          </div>
          <div class="card">
            <h3>Status</h3>
            <p class="stat">{{ benchStatus }}</p>
          </div>
          <div class="card">
            <h3>Test Runs</h3>
            <p class="stat">{{ liveResults.length }}</p>
          </div>
          <div class="card">
            <h3>Best Gen Tok/s</h3>
            <p class="stat">{{ bestGen }}</p>
          </div>
          <div class="card">
            <h3>Best Prompt Tok/s</h3>
            <p class="stat">{{ bestPrompt }}</p>
          </div>
          <div class="card">
            <h3>Last Run Time</h3>
            <p class="stat">{{ lastTime }}</p>
          </div>
        </div>

        <div class="card action-card">
          <h3>Quick Actions</h3>
          <div class="action-buttons">
            <button class="btn btn-primary" @click="$emit('start')" :disabled="isRunning">▶ Run Benchmark</button>
            <button class="btn btn-danger" @click="$emit('stop')" :disabled="!isRunning && benchStatus !== 'stopped'">■ Stop</button>
            <button class="btn btn-secondary" @click="$emit('save-report')">💾 Save Report</button>
          </div>
        </div>
      </div>

      <div class="dashboard-col">
        <div class="card">
          <h3>Recent Results</h3>
          <div v-if="liveResults.length">
            <table class="results-table">
              <thead><tr>
                <th>Run</th><th>Prompt Tok/s</th><th>Gen Tok/s</th><th>Total Gen</th><th>Total Time</th>
              </tr></thead>
              <tbody>
                <tr v-for="r in liveResults.slice(-3)" :key="r.testRunId">
                  <td>#{{ r.testRunId }}</td>
                  <td>{{ r.avgPromptTokensPerSec || '—' }}</td>
                  <td>{{ r.avgGenTokensPerSec || '—' }}</td>
                  <td>{{ r.totalGenTokens ? formatNumber(r.totalGenTokens) : '—' }}</td>
                  <td>{{ r.totalTimeMs ? formatNumber(r.totalTimeMs) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-state">No results yet. Start a benchmark to see results here.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatNumber } from '../utils.js';

const props = defineProps({
  benchStatus: String,
  testRun: Number,
  liveResults: Array,
  configs: Object,
});

defineEmits(['start', 'stop', 'save-report']);

const isRunning = computed(() => props.benchStatus === 'building' || props.benchStatus === 'testing');
const modelLabel = computed(() => {
  if (!props.configs) return '—';
  return `${props.configs.model_directory}/${props.configs.model}`;
});

const bestGen = computed(() => {
  if (!props.liveResults.length) return '—';
  const best = Math.max(...props.liveResults.map(r => r.avgGenTokensPerSec || 0));
  return best ? `${formatNumber(best)} tok/s` : '—';
});

const bestPrompt = computed(() => {
  if (!props.liveResults.length) return '—';
  const best = Math.max(...props.liveResults.map(r => r.avgPromptTokensPerSec || 0));
  return best ? `${formatNumber(best)} tok/s` : '—';
});

const lastTime = computed(() => {
  const last = props.liveResults[props.liveResults.length - 1];
  return last?.totalTimeMs ? `${formatNumber(last.totalTimeMs)} ms` : '—';
});
</script>

<style scoped>
.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dashboard-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 20px;
}

.card h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
}

.action-card { margin-top: 16px; }

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--btn-primary-bg); color: #fff; border-color: var(--btn-primary-bg); }
.btn-primary:hover:not(:disabled) { background: var(--btn-primary-hover); }
.btn-danger { background: var(--btn-danger-bg); color: #fff; border-color: var(--btn-danger-bg); }
.btn-danger:hover:not(:disabled) { background: var(--btn-danger-hover); }
.btn-secondary { background: var(--btn-secondary-bg); color: var(--text-primary); }
.btn-secondary:hover:not(:disabled) { background: var(--btn-secondary-hover); }

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.results-table th {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.results-table td {
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  color: var(--text-primary);
}

.empty-state {
  color: var(--text-muted);
  text-align: center;
  padding: 20px;
}

@media (max-width: 900px) {
  .dashboard-layout { grid-template-columns: 1fr; }
  .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .action-buttons { flex-direction: column; }
}
</style>
