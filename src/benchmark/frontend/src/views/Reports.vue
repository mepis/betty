<script setup>
import { ref, onMounted } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'

const store = useBenchmarkStore()
const selectedReport = ref(null)
const loadingReport = ref(false)
const deletingReport = ref(null)
const showMdView = ref(false)

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
</script>

<template>
  <div class="space-y-6">
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
            <h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Results Summary</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-2 px-3 text-xs font-medium text-text-muted uppercase">#</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase">Prompt/s</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase">Gen/s</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase">Time</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase">Mem (GB)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(r, i) in selectedReport.liveResults"
                    :key="r.testRunId"
                    class="border-b border-border/50 last:border-0"
                    :class="i % 2 === 0 ? '' : 'bg-bg-tertiary/30'"
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
  </div>
</template>
