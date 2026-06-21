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
    // Current launch command
    launchCommand: null,

    // System memory
    systemMemory: {
      totalGB: 0,
      usedGB: 0,
      availableGB: 0,
      percentUsed: 0,
      cpuUsage: 0,
      cpuCores: [],
    },
    // HuggingFace
    hfSearchResults: [],
    hfModelDetails: null,
    hfModelFiles: [],
    hfDownloads: [],
    hfError: null,

    // Git update check
    gitUpdate: { hasUpdate: false, localCommit: null, remoteCommit: null, lastChecked: null },

    // Notification
    notification: { type: null, message: null },
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
    hasUpdate: (state) => state.gitUpdate.hasUpdate,
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
        // Wait for SSE connection to be established before starting
        // This ensures we receive status updates (building -> testing -> idle)
        const sseReady = await new Promise((resolve) => {
          if (this.sseConnected) { resolve(true); return }
          const check = setInterval(() => {
            if (this.sseConnected || this._connectingSSE === false) {
              clearInterval(check)
              resolve(this.sseConnected)
            }
          }, 50)
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(check)
            resolve(false)
          }, 5000)
        })

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

    async deleteBuildDir() {
      try {
        const res = await axios.delete(`${API_BASE}/api/build/delete`)
        if (res.data.success) {
          return { success: true, message: res.data.message }
        }
        return { success: false, message: res.data.error }
      } catch (e) {
        this.error = e.message
        return { success: false, message: e.message }
      }
    },

    async deleteLlamaDir() {
      try {
        const res = await axios.delete(`${API_BASE}/api/build/llama/delete`)
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
        const payload = name ? { name } : {}
        const res = await axios.post(`${API_BASE}/api/save-report`, payload)
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
      if (this._connectingSSE) return
      if (this.sseConnected) return

      this._connectingSSE = true

      const eventSource = new EventSource(`${API_BASE}/api/stream`)
      let reconnectTimer = null
      let lastStatusReceived = Date.now()

      eventSource.addEventListener('status', async (e) => {
        const data = JSON.parse(e.data)
        this.status = data.status
        this.testRun = data.testRun
        this.liveResults = data.liveResults || []
        this.processAlive = true
        lastStatusReceived = Date.now()
        // Refresh launch command when status changes (configs may have advanced)
        await this.fetchLaunchCommand()
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
            this._connectingSSE = false
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
        this._connectingSSE = false
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
        this._connectingSSE = false
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
        this.buildProgress = 0

        const response = await fetch(`${API_BASE}/api/build`, {
          method: 'POST',
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE format: events separated by blank lines
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const eventBlock of parts) {
            const eventLines = eventBlock.split('\n')
            let currentEvent = ''
            let currentData = ''

            for (const line of eventLines) {
              if (line.startsWith('event: ')) {
                currentEvent = line.slice('event: '.length)
              } else if (line.startsWith('data: ')) {
                currentData = line.slice('data: '.length)
              }
            }

            if (currentEvent === 'build-log' && currentData) {
              if (currentData.startsWith('PROGRESS:')) {
                this.buildProgress = parseInt(currentData.slice('PROGRESS:'.length), 10)
              } else if (currentData.startsWith('STATUS:')) {
                const status = currentData.slice('STATUS:'.length)
                if (status === 'Build complete!') {
                  this.buildStatus = 'success'
                  this.buildProgress = 100
                } else if (status === 'Build failed') {
                  this.buildStatus = 'error'
                }
              } else if (currentData.startsWith('ERROR: ')) {
                this.buildStatus = 'error'
                this.buildLogs.push({
                  type: 'error',
                  text: currentData,
                  timestamp: Date.now(),
                })
              } else if (currentData) {
                this.buildLogs.push({
                  type: 'log',
                  text: currentData,
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

    async fetchServiceConfig() {
      try {
        const res = await axios.get(`${API_BASE}/api/service/config`)
        if (res.data.success) {
          return res.data
        }
        return { success: false, exists: false }
      } catch (e) {
        return { success: false, error: e.message }
      }
    },

    async updateServiceConfig(config) {
      try {
        const res = await axios.post(`${API_BASE}/api/service/update`, config)
        if (res.data.success) {
          return { success: true }
        }
        return { success: false, error: res.data.error }
      } catch (e) {
        return { success: false, error: e.message }
      }
    },

    async fetchLaunchCommand() {
      try {
        const res = await axios.get(`${API_BASE}/api/launch-command`)
        if (res.data.success) {
          this.launchCommand = res.data.data
        }
      } catch {
        this.launchCommand = null
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

    //--- HuggingFace actions ---
    async searchHfModels(query, limit = 20, filter = null) {
      try {
        const params = { q: query, limit };
        if (filter) params.filter = filter;
        const res = await axios.get(`${API_BASE}/api/hf/search`, {
          params,
        })
        if (res.data.success) {
          this.hfSearchResults = res.data.data
          this.hfError = null
          return true
        }
        this.hfError = res.data.error
        return false
      } catch (e) {
        this.hfError = e.message
        return false
      }
    },

    async fetchHfModelDetails(modelId) {
      try {
        const res = await axios.get(`${API_BASE}/api/hf/model/${encodeURIComponent(modelId)}`)
        if (res.data.success) {
          this.hfModelDetails = res.data.data
          this.hfError = null
          return true
        }
        this.hfError = res.data.error
        return false
      } catch (e) {
        this.hfError = e.message
        return false
      }
    },

    async fetchHfModelFiles(modelId) {
      try {
        const res = await axios.get(`${API_BASE}/api/hf/model/${encodeURIComponent(modelId)}/files`)
        if (res.data.success) {
          this.hfModelFiles = res.data.data
          this.hfError = null
          return true
        }
        this.hfError = res.data.error
        return false
      } catch (e) {
        this.hfError = e.message
        return false
      }
    },

    async downloadHfModel(modelId, filename, onProgress) {
      try {
        this.hfError = null

        const response = await fetch(`${API_BASE}/api/hf/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, filename }),
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        let currentEvent = ''
        let currentData = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE format: events are separated by blank lines
          // Each event has optional 'event: ...' and required 'data: ...' lines
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const eventBlock of parts) {
            const eventLines = eventBlock.split('\n')
            currentEvent = ''
            currentData = ''

            for (const line of eventLines) {
              if (line.startsWith('event: ')) {
                currentEvent = line.slice('event: '.length)
              } else if (line.startsWith('data: ')) {
                currentData = line.slice('data: '.length)
              }
            }

            if (currentEvent === 'hf-download' && currentData) {
              if (currentData.startsWith('PROGRESS:')) {
                // Format: PROGRESS:percentage:downloadedBytes
                const parts = currentData.slice('PROGRESS:'.length).split(':')
                const progress = parseInt(parts[0], 10)
                const downloaded = parts[1] ? parseInt(parts[1], 10) : 0
                if (onProgress) onProgress(progress, downloaded)
              } else if (currentData.startsWith('STATUS:Download complete')) {
                this.hfError = null
              } else if (currentData.startsWith('STATUS:Download failed') || currentData.startsWith('ERROR:')) {
                this.hfError = currentData.replace('ERROR: ', '')
              }
            }
          }
        }

        return !this.hfError
      } catch (e) {
        this.hfError = e.message
        return false
      }
    },

    async fetchHfDownloads() {
      try {
        const res = await axios.get(`${API_BASE}/api/hf/downloads`)
        if (res.data.success) {
          this.hfDownloads = res.data.data
          return true
        }
        return false
      } catch (e) {
        this.hfError = e.message
        return false
      }
    },

    async deleteHfDownload(modelId) {
      try {
        const res = await axios.delete(`${API_BASE}/api/hf/download/${encodeURIComponent(modelId)}`)
        if (res.data.success) {
          this.hfDownloads = this.hfDownloads.filter(d => d.modelId !== modelId)
          return true
        }
        this.hfError = res.data.error
        return false
      } catch (e) {
        this.hfError = e.message
        return false
      }
    },

    async fetchGitUpdateStatus() {
      try {
        const res = await axios.get(`${API_BASE}/api/git/update-status`)
        if (res.data.success) {
          this.gitUpdate = res.data.data
        }
      } catch {
        // Silently fail
      }
    },

    async performUpdate() {
      try {
        const res = await axios.post(`${API_BASE}/api/git/update`)
        if (res.data.success) {
          await this.fetchGitUpdateStatus()
          return { success: true }
        }
        return { success: false, error: res.data.error }
      } catch (e) {
        return { success: false, error: e.message }
      }
    },

    async runUpdate() {
      try {
        const res = await axios.post(`${API_BASE}/api/update`)
        if (res.data.success) {
          return { success: true, message: res.data.message }
        }
        return { success: false, error: res.data.error }
      } catch (e) {
        return { success: false, error: e.message }
      }
    },

    showNotification(type, message) {
      this.notification = { type, message }
      setTimeout(() => {
        this.notification = { type: null, message: null }
      }, 6000)
    },

    clearNotification() {
      this.notification = { type: null, message: null }
    },
  },
})
