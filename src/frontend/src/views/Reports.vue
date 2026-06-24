<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useBenchmarkStore } from '@/stores/benchmark'

const API_BASE = import.meta.env.VITE_API_URL || ''
const store = useBenchmarkStore()
const selectedReport = ref(null)
const loadingReport = ref(false)
const deletingReport = ref(null)
const showMdView = ref(false)

// Sorting state
const sortKey = ref('testRunId')
const sortAsc = ref(true)

// Modal state
const showConfigModal = ref(false)
const selectedTestRunId = ref(null)
const loadingConfig = ref(false)
const testRunConfig = ref(null)
const commands = ref(null)
const copiedTab = ref(null) // 'build' or 'launch'
const installingService = ref(false)
const serviceInstallResult = ref(null)
const serviceInstallError = ref(null)

async function loadCommands(reportName, testRunId) {
  try {
    const res = await axios.get(`${API_BASE}/api/report/${reportName}/commands/${testRunId}`)
    if (res.data.success) {
      commands.value = res.data.data
    }
  } catch (e) {
    console.error('Failed to load commands:', e)
  }
}

function copyToClipboard(text, tab) {
  navigator.clipboard.writeText(text).then(() => {
    copiedTab.value = tab
    setTimeout(() => { copiedTab.value = null }, 2000)
  }).catch(() => {})
}

onMounted(async () => {
  await store.fetchReports()
})

async function loadReport(name) {
  loadingReport.value = true
  selectedReport.value = null
  showMdView.value = false
  await store.fetchReport(name)
  selectedReport.value = store.currentReport
  loadingReport.value = false
}

async function deleteReport(name) {
  if (!confirm(`Delete report "${name}"?`)) return
  deletingReport.value = name
  await store.deleteReport(name)
  if (selectedReport.value?.name === name) {
    selectedReport.value = null
  }
  deletingReport.value = null
}

async function openConfigModal(reportName, testRunId) {
  selectedTestRunId.value = testRunId
  showConfigModal.value = true
  loadingConfig.value = true
  testRunConfig.value = null
  commands.value = null
  copiedTab.value = null
  try {
    const [configRes, cmdRes] = await Promise.all([
      axios.get(`${API_BASE}/api/report/${reportName}/configs/${testRunId}`),
      axios.get(`${API_BASE}/api/report/${reportName}/commands/${testRunId}`),
    ])
    if (configRes.data.success) {
      testRunConfig.value = configRes.data.data
    }
    if (cmdRes.data.success) {
      commands.value = cmdRes.data.data
    }
  } catch (e) {
    console.error('Failed to load test run config:', e)
  }
  loadingConfig.value = false
}

function closeConfigModal() {
  showConfigModal.value = false
  testRunConfig.value = null
  commands.value = null
  selectedTestRunId.value = null
  copiedTab.value = null
  installingService.value = false
  serviceInstallResult.value = null
  serviceInstallError.value = null
}

async function installService() {
  if (!selectedReport.value || !selectedTestRunId.value) return
  installingService.value = true
  serviceInstallResult.value = null
  serviceInstallError.value = null
  try {
    const res = await axios.post(`${API_BASE}/api/service/install`, {
      reportName: selectedReport.value.name,
      testRunId: selectedTestRunId.value,
    })
    if (res.data.success) {
      serviceInstallResult.value = res.data
    } else {
      serviceInstallError.value = res.data.error || 'Installation failed'
    }
  } catch (e) {
    serviceInstallError.value = e.message || 'Installation failed'
  }
  installingService.value = false
}

