<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'

const store = useBenchmarkStore()
const logContainer = ref(null)
const showLogs = ref(true)
const logsMaximized = ref(false)
const showEnvInput = ref(false)
const envInput = ref('')
const savingReport = ref(false)
const reportName = ref('')
const saveReportSuccess = ref(false)
const killingPort = ref(false)
const killPortSuccess = ref('')
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

async function handleKillPort() {
  if (killingPort.value) return
  killingPort.value = true
  killPortSuccess.value = ''
  const result = await store.killPort()
  if (result.success) {
    killPortSuccess.value = result.message
    setTimeout(() => (killPortSuccess.value = ''), 4000)
  } else {
    killPortSuccess.value = result.message || 'Failed to kill processes'
    setTimeout(() => (killPortSuccess.value = ''), 4000)
  }
  killingPort.value = false
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
    <!-- Status, Metrics & Controls -->
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

      <!-- Combined Metrics Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Metrics</h2>
          <span class="text-xs text-text-muted">{{ store.totalRuns }} run{{ store.totalRuns !== 1 ? 's' : '' }}</span>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="stat-label">Avg Gen Tokens/s</div>
            <div class="stat-value text-accent">{{ store.avgGenTokensPerSec || '—' }}</div>
          </div>
          <div>
            <div class="stat-label">Avg Prompt Tokens/s</div>
            <div class="stat-value text-info">{{ store.avgPromptTokensPerSec || '—' }}</div>
          </div>
          <div>
            <div class="stat-label">Total Runs</div>
            <div class="stat-value text-text-primary">{{ store.totalRuns || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- Controls Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Controls</h2>
        </div>
        <div class="space-y-3">
          <button
            v-if="!store.isRunning"
            @click="handleStart"
            class="btn btn-success w-full"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ store.isError ? 'Restart Benchmark' : store.isStopped ? 'Restart Benchmark' : 'Start Benchmark' }}
          </button>
          <button
            v-if="!store.isRunning"
            @click="handleKillPort"
            class="btn btn-warning w-full"
            :disabled="killingPort"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            {{ killingPort ? 'Killing...' : 'Kill Port' }}
          </button>
          <button
            v-if="store.isRunning"
            @click="handleStop"
            class="btn btn-danger w-full"
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
            class="btn btn-ghost w-full"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Environment
          </button>

          <!-- Save report -->
          <div class="pt-2 border-t border-border">
            <div class="flex items-center gap-2">
              <input
                v-model="reportName"
                :placeholder="store.liveResults.length > 0 ? 'Report name...' : 'No results to save'"
                class="input w-full"
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
            </div>
            <span v-if="saveReportSuccess" class="text-xs text-success">Saved!</span>
            <span v-if="killPortSuccess" class="text-xs text-success block">{{ killPortSuccess }}</span>
          </div>
        </div>

        <!-- Environment input -->
        <div v-if="showEnvInput" class="mt-3 pt-3 border-t border-border">
          <label class="block text-xs font-medium text-text-muted mb-2">Environment Variables (JSON)</label>
          <textarea
            v-model="envInput"
            placeholder='{"API_KEY": "secret"}'
            class="textarea h-20"
            rows="3"
          />
        </div>
      </div>
    </div>

    <!-- Live Results & Messages Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column: Live Results + Logs -->
      <div class="space-y-6">
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
                  <td class="py-2.5 px-3 text-right font-mono text-xs">{{ result.avgPromptTokensPerSec?.toFixed(2) ?? '—' }}</td>
                  <td class="py-2.5 px-3 text-right font-mono text-xs font-medium text-accent">{{ result.avgGenTokensPerSec?.toFixed(2) ?? '—' }}</td>
                  <td class="py-2.5 px-3 text-right font-mono text-xs text-text-secondary">
                    {{ formatNumber(result.totalGenTokens) }} / {{ formatNumber(result.totalPromptTokens) }}
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono text-xs text-text-secondary">{{ formatTime(result.totalTimeMs) }}</td>
                  <td class="py-2.5 px-3 text-right font-mono text-xs text-text-muted">{{ result.avgMemUsed != null ? `${result.avgMemUsed.toFixed(1)} / ${result.avgMemTotal?.toFixed(0) ?? '?'}` : '—' }}</td>
                </tr>
                <tr v-if="store.liveResults.length === 0">
                  <td colspan="6" class="py-12 text-center text-text-muted text-sm">
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
            <div class="flex items-center gap-2">
              <button
                v-if="store.logs.length > 0"
                @click="store.clearLogs()"
                class="btn btn-ghost btn-sm"
              >
                Clear
              </button>
              <button
                @click="logsMaximized = !logsMaximized"
                class="btn btn-ghost btn-sm"
                :title="logsMaximized ? 'Restore' : 'Maximize'"
              >
                <svg v-if="!logsMaximized" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M15 9V4.5M9 9H4.5M9 9h4.5M9 15v4.5M15 15v4.5M9 15H4.5M9 15h4.5" />
                </svg>
              </button>
            </div>
          </div>
          <div
            v-if="showLogs"
            ref="logContainer"
            class="bg-bg-primary rounded-lg p-4 font-mono text-xs overflow-auto transition-all duration-300"
            :class="logsMaximized ? 'max-h-[calc(100vh-14rem)]' : 'max-h-80'"
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

      <!-- Right Column: Test Messages & LLM Responses -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Test Messages &amp; LLM Responses</h2>
          <span class="text-xs text-text-muted">{{ store.benchmarkMessages.length }} test runs</span>
        </div>
        <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          <div
            v-for="(testRun, runIdx) in store.benchmarkMessages"
            :key="testRun.testRunId"
            class="relative"
          >
            <!-- Test Run Separator -->
            <div class="flex items-center gap-3 mb-3">
              <div class="flex-1 h-px bg-border" />
              <span class="text-xs font-semibold text-text-secondary uppercase tracking-wider bg-bg-primary px-2 py-0.5 rounded">
                Test Run #{{ testRun.testRunId }}
              </span>
              <div class="flex-1 h-px bg-border" />
            </div>

            <!-- Messages for this test run -->
            <div class="space-y-3">
              <div
                v-for="msg in testRun.messages"
                :key="msg.messageIndex"
                class="rounded-lg border border-border/50 overflow-hidden"
              >
                <!-- Message Header -->
                <div class="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/50 border-b border-border/50">
                  <span class="badge bg-bg-secondary text-text-muted text-xs">Msg {{ msg.messageIndex }}</span>
                  <span class="text-xs text-text-muted">{{ msg.promptTokens }} prompt tokens · {{ msg.generatedTokens }} generated · {{ formatTime(msg.totalTimeMs) }}</span>
                </div>

                <!-- Prompt (User Message) -->
                <div class="px-3 py-2">
                  <div class="flex items-center gap-1.5 mb-1">
                    <svg class="w-3 h-3 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span class="text-xs font-medium text-info">Prompt</span>
                  </div>
                  <div class="text-xs text-text-secondary pl-5 leading-relaxed break-words">{{ msg.prompt }}</div>
                </div>

                <!-- Divider -->
                <div class="mx-3 h-px bg-border/50" />

                <!-- LLM Response -->
                <div class="px-3 py-2">
                  <div class="flex items-center gap-1.5 mb-1">
                    <svg class="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span class="text-xs font-medium text-accent">LLM Response</span>
                  </div>
                  <div class="text-xs text-text-secondary pl-5 leading-relaxed break-words whitespace-pre-wrap">{{ msg.response }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="store.benchmarkMessages.length === 0" class="flex flex-col items-center justify-center py-12 text-text-muted">
            <svg class="w-10 h-10 mb-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <span class="text-sm">No messages yet. Start a benchmark to see test prompts and LLM responses.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
