<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const logs = ref('')
const loading = ref(false)
const error = ref(null)
const autoScroll = ref(true)
const logContainerRef = ref(null)

async function fetchLogs() {
  loading.value = true
  error.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/logs`)
    if (res.data.success) {
      logs.value = res.data.data || '(no logs found)'
    } else {
      error.value = res.data.error || 'Failed to fetch logs'
    }
  } catch (e) {
    error.value = e.message || 'Failed to fetch logs'
  }
  loading.value = false
}

function scrollToBottom() {
  if (!autoScroll.value || !logContainerRef.value) return
  const el = logContainerRef.value.$el || logContainerRef.value
  if (el && typeof el.scrollTop === 'number') {
    el.scrollTop = el.scrollHeight
  }
}

onMounted(() => {
  fetchLogs()
  // Auto-refresh every 5 seconds
  const interval = setInterval(fetchLogs, 5000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-8rem)]">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <button
          @click="fetchLogs"
          :disabled="loading"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-bg-tertiary hover:bg-bg-quaternary text-text-secondary hover:text-text-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
          <input
            v-model="autoScroll"
            type="checkbox"
            class="w-4 h-4 rounded border-border bg-bg-tertiary text-accent focus:ring-accent focus:ring-offset-0"
          />
          Auto-scroll
        </label>
      </div>
      <span class="text-xs text-text-muted">Auto-refreshing every 5s</span>
    </div>

    <!-- Log output -->
    <div
      ref="logContainerRef"
      class="flex-1 overflow-auto rounded-lg border border-border bg-bg-tertiary/50"
    >
      <div v-if="loading && !logs" class="flex items-center justify-center h-full">
        <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <pre v-else-if="logs" class="p-4 m-0 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-all">{{ logs }}</pre>

      <div v-else-if="error" class="flex flex-col items-center justify-center h-64">
        <svg class="w-10 h-10 mb-3 text-error/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p class="text-sm text-error">{{ error }}</p>
      </div>

      <div v-else class="flex items-center justify-center h-64">
        <p class="text-sm text-text-muted">No logs available</p>
      </div>
    </div>
  </div>
</template>
