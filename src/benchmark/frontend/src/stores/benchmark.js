import { defineStore } from 'pinia'
import axios from 'axios'

// API base URL: use env var if set, otherwise relative path (same origin)
const API_BASE = import.meta.env.VITE_API_URL || ''

export const useBenchmarkStore = defineStore('benchmark', {
  state: () => ({
    status: 'idle',
    testRun: 0,
    liveResults: [],
    processAlive: false,
    logs: [],
    configs: null,
    reports: [],
    currentReport: null,
    resultsMd: '',
    models: [],
    error: null,
    sseConnected: false,
  }),

  getters: {
    isRunning: (state) =>
      state.status === 'building' || state.status === 'testing',
    isIdle: (state) => state.status === 'idle',
    isError: (state) => state.status === 'error',
    latestResult: (state) =>
      state.liveResults.length > 0
        ? state.liveResults[state.liveResults.length - 1]
        : null,
    totalRuns: (state) => state.liveResults.length,
    avgGenTokensPerSec: (state) => {
      if (state.liveResults.length === 0) return 0
      const sum = state.liveResults.reduce(
        (s, r) => s + r.avgGenTokensPerSec,
        0,
      )
      return Math.round((sum / state.liveResults.length) * 100) / 100
    },
    avgPromptTokensPerSec: (state) => {
      if (state.liveResults.length === 0) return 0
      const sum = state.liveResults.reduce(
        (s, r) => s + r.avgPromptTokensPerSec,
        0,
      )
      return Math.round((sum / state.liveResults.length) * 100) / 100
    },
  },

  actions: {
    async fetchStatus() {
      try {
        const res = await axios.get(`${API_BASE}/api/status`)
        if (res.data.success) {
          this.status = res.data.status
          this.testRun = res.data.testRun
          this.liveResults = res.data.liveResults || []
          this.processAlive = res.data.processAlive
        }
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchConfigs() {
      try {
        const res = await axios.get(`${API_BASE}/api/configs`)
        if (res.data.success) this.configs = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchModels(directory) {
      try {
        const res = await axios.get(`${API_BASE}/api/models`, { params: { directory } })
        if (res.data.success) this.models = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async saveConfigs(configs) {
      try {
        const res = await axios.put(`${API_BASE}/api/configs`, configs)
        if (res.data.success) {
          this.configs = configs
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async startBenchmark(env = {}) {
      try {
        const res = await axios.post(`${API_BASE}/api/run`, { env })
        if (res.data.success) {
          this.status = 'building'
          this.testRun = 0
          this.liveResults = []
          this.logs = []
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async stopBenchmark() {
      try {
        const res = await axios.post(`${API_BASE}/api/stop`)
        if (res.data.success) {
          this.status = 'stopped'
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async saveReport(name) {
      try {
        const res = await axios.post(`${API_BASE}/api/save-report`, { name })
        return res.data.success
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async fetchReports() {
      try {
        const res = await axios.get(`${API_BASE}/api/reports`)
        if (res.data.success) this.reports = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchReport(name) {
      try {
        const res = await axios.get(`${API_BASE}/api/report/${name}`)
        if (res.data.success) this.currentReport = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async deleteReport(name) {
      try {
        const res = await axios.delete(`${API_BASE}/api/report/${name}`)
        if (res.data.success) {
          this.reports = this.reports.filter((r) => r.name !== name)
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async fetchResults() {
      try {
        const res = await axios.get(`${API_BASE}/api/results`)
        if (res.data.success) this.resultsMd = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    connectSSE() {
      if (this.sseConnected) return

      const eventSource = new EventSource(`${API_BASE}/api/stream`)

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data)
        this.status = data.status
        this.testRun = data.testRun
        this.liveResults = data.liveResults || []
        this.processAlive = true
      })

      eventSource.addEventListener('results', (e) => {
        const data = JSON.parse(e.data)
        this.liveResults = data.liveResults || []
      })

      eventSource.addEventListener('log', (e) => {
        const data = JSON.parse(e.data)
        const text = data.text || ''
        if (text.trim()) {
          this.logs.push({
            type: data.type,
            text: text.replace(/\n$/, ''),
            timestamp: Date.now(),
          })
          // Keep last 500 log lines
          if (this.logs.length > 500) {
            this.logs = this.logs.slice(-500)
          }
        }
      })

      eventSource.addEventListener('heartbeat', () => {
        // Connection alive
      })

      eventSource.onerror = () => {
        this.sseConnected = false
        eventSource.close()
      }

      eventSource.onopen = () => {
        this.sseConnected = true
      }

      // Store reference for cleanup
      this._sse = eventSource
    },

    disconnectSSE() {
      if (this._sse) {
        this._sse.close()
        this._sse = null
        this.sseConnected = false
      }
    },

    clearError() {
      this.error = null
    },

    clearLogs() {
      this.logs = []
    },
  },
})
