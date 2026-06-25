<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const logTabs = [
  { name: 'llama.service', key: 'llama' },
  { name: 'betty.service', key: 'betty' },
]

const activeLogTab = ref('llama')

// State for llama.service logs
const llamaLogs = ref('')
const llamaLoading = ref(false)
const llamaError = ref(null)
const llamaAutoScroll = ref(true)
const llamaContainerRef = ref(null)

// State for betty.service logs
const bettyLogs = ref('')
const bettyLoading = ref(false)
const bettyError = ref(null)
const bettyAutoScroll = ref(true)
const bettyContainerRef = ref(null)

async function fetchLlamaLogs() {
  llamaLoading.value = true
  llamaError.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/logs`)
    if (res.data.success) {
      llamaLogs.value = res.data.data || '(no logs found)'
    } else {
      llamaError.value = res.data.error || 'Failed to fetch logs'
    }
  } catch (e) {
    llamaError.value = e.message || 'Failed to fetch logs'
  }
  llamaLoading.value = false
}

async function fetchBettyLogs() {
  bettyLoading.value = true
  bettyError.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/logs/betty`)
    if (res.data.success) {
      bettyLogs.value = res.data.data || '(no logs found)'
    } else {
      bettyError.value = res.data.error || 'Failed to fetch logs'
    }
  } catch (e) {
    bettyError.value = e.message || 'Failed to fetch logs'
  }
  bettyLoading.value = false
}

function scrollToBottom(container, autoScroll) {
  if (!autoScroll || !container) return
  const el = container.$el || container
  if (el && typeof el.scrollTop === 'number') {
    el.scrollTop = el.scrollHeight
  }
}

onMounted(() => {
  fetchLlamaLogs()
  fetchBettyLogs()
  // Auto-refresh every 5 seconds
  const interval = setInterval(() => {
    fetchLlamaLogs()
    fetchBettyLogs()
  }, 5000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div class="m-2 flex flex-col h-[calc(100vh-8rem)]">
    <!-- Log service tabs -->
    <div class="flex gap-1 mb-3">
      <button
        v-for="tab in logTabs"
        :key="tab.key"
        @click="activeLogTab = tab.key"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 flex-shrink-0"
        :class="
          activeLogTab === tab.key
            ? 'bg-bg-primary text-accent border-t-2 border-l border-r border-border'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
        "
      >
        {{ tab.name }}
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <button
          v-if="activeLogTab === 'llama'"
          @click="fetchLlamaLogs"
          :disabled="llamaLoading"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-bg-tertiary hover:bg-bg-quaternary text-text-secondary hover:text-text-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': llamaLoading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          v-else-if="activeLogTab === 'betty'"
          @click="fetchBettyLogs"
          :disabled="bettyLoading"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-bg-tertiary hover:bg-bg-quaternary text-text-secondary hover:text-text-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': bettyLoading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <label v-if="activeLogTab === 'llama'" class="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
          <input
            v-model="llamaAutoScroll"
            type="checkbox"
            class="w-4 h-4 rounded border-border bg-bg-tertiary text-accent focus:ring-accent focus:ring-offset-0"
          />
          Auto-scroll
        </label>
        <label v-else-if="activeLogTab === 'betty'" class="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
          <input
            v-model="bettyAutoScroll"
            type="checkbox"
            class="w-4 h-4 rounded border-border bg-bg-tertiary text-accent focus:ring-accent focus:ring-offset-0"
          />
          Auto-scroll
        </label>
      </div>
      <span class="text-xs text-text-muted">Auto-refreshing every 5s</span>
    </div>

    <!-- Log output container -->
    <div class="flex-1 overflow-hidden rounded-lg border border-border bg-bg-tertiary/50">
      <!-- llama.service logs -->
      <div v-if="activeLogTab === 'llama'" class="flex flex-col h-full">
        <div
          ref="llamaContainerRef"
          class="flex-1 overflow-auto"
        >
          <div v-if="llamaLoading && !llamaLogs" class="flex items-center justify-center h-full">
            <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

          <pre v-else-if="llamaLogs" class="p-4 m-0 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-all">{{ llamaLogs }}</pre>

          <div v-else-if="llamaError" class="flex flex-col items-center justify-center h-64">
            <svg class="w-10 h-10 mb-3 text-error/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p class="text-sm text-error">{{ llamaError }}</p>
          </div>

          <div v-else class="flex items-center justify-center h-64">
            <p class="text-sm text-text-muted">No logs available</p>
          </div>
        </div>
      </div>

      <!-- betty.service logs -->
      <div v-else-if="activeLogTab === 'betty'" class="flex flex-col h-full">
        <div
          ref="bettyContainerRef"
          class="flex-1 overflow-auto"
        >
          <div v-if="bettyLoading && !bettyLogs" class="flex items-center justify-center h-full">
            <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

          <pre v-else-if="bettyLogs" class="p-4 m-0 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-all">{{ bettyLogs }}</pre>

          <div v-else-if="bettyError" class="flex flex-col items-center justify-center h-64">
            <svg class="w-10 h-10 mb-3 text-error/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p class="text-sm text-error">{{ bettyError }}</p>
          </div>

          <div v-else class="flex items-center justify-center h-64">
            <p class="text-sm text-text-muted">No logs available</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