// Close modal on Escape key
function handleKeydown(e) {
  if (e.key === 'Escape') closeConfigModal()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function formatTime(ms) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function formatBool(v) {
  if (v === true) return '✓'
  if (v === false) return '✗'
  return formatValue(v)
}

function formatList(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '—'
  return arr.join(', ')
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return '↕'
  return sortAsc.value ? '↑' : '↓'
}

function sortClass(key) {
  return sortKey.value === key ? 'text-accent' : ''
}

const sortedResults = computed(() => {
  if (!selectedReport.value?.liveResults) return []
  const results = [...selectedReport.value.liveResults]
  const key = sortKey.value
  const dir = sortAsc.value ? 1 : -1
  results.sort((a, b) => {
    let va, vb
    switch (key) {
      case 'testRunId':
        va = a.testRunId ?? 0
        vb = b.testRunId ?? 0
        return (va - vb) * dir
      case 'avgPromptTokensPerSec':
        va = a.avgPromptTokensPerSec ?? -Infinity
        vb = b.avgPromptTokensPerSec ?? -Infinity
        return (va - vb) * dir
      case 'avgGenTokensPerSec':
        va = a.avgGenTokensPerSec ?? -Infinity
        vb = b.avgGenTokensPerSec ?? -Infinity
        return (va - vb) * dir
      case 'totalTimeMs':
        va = a.totalTimeMs ?? -Infinity
        vb = b.totalTimeMs ?? -Infinity
        return (va - vb) * dir
      case 'avgMemUsed':
        va = a.avgMemUsed ?? -Infinity
        vb = b.avgMemUsed ?? -Infinity
        return (va - vb) * dir
      default:
        return 0
    }
  })
  return results
})
</script>

<template>
  <div class="m-2 space-y-6">
    <!-- Reports List -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- List -->
      <div class="card lg:col-span-1">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Reports
            <span class="badge bg-bg-tertiary text-text-muted ml-2">{{ store.reports.length }}</span>
          </h2>
        </div>
        <div class="space-y-1">
          <div
            v-for="report in store.reports"
            :key="report.name"
            @click="loadReport(report.name)"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
            :class="
              selectedReport?.name === report.name
                ? 'bg-accent-subtle'
                : 'hover:bg-bg-tertiary'
            "
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ report.name }}</div>
              <div class="text-xs text-text-muted">{{ formatDate(report.modified) }}</div>
            </div>
            <button
              @click.stop="deleteReport(report.name)"
              class="p-1 rounded-md text-text-muted hover:text-error hover:bg-error-subtle transition-all"
              :disabled="deletingReport === report.name"
            >
              <svg v-if="deletingReport !== report.name" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </button>
          </div>
          <div v-if="store.reports.length === 0" class="py-8 text-center text-text-muted text-sm">
            No reports yet.
          </div>
        </div>
      </div>

      <!-- Detail -->
      <div class="lg:col-span-2">
        <div v-if="loadingReport" class="card flex items-center justify-center h-64">
          <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <div v-else-if="selectedReport" class="space-y-6">
          <!-- Header -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold">{{ selectedReport.name }}</h2>
                <p class="text-xs text-text-muted mt-1">
                  Saved {{ formatDate(selectedReport.savedAt) }}
                </p>
              </div>
              <button
                @click="showMdView = !showMdView"
                class="btn btn-ghost btn-sm"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {{ showMdView ? 'Results Table' : 'Raw Results' }}
              </button>
            </div>

            <!-- Summary metrics -->
            <div v-if="selectedReport.liveResults && selectedReport.liveResults.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div class="stat-label">Total Runs</div>
                <div class="stat-value text-accent">{{ selectedReport.liveResults.length }}</div>
              </div>
              <div>
                <div class="stat-label">Avg Gen Tok/s</div>
                <div class="stat-value text-info">
                  {{ (selectedReport.liveResults.reduce((s, r) => s + (r.avgGenTokensPerSec || 0), 0) / selectedReport.liveResults.length).toFixed(2) }}
                </div>
              </div>
              <div>
                <div class="stat-label">Avg Prompt Tok/s</div>
                <div class="stat-value text-info">
                  {{ (selectedReport.liveResults.reduce((s, r) => s + (r.avgPromptTokensPerSec || 0), 0) / selectedReport.liveResults.length).toFixed(2) }}
                </div>
              </div>
              <div>
                <div class="stat-label">Best Gen Tok/s</div>
                <div class="stat-value text-success">
                  {{ Math.max(...selectedReport.liveResults.map(r => r.avgGenTokensPerSec || 0)).toFixed(2) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Results Table -->
          <div v-if="!showMdView && selectedReport.liveResults" class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Results Summary</h3>
              <span class="text-xs text-text-muted">Click a row to view configs</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-2 px-3 text-xs font-medium text-text-muted uppercase cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('testRunId')"># <span class="inline-block w-3 align-text-bottom" :class="sortClass('testRunId')">{{ sortIcon('testRunId') }}</span></th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('avgPromptTokensPerSec')">Prompt/s <span class="inline-block w-3 align-text-bottom text-right" :class="sortClass('avgPromptTokensPerSec')">{{ sortIcon('avgPromptTokensPerSec') }}</span></th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('avgGenTokensPerSec')">Gen/s <span class="inline-block w-3 align-text-bottom text-right" :class="sortClass('avgGenTokensPerSec')">{{ sortIcon('avgGenTokensPerSec') }}</span></th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('totalTimeMs')">Time <span class="inline-block w-3 align-text-bottom text-right" :class="sortClass('totalTimeMs')">{{ sortIcon('totalTimeMs') }}</span></th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('avgMemUsed')">Mem (GB) <span class="inline-block w-3 align-text-bottom text-right" :class="sortClass('avgMemUsed')">{{ sortIcon('avgMemUsed') }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(r, i) in sortedResults"
                    :key="r.testRunId"
                    class="border-b border-border/50 last:border-0 cursor-pointer transition-colors"
                    :class="[
                      i % 2 === 0 ? '' : 'bg-bg-tertiary/30',
                      'hover:bg-accent-subtle/50',
                    ]"
                    @click="openConfigModal(selectedReport.name, r.testRunId)"
                  >
                    <td class="py-2 px-3 font-mono text-xs">{{ r.testRunId }}</td>
                    <td class="py-2 px-3 text-right font-mono text-xs">{{ r.avgPromptTokensPerSec?.toFixed(2) ?? '—' }}</td>
                    <td class="py-2 px-3 text-right font-mono text-xs font-medium text-accent">{{ r.avgGenTokensPerSec?.toFixed(2) ?? '—' }}</td>
                    <td class="py-2 px-3 text-right font-mono text-xs text-text-secondary">{{ formatTime(r.totalTimeMs) }}</td>
                    <td class="py-2 px-3 text-right font-mono text-xs text-text-muted">{{ r.avgMemUsed != null ? `${r.avgMemUsed.toFixed(1)} / ${r.avgMemTotal?.toFixed(0) ?? '?'}` : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Raw Markdown -->
          <div v-if="showMdView && selectedReport.mdContent" class="card">
            <h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Raw Results</h3>
            <pre class="font-mono text-xs text-text-secondary whitespace-pre-wrap overflow-auto max-h-[600px]">{{ selectedReport.mdContent }}</pre>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="card flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-10 h-10 mx-auto mb-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm text-text-muted">Select a report to view details</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Config Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showConfigModal" class="fixed inset-0 z-50 flex items-center justify-center" @keydown="handleKeydown">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeConfigModal"
          />

          <!-- Modal -->
          <div class="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h3 class="text-lg font-semibold text-text-primary">
                  Test Run #{{ selectedTestRunId }} — Configuration
                </h3>
                <p class="text-xs text-text-muted mt-0.5">{{ selectedReport?.name }}</p>
              </div>
              <button
                @click="closeConfigModal"
                class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="overflow-auto flex-1 p-6">
              <div v-if="loadingConfig" class="flex items-center justify-center py-12">
                <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>

              <div v-else-if="testRunConfig" class="space-y-6">
                <!-- Test Parameters -->
                <div>
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Test Parameters
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Context Length</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.testParameters?.contextLength) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Batch Size</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.testParameters?.batchSize) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">U-Batch Size</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.testParameters?.uBatchSize) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Cache RAM (GB)</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.testParameters?.cacheRam) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">GPU Layers</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.testParameters?.gpuLayerOffload) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Model Parameters -->
                <div>
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Model Parameters
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Temperature</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.modelParameters?.temperature) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Top P</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.modelParameters?.topP) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Min P</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.modelParameters?.minP) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Top K</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.modelParameters?.topK) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Server Parameters -->
                <div>
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    Server Parameters
                  </h4>
                  <div class="bg-bg-tertiary rounded-lg p-4 space-y-2">
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Model</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatValue(testRunConfig.serverParameters?.model) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Host</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatValue(testRunConfig.serverParameters?.host) }}:{{ formatValue(testRunConfig.serverParameters?.port) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Flash Attention</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatBool(testRunConfig.serverParameters?.flashAttn) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Reasoning</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatBool(testRunConfig.serverParameters?.reasoning) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Rope Scaling</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatValue(testRunConfig.serverParameters?.ropeScaling) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">GPU Layers</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatValue(testRunConfig.serverParameters?.gpuLayers) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Parallel</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatValue(testRunConfig.serverParameters?.parallel) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-xs text-text-muted">Cont. Batching</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatBool(testRunConfig.serverParameters?.contBatching) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Split & GPU Parameters -->
                <div>
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Split & GPU Parameters
                  </h4>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">GPU Selection</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatList(testRunConfig.splitParameters?.gpuSelection) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Layer Split</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.splitParameters?.layerSplit) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Tensor Split</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.splitParameters?.tensorSplit) }}</div>
                    </div>
                    <div class="bg-bg-tertiary rounded-lg p-3">
                      <div class="text-xs text-text-muted mb-1">Primary GPU</div>
                      <div class="text-sm font-mono font-medium text-text-primary">{{ formatValue(testRunConfig.splitParameters?.primaryGpu) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Environment Variables -->
                <div>
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Environment Variables
                  </h4>
                  <div class="bg-bg-tertiary rounded-lg p-4 space-y-2">
                    <div
                      v-for="(val, key) in testRunConfig.environment"
                      :key="key"
                      class="flex justify-between"
                    >
                      <span class="text-xs text-text-muted font-mono">{{ key }}</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatValue(val) }}</span>
                    </div>
                  </div>
                </div>

                <!-- CMake Build Flags -->
                <div>
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    CMake Build Flags
                  </h4>
                  <div class="bg-bg-tertiary rounded-lg p-4 space-y-2">
                    <div
                      v-for="(val, key) in testRunConfig.cmakeFlags"
                      :key="key"
                      class="flex justify-between"
                    >
                      <span class="text-xs text-text-muted font-mono">{{ key }}</span>
                      <span class="text-xs font-mono text-text-primary">{{ formatBool(val) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Build & Launch Commands -->
                <div v-if="commands">
                  <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Reproduce Commands
                  </h4>

                  <!-- Tabs -->
                  <div class="flex gap-2 mb-3">
                    <button
                      class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      :class="copiedTab !== 'launch' ? 'bg-accent-subtle text-accent' : 'bg-bg-tertiary text-text-muted'"
                      @click="copiedTab = null"
                    >
                      Build
                    </button>
                    <button
                      class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      :class="copiedTab !== 'build' ? 'bg-accent-subtle text-accent' : 'bg-bg-tertiary text-text-muted'"
                      @click="copiedTab = null"
                    >
                      Launch
                    </button>
                  </div>

                  <!-- Build Command -->
                  <div class="mb-3">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs text-text-muted">Build (cmake + make)</span>
                      <button
                        @click="copyToClipboard(commands.build.full, 'build')"
                        class="btn btn-ghost btn-xs flex items-center gap-1.5"
                      >
                        <svg v-if="copiedTab !== 'build'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <svg v-else class="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {{ copiedTab === 'build' ? 'Copied!' : 'Copy' }}
                      </button>
                    </div>
                    <pre class="bg-bg-tertiary rounded-lg p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap">{{ commands.build.full }}</pre>
                  </div>

                  <!-- Launch Command -->
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs text-text-muted">Launch (llama-server)</span>
                      <button
                        @click="copyToClipboard(commands.launch.full, 'launch')"
                        class="btn btn-ghost btn-xs flex items-center gap-1.5"
                      >
                        <svg v-if="copiedTab !== 'launch'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <svg v-else class="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {{ copiedTab === 'launch' ? 'Copied!' : 'Copy' }}
                      </button>
                    </div>
                    <pre class="bg-bg-tertiary rounded-lg p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap">{{ commands.launch.full }}</pre>
                  </div>

                  <!-- Install as Systemd Service -->
                  <div class="mt-4 pt-4 border-t border-border">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                        <span class="text-xs font-medium text-text-secondary">Systemd Service</span>
                      </div>
                      <button
                        @click="installService"
                        class="btn btn-success btn-xs flex items-center gap-1.5"
                        :disabled="installingService"
                      >
                        <svg v-if="!installingService" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <svg v-else class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {{ installingService ? 'Installing...' : 'Install' }}
                      </button>
                    </div>
                    <p class="text-xs text-text-muted mb-2">Installs the launch command as <code>llama.service</code>. Overwrites any previous install — the running service is restarted automatically.</p>

                    <!-- Success result -->
                    <div v-if="serviceInstallResult" class="bg-success-subtle border border-success/30 rounded-lg p-3 space-y-1">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="text-xs font-medium text-success">{{ serviceInstallResult.message }}</span>
                      </div>
                      <div v-if="serviceInstallResult.serviceName" class="text-xs font-mono text-text-secondary ml-6">
                        Service: {{ serviceInstallResult.serviceName }}
                      </div>
                      <div v-if="serviceInstallResult.warning" class="text-xs text-warning ml-6">
                        ⚠ {{ serviceInstallResult.warning }}
                      </div>
                      <div class="flex gap-2 mt-2 ml-6">
                        <button
                          @click="() => copyToClipboard('systemctl --user status ' + serviceInstallResult.serviceName, 'service-status')"
                          class="btn btn-ghost btn-xs"
                        >
                          Copy status command
                        </button>
                        <button
                          @click="() => copyToClipboard('systemctl --user stop ' + serviceInstallResult.serviceName, 'service-stop')"
                          class="btn btn-ghost btn-xs"
                        >
                          Copy stop command
                        </button>
                      </div>
                    </div>

                    <!-- Error result -->
                    <div v-if="serviceInstallError" class="bg-error-subtle border border-error/30 rounded-lg p-3">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="text-xs font-medium text-error">{{ serviceInstallError }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-center py-12 text-text-muted">
                <p class="text-sm">Failed to load configuration</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end px-6 py-3 border-t border-border flex-shrink-0">
              <button
                @click="closeConfigModal"
                class="btn btn-ghost btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
