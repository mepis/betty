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
    profiles: [],
    error: null,
    sseConnected: false,
    // Benchmark messages (test prompts and LLM responses)
    benchmarkMessages: [],
    // Build state
    buildStatus: 'idle', // idle | building | success | error
    buildLogs: [],
    buildProgress: 0,
    // Systemd service
    serviceActive: false,

    // System memory
    systemMemory: {
      totalGB: 0,
      usedGB: 0,
      availableGB: 0,
      percentUsed: 0,
    },
  }),

  getters: {
    isRunning: (state) =>
      state.status === 'building' || state.status === 'testing',
    isIdle: (state) => state.status === 'idle',
    isError: (state) => state.status === 'error',
    isStopped: (state) => state.status === 'stopped',
    isBuilding: (state) => state.buildStatus === 'building',
    buildSuccess: (state) => state.buildStatus === 'success',
    buildError: (state) => state.buildStatus === 'error',
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

    async fetchProfiles() {
      try {
        const res = await axios.get(`${API_BASE}/api/profiles`)
        if (res.data.success) this.profiles = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async saveProfile(name, configs) {
      try {
        const res = await axios.post(`${API_BASE}/api/profile`, { name, data: configs })
        if (res.data.success) {
          await this.fetchProfiles()
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async loadProfile(name) {
      try {
        const res = await axios.post(`${API_BASE}/api/profile/${name}/load`)
        if (res.data.success) {
          this.configs = res.data.data
          await this.fetchProfiles()
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async deleteProfile(name) {
      try {
        const res = await axios.delete(`${API_BASE}/api/profile/${name}`)
        if (res.data.success) {
          this.profiles = this.profiles.filter((p) => p.name !== name)
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
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

    async killPort() {
      try {
        const res = await axios.post(`${API_BASE}/api/kill-port`)
        if (res.data.success) {
          return { success: true, message: res.data.message }
        }
        return { success: false, message: res.data.error }
      } catch (e) {
        this.error = e.message
        return { success: false, message: e.message }
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

    async fetchMessages() {
      try {
        const res = await axios.get(`${API_BASE}/api/messages`)
        if (res.data.success) this.benchmarkMessages = res.data.data
      } catch (e) {
        this.error = e.message
      }
    },

    connectSSE() {
      if (this.sseConnected) return

      const eventSource = new EventSource(`${API_BASE}/api/stream`)
      let reconnectTimer = null
      let lastStatusReceived = Date.now()

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data)
        this.status = data.status
        this.testRun = data.testRun
        this.liveResults = data.liveResults || []
        this.processAlive = true
        lastStatusReceived = Date.now()
      })

      eventSource.addEventListener('results', (e) => {
        const data = JSON.parse(e.data)
        this.liveResults = data.liveResults || []
        this.processAlive = true
        lastStatusReceived = Date.now()
      })

      eventSource.addEventListener('message-start', (e) => {
        const data = JSON.parse(e.data)
        lastStatusReceived = Date.now()
      })

      eventSource.addEventListener('message-complete', (e) => {
        const data = JSON.parse(e.data)
        lastStatusReceived = Date.now()
      })

      eventSource.addEventListener('test-run-complete', (e) => {
        const data = JSON.parse(e.data)
        this.benchmarkMessages = data.messages || []
        this.processAlive = true
        lastStatusReceived = Date.now()
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
        lastStatusReceived = Date.now()
      })

      eventSource.addEventListener('heartbeat', () => {
        // Connection alive
        lastStatusReceived = Date.now()
      })

      eventSource.onerror = () => {
        this.sseConnected = false
        // Don't close immediately - let EventSource auto-reconnect
        // But if we haven't received any data in 20s, force reconnect
        if (Date.now() - lastStatusReceived > 20000) {
          if (this._reconnectTimer) clearTimeout(this._reconnectTimer)
          this._reconnectTimer = setTimeout(() => {
            eventSource.close()
            this._sse = null
            this.sseConnected = false
            // Reconnect after a delay
            setTimeout(() => {
              if (!this._sse) {
                this.connectSSE()
              }
            }, 3000)
          }, 2000)
        }
      }

      eventSource.onopen = () => {
        this.sseConnected = true
        if (this._reconnectTimer) {
          clearTimeout(this._reconnectTimer)
          this._reconnectTimer = null
        }
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
      if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer)
        this._reconnectTimer = null
      }
    },

    clearError() {
      this.error = null
    },

    clearLogs() {
      this.logs = []
    },

    clearMessages() {
      this.benchmarkMessages = []
    },

    //--- Build actions ---
    async buildLlamaCpp() {
      try {
        this.buildStatus = 'building'
        this.buildLogs = []
        this.buildProgress = 0

        const response = await fetch(`${API_BASE}/api/build`, {
          method: 'POST',
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('event: build-log\ndata: ')) {
              const data = line.slice('event: build-log\ndata: '.length)

              if (data.startsWith('PROGRESS:')) {
                this.buildProgress = parseInt(data.slice('PROGRESS:'.length), 10)
              } else if (data.startsWith('STATUS:')) {
                const status = data.slice('STATUS:'.length)
                if (status === 'Build complete!') {
                  this.buildStatus = 'success'
                  this.buildProgress = 100
                } else if (status === 'Build failed') {
                  this.buildStatus = 'error'
                }
              } else if (data.startsWith('ERROR: ')) {
                this.buildStatus = 'error'
                this.buildLogs.push({
                  type: 'error',
                  text: data,
                  timestamp: Date.now(),
                })
              } else if (data) {
                this.buildLogs.push({
                  type: 'log',
                  text: data,
                  timestamp: Date.now(),
                })
              }
            }
          }
        }

        return this.buildStatus === 'success'
      } catch (e) {
        this.buildStatus = 'error'
        this.buildLogs.push({
          type: 'error',
          text: e.message,
          timestamp: Date.now(),
        })
        return false
      }
    },

    clearBuildLogs() {
      this.buildLogs = []
      this.buildProgress = 0
      this.buildStatus = 'idle'
    },

    async startService() {
      try {
        const res = await axios.post(`${API_BASE}/api/service/start`)
        if (res.data.success) {
          await this.fetchServiceStatus()
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async stopService() {
      try {
        const res = await axios.post(`${API_BASE}/api/service/stop`)
        if (res.data.success) {
          await this.fetchServiceStatus()
          return true
        }
        return false
      } catch (e) {
        this.error = e.message
        return false
      }
    },

    async fetchServiceStatus() {
      try {
        const res = await axios.get(`${API_BASE}/api/service/status`)
        if (res.data.success) {
          this.serviceActive = res.data.active
        }
      } catch {
        this.serviceActive = false
      }
    },

    async fetchSystemStatus() {
      try {
        const res = await axios.get(`${API_BASE}/api/system-status`)
        if (res.data.success) {
          this.systemMemory = res.data.data
        }
      } catch (e) {
        // Silently fail - not critical for dashboard
      }
    },
  },
})
