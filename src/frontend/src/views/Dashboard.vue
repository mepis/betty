<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import MemoryBar from '@/components/MemoryBar.vue'

const store = useBenchmarkStore()
const logContainer = ref(null)
const showLogs = ref(true)
const logsMaximized = ref(false)
const showEnvInput = ref(false)
const showLaunchCommand = ref(true)
const envInput = ref('')
const savingReport = ref(false)
const reportName = ref('')
const saveReportSuccess = ref(false)
const pollingTimer = ref(null)

// Details modal
const showModal = ref(false)
const selectedTestRunId = ref(null)

// CPU cores modal
const showCpuModal = ref(false)

// Controls modal
const showControlsModal = ref(false)

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
  await store.fetchServiceStatus()
  await store.fetchLaunchCommand()
  await store.fetchSystemStatus()
  store.connectSSE()

  // Set default report filename: date_time_model
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '-') // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-') // HH-MM-SS
  const modelName = (store.configs?.model || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')
  reportName.value = `${dateStr}_${timeStr}_${modelName}`

  // Poll for status and system updates as backup
  pollingTimer.value = setInterval(async () => {
    await store.fetchStatus()
    await store.fetchSystemStatus()
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
  const ok = await store.saveReport(reportName.value)
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

function openDetailsModal(testRunId) {
  selectedTestRunId.value = testRunId
  showModal.value = true
}

function closeDetailsModal() {
  showModal.value = false
  selectedTestRunId.value = null
}

function closeCpuModal() {
  showCpuModal.value = false
}

function openCpuModal() {
  showCpuModal.value = true
}

function closeControlsModal() {
  showControlsModal.value = false
}

function openControlsModal() {
  showControlsModal.value = true
}

function selectedTestRunMessages() {
  if (selectedTestRunId.value == null) return []
  const entry = store.benchmarkMessages.find(
    (tr) => tr.testRunId === selectedTestRunId.value,
  )
  return entry ? entry.messages : []
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
  <div class="m-2 space-y-6">
    <!-- Status, Metrics & Controls -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <div class="mt-4 pt-4 border-t border-border">
          <MemoryBar :store="store" />
        </div>
      </div>


    </div>

    <!-- Live Results & Logs -->
    <div class="space-y-6">
        <!-- Results Table -->
        <div class="card">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Live Results</h2>
            <div class="flex items-center gap-2">
              <button
                v-if="!store.isRunning"
                @click="handleStart"
                class="btn btn-success btn-sm"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ store.isError ? 'Restart Benchmark' : store.isStopped ? 'Restart Benchmark' : 'Start Benchmark' }}
              </button>
              <button
                v-if="store.isRunning"
                @click="handleStop"
                class="btn btn-danger btn-sm"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
              <span class="text-xs text-text-muted">{{ store.liveResults.length }} entries</span>
              <div class="flex items-center gap-2">
                <input
                  v-model="reportName"
                  :placeholder="store.liveResults.length > 0 ? 'Report name...' : 'No results to save'"
                  class="input input-sm w-36"
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
            </div>
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
                  <th class="text-right py-2.5 px-3 text-xs font-medium text-text-muted uppercase tracking-wider"></th>
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
                  <td class="py-2.5 px-3 text-right">
                    <button
                      @click="openDetailsModal(result.testRunId)"
                      class="btn btn-ghost btn-xs inline-flex items-center gap-1"
                      title="View test messages"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Details
                    </button>
                  </td>
                </tr>
                <tr v-if="store.liveResults.length === 0">
                  <td colspan="7" class="py-12 text-center text-text-muted text-sm">
                    <svg class="w-8 h-8 mx-auto mb-2 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span v-if="store.isRunning">No results yet. Benchmark is running...</span>
                    <span v-else>No results yet. Start a benchmark to see data.</span>
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
              <button
                @click="openControlsModal"
                class="btn btn-ghost btn-sm"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Controls
              </button>
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
            <div v-if="store.logs.length === 0" class="text-text-muted">
              <span v-if="store.isRunning">No logs yet. Build in progress...</span>
              <span v-else>No logs yet.</span>
            </div>
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

    <!-- Details Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeDetailsModal"
          />

          <!-- Modal -->
          <div class="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h3 class="text-lg font-semibold text-text-primary">
                  Test Run #{{ selectedTestRunId }} — Messages
                </h3>
                <p class="text-xs text-text-muted mt-0.5">{{ selectedTestRunMessages().length }} message{{ selectedTestRunMessages().length !== 1 ? 's' : '' }}</p>
              </div>
              <button
                @click="closeDetailsModal"
                class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="overflow-auto flex-1 p-6">
              <div v-if="selectedTestRunMessages().length === 0" class="flex flex-col items-center justify-center py-12 text-text-muted">
                <svg class="w-10 h-10 mb-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <span class="text-sm">No messages available for this test run yet.</span>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="(msg, msgIdx) in selectedTestRunMessages()"
                  :key="msg.messageIndex"
                  class="rounded-lg border border-border/50 overflow-hidden"
                >
                  <!-- Message Header -->
                  <div class="flex items-center gap-2 px-4 py-3 bg-bg-tertiary/50 border-b border-border/50">
                    <span class="badge bg-bg-secondary text-text-muted text-xs">Msg {{ msg.messageIndex }}</span>
                    <span class="text-xs text-text-muted">{{ msg.promptTokens }} prompt tokens · {{ msg.generatedTokens }} generated · {{ formatTime(msg.totalTimeMs) }}</span>
                  </div>

                  <!-- Prompt -->
                  <div class="px-4 py-3">
                    <div class="flex items-center gap-1.5 mb-2">
                      <svg class="w-3.5 h-3.5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span class="text-xs font-semibold text-info uppercase tracking-wider">Prompt</span>
                    </div>
                    <div class="text-sm text-text-secondary leading-relaxed break-words bg-bg-primary rounded-lg p-3">{{ msg.prompt }}</div>
                  </div>

                  <!-- Divider -->
                  <div class="mx-4 h-px bg-border/50" />

                  <!-- LLM Response -->
                  <div class="px-4 py-3">
                    <div class="flex items-center gap-1.5 mb-2">
                      <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span class="text-xs font-semibold text-accent uppercase tracking-wider">LLM Response</span>
                    </div>
                    <div class="text-sm text-text-secondary leading-relaxed break-words whitespace-pre-wrap bg-bg-primary rounded-lg p-3">{{ msg.response }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- CPU Cores Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCpuModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeCpuModal"
          />

          <!-- Modal -->
          <div class="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 class="text-lg font-semibold text-text-primary">CPU Cores</h3>
                <p class="text-xs text-text-muted mt-0.5">{{ store.systemMemory.cpuCores.length }} cores · {{ store.systemMemory.cpuUsage }}% overall</p>
              </div>
              <button
                @click="closeCpuModal"
                class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="p-6">
              <div v-if="store.systemMemory.cpuCores.length === 0" class="flex flex-col items-center justify-center py-8 text-text-muted">
                <svg class="w-10 h-10 mb-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
                <span class="text-sm">No CPU data available.</span>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="core in store.systemMemory.cpuCores"
                  :key="core.name"
                  class="flex items-center gap-3"
                >
                  <span class="text-xs font-mono font-medium text-text-muted w-16 flex-shrink-0">{{ core.name }}</span>
                  <div class="flex-1 h-4 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1.5"
                      :class="core.usage > 90 ? 'bg-error' : core.usage > 70 ? 'bg-warning' : 'bg-success'"
                      :style="{ width: `${Math.min(core.usage, 100)}%` }"
                    >
                      <span v-if="core.usage > 15" class="text-[10px] font-mono font-medium text-bg-primary">{{ core.usage }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Controls Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showControlsModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeControlsModal"
          />

          <!-- Modal -->
          <div class="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-[70%] mx-4">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 class="text-lg font-semibold text-text-primary">Controls</h3>
                <p class="text-xs text-text-muted mt-0.5">Benchmark environment and commands</p>
              </div>
              <button
                @click="closeControlsModal"
                class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-4">
              <button
                @click="showEnvInput = !showEnvInput"
                class="btn btn-ghost"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Environment Variables
              </button>

              <div v-if="showEnvInput" class="border-t border-border pt-4">
                <label class="block text-xs font-medium text-text-muted mb-2">Environment Variables (JSON)</label>
                <textarea
                  v-model="envInput"
                  placeholder='{"API_KEY": "secret"}'
                  class="textarea h-20"
                  rows="3"
                />
              </div>

              <div v-if="store.launchCommand" class="border-t border-border pt-4">
                <button
                  @click="showLaunchCommand = !showLaunchCommand"
                  class="flex items-center gap-2 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors w-full"
                >
                  <svg
                    class="w-3.5 h-3.5 transition-transform"
                    :class="showLaunchCommand ? '-rotate-90' : ''"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Current Launch Command
                </button>
                <div v-show="showLaunchCommand" class="mt-2 bg-bg-primary rounded-lg p-2.5 overflow-x-auto">
                  <pre class="text-[11px] font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">{{ store.launchCommand.full }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
