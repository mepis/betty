<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'

const store = useBenchmarkStore()
const logContainer = ref(null)
const showLogs = ref(true)
const showEnvInput = ref(false)
const envInput = ref('')
const savingReport = ref(false)
const reportName = ref('')
const saveReportSuccess = ref(false)
const pollingTimer = ref(null)

// Auto-scroll logs
watch(
  () => store.logs.length,
  async () => {
    await nextTick()
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  },
)

// Auto-scroll results table
watch(
  () => store.liveResults.length,
  async () => {
    await nextTick()
  },
)

onMounted(async () => {
  await store.fetchStatus()
  await store.fetchConfigs()
  await store.fetchResults()
  store.connectSSE()

  // Poll for status updates as backup
  pollingTimer.value = setInterval(async () => {
    await store.fetchStatus()
  }, 5000)
})

onUnmounted(() => {
  store.disconnectSSE()
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
  }
})

async function handleStart() {
  const env = envInput.value.trim()
    ? JSON.parse(envInput.value)
    : {}
  await store.startBenchmark(env)
}

async function handleStop() {
  await store.stopBenchmark()
}

async function handleSaveReport() {
  if (savingReport.value) return
  savingReport.value = true
  saveReportSuccess.value = false
  const ok = await store.saveReport(reportName.value || undefined)
  if (ok) {
    saveReportSuccess.value = true
    reportName.value = ''
    setTimeout(() => (saveReportSuccess.value = false), 3000)
  }
  savingReport.value = false
}

function formatTime(ms) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function statusColor(status) {
  switch (status) {
    case 'building': return 'text-warning'
    case 'testing': return 'text-accent'
    case 'idle': return 'text-text-muted'
    case 'error': return 'text-error'
    case 'stopped': return 'text-text-secondary'
    default: return 'text-text-muted'
  }
}

function statusBg(status) {
  switch (status) {
    case 'building': return 'bg-warning-subtle text-warning'
    case 'testing': return 'bg-accent-subtle text-accent'
    case 'idle': return 'bg-bg-tertiary text-text-muted'
    case 'error': return 'bg-error-subtle text-error'
    case 'stopped': return 'bg-bg-tertiary text-text-secondary'
    default: return 'bg-bg-tertiary text-text-muted'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Status & Controls -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Status Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Status</h2>
          <span class="badge" :class="statusBg(store.status)">
            <span class="w-1.5 h-1.5 rounded-full" :class="store.isRunning ? 'animate-pulse' : ''" />
            {{ store.status.charAt(0).toUpperCase() + store.status.slice(1) }}
          </span>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-muted">Test Run</span>
            <span class="text-sm font-mono font-medium">{{ store.testRun || '—' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-muted">Process</span>
            <span class="text-sm font-medium" :class="store.processAlive ? 'text-success' : 'text-text-muted'">
              {{ store.processAlive ? 'Alive' : 'Dead' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-muted">SSE</span>
            <span class="text-sm font-medium" :class="store.sseConnected ? 'text-success' : 'text-text-muted'">
              {{ store.sseConnected ? 'Connected' : 'Disconnected' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="card">
          <div class="stat-label">Avg Gen Tokens/s</div>
          <div class="stat-value text-accent">{{ store.avgGenTokensPerSec || '—' }}</div>
        </div>
        <div class="card">
          <div class="stat-label">Avg Prompt Tokens/s</div>
          <div class="stat-value text-info">{{ store.avgPromptTokensPerSec || '—' }}</div>
        </div>
        <div class="card">
          <div class="stat-label">Total Runs</div>
          <div class="stat-value text-text-primary">{{ store.totalRuns || '—' }}</div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="card">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            v-if="!store.isRunning"
            @click="handleStart"
            class="btn btn-success"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ store.isError ? 'Restart Benchmark' : store.isStopped ? 'Restart Benchmark' : 'Start Benchmark' }}
          </button>
          <button
            v-if="store.isRunning"
            @click="handleStop"
            class="btn btn-danger"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop
          </button>
          <button
            v-if="store.isRunning"
            @click="showEnvInput = !showEnvInput"
            class="btn btn-ghost"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Environment
          </button>
        </div>
        <div class="flex items-center gap-3">
          <!-- Save report -->
          <div class="flex items-center gap-2">
            <input
              v-model="reportName"
              :placeholder="store.liveResults.length > 0 ? 'Report name...' : 'No results to save'"
              class="input w-48"
              :disabled="store.liveResults.length === 0 || savingReport"
              @keyup.enter="handleSaveReport"
            />
            <button
              @click="handleSaveReport"
              class="btn btn-primary btn-sm"
              :disabled="store.liveResults.length === 0 || savingReport"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {{ savingReport ? 'Saving...' : 'Save' }}
            </button>
            <span v-if="saveReportSuccess" class="text-xs text-success">Saved!</span>
          </div>
        </div>
      </div>

      <!-- Environment input -->
      <div v-if="showEnvInput" class="mt-4 pt-4 border-t border-border">
        <label class="block text-xs font-medium text-text-muted mb-2">Environment Variables (JSON)</label>
        <textarea
          v-model="envInput"
          placeholder='{"API_KEY": "secret"}'
          class="textarea h-20"
          rows="3"
        />
      </div>
    </div>

    <!-- Results Table -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Live Results</h2>
        <span class="text-xs text-text-muted">{{ store.liveResults.length }} entries</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">#</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Ctx Len</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Batch</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">GPU Layers</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Prompt Tok/s</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Gen Tok/s</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Total Tokens</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Total Time</th>
              <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider">Mem (GB)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(result, i) in store.liveResults"
              :key="result.testRunId"
              class="border-b border-border/50 last:border-0 transition-colors"
              :class="i % 2 === 0 ? '' : 'bg-bg-tertiary/30'"
            >
              <td class="py-2.5 px-3 font-mono text-xs" :class="statusColor(store.status)">{{ result.testRunId }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs">{{ result.contextLength ?? '—' }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs">{{ result.batchSize ?? '—' }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs">{{ result.gpuLayerOffload ?? '—' }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs">{{ result.avgPromptTokensPerSec?.toFixed(2) ?? '—' }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs font-medium text-accent">{{ result.avgGenTokensPerSec?.toFixed(2) ?? '—' }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs text-text-secondary">
                {{ formatNumber(result.totalGenTokens) }} / {{ formatNumber(result.totalPromptTokens) }}
              </td>
              <td class="py-2.5 px-3 text-right font-mono text-xs text-text-secondary">{{ formatTime(result.totalTimeMs) }}</td>
              <td class="py-2.5 px-3 text-right font-mono text-xs text-text-muted">{{ result.avgMemUsed?.toFixed(1) ?? '—' }}</td>
            </tr>
            <tr v-if="store.liveResults.length === 0">
              <td colspan="9" class="py-12 text-center text-text-muted text-sm">
                <svg class="w-8 h-8 mx-auto mb-2 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                No results yet. Start a benchmark to see data.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Log Viewer -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <button
          @click="showLogs = !showLogs"
          class="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wider"
        >
          <svg
            class="w-4 h-4 transition-transform"
            :class="showLogs ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Live Logs
          <span class="badge bg-bg-tertiary text-text-muted ml-2">{{ store.logs.length }}</span>
        </button>
        <button
          v-if="store.logs.length > 0"
          @click="store.clearLogs()"
          class="btn btn-ghost btn-sm"
        >
          Clear
        </button>
      </div>
      <div
        v-if="showLogs"
        ref="logContainer"
        class="bg-bg-primary rounded-lg p-4 font-mono text-xs max-h-80 overflow-auto"
      >
        <div v-if="store.logs.length === 0" class="text-text-muted">No logs yet.</div>
        <div
          v-for="(log, i) in store.logs"
          :key="i"
          class="leading-relaxed"
          :class="log.type === 'stderr' ? 'text-error' : 'text-text-secondary'"
        >
          <span class="text-text-muted select-none">{{ String(i + 1).padStart(4, ' ') }} </span>
          {{ log.text }}
        </div>
        <div ref="logAnchor" />
      </div>
    </div>
  </div>
</template>
