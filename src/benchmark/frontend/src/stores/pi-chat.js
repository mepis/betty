import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const usePiChatStore = defineStore('piChat', {
  state: () => ({
    sessionId: null,
    messages: [],
    isStreaming: false,
    model: null,
    thinking: 'off',
    tokens: { input: 0, output: 0, total: 0 },
    cost: 0,
    contextWindow: 0,
    contextPercent: null,
    error: null,
    sseConnected: false,
    // Current assistant message being built
    currentAssistant: null,
    // Current tool call being built
    currentToolCall: null,
    // Tick counter: incremented on every SSE mutation to force computed reactivity
    tick: 0,
  }),

  getters: {
    hasSession: (state) => !!state.sessionId,
    messageCount: (state) => state.messages.length,
    lastAssistantMessage: (state) => {
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === 'assistant') return state.messages[i]
      }
      return null
    },
  },

  actions: {
    async createSession() {
      try {
        this.error = null
        const res = await axios.post(`${API_BASE}/api/pi/session`)
        if (res.data.success) {
          this.sessionId = res.data.sessionId
          this.messages = []
          this.tokens = { input: 0, output: 0, total: 0 }
          this.cost = 0
          this.model = null
          this.tick = 0
          this.connectSSE()
          return true
        }
        return false
      } catch (e) {
        this.error = e.response?.data?.error || e.message
        return false
      }
    },

    connectSSE() {
      if (!this.sessionId) return
      if (this._sse) this.disconnectSSE()

      const eventSource = new EventSource(`${API_BASE}/api/pi/session/${this.sessionId}/stream`)

      eventSource.addEventListener('pi-status', (e) => {
        const data = JSON.parse(e.data)
        this.model = data.model
        this.thinking = data.thinking
        this.isStreaming = data.streaming
        if (data.contextWindow) {
          this.contextWindow = data.contextWindow
        }
      })

      eventSource.addEventListener('pi-message-start', (e) => {
        const data = JSON.parse(e.data)
        if (data.role === 'user') {
          this.messages.push({
            id: 'msg-' + Date.now(),
            role: 'user',
            content: data.content || '',
          })
        } else if (data.role === 'assistant') {
          this.currentAssistant = {
            id: 'msg-' + Date.now(),
            role: 'assistant',
            content: data.content || '',
            thinking: '',
            toolCalls: [],
          }
        }
      })

      eventSource.addEventListener('pi-text', (e) => {
        const data = JSON.parse(e.data)
        if (this.currentAssistant) {
          this.currentAssistant.content += data.delta
          this.tick++
        }
      })

      eventSource.addEventListener('pi-thinking', (e) => {
        const data = JSON.parse(e.data)
        if (this.currentAssistant) {
          this.currentAssistant.thinking += data.delta
          this.tick++
        }
      })

      eventSource.addEventListener('pi-tool-start', (e) => {
        const data = JSON.parse(e.data)
        this.currentToolCall = {
          id: data.id || 'tool-' + Date.now(),
          name: data.name,
          params: data.params || {},
          output: '',
          success: null,
          expanded: false,
        }
        if (this.currentAssistant) {
          this.currentAssistant.toolCalls.push(this.currentToolCall)
          this.tick++
        }
      })

      eventSource.addEventListener('pi-tool-update', (e) => {
        const data = JSON.parse(e.data)
        if (this.currentToolCall) {
          this.currentToolCall.output = data.output || ''
          this.tick++
        }
      })

      eventSource.addEventListener('pi-tool-end', (e) => {
        const data = JSON.parse(e.data)
        if (this.currentToolCall) {
          this.currentToolCall.output = data.output || ''
          this.currentToolCall.success = data.success
          this.currentToolCall = null
          this.tick++
        }
      })

      eventSource.addEventListener('pi-message-end', (e) => {
        const data = JSON.parse(e.data)
        if (data.role === 'assistant' && this.currentAssistant) {
          this.currentAssistant.content = data.content || this.currentAssistant.content
          this.messages.push(this.currentAssistant)
          this.currentAssistant = null
          this.tick++
        }
      })

      eventSource.addEventListener('pi-agent-start', () => {
        this.isStreaming = true
      })

      eventSource.addEventListener('pi-agent-end', (e) => {
        const data = JSON.parse(e.data)
        this.isStreaming = false
        if (data.tokens) {
          this.tokens = {
            input: data.tokens.input || 0,
            output: data.tokens.output || 0,
            total: data.tokens.total || 0,
          }
        }
        if (data.cost !== undefined) {
          this.cost = data.cost
        }
        if (data.contextUsage) {
          this.contextWindow = data.contextUsage.contextWindow || 0
          this.contextPercent = data.contextUsage.percent
        }
      })

      eventSource.addEventListener('pi-turn-end', () => {
        this.isStreaming = false
      })

      eventSource.addEventListener('pi-error', (e) => {
        const data = JSON.parse(e.data)
        this.error = data.message
        this.isStreaming = false
      })

      eventSource.addEventListener('pi-heartbeat', () => {
        // Connection alive
      })

      eventSource.onopen = () => {
        this.sseConnected = true
      }

      eventSource.onerror = () => {
        this.sseConnected = false
        eventSource.close()
        this._sse = null
      }

      this._sse = eventSource
    },

    disconnectSSE() {
      if (this._sse) {
        this._sse.close()
        this._sse = null
        this.sseConnected = false
      }
    },

    async sendPrompt(text) {
      if (!this.sessionId) return false
      try {
        this.error = null
        const res = await axios.post(`${API_BASE}/api/pi/session/${this.sessionId}/prompt`, { text })
        return res.data.success
      } catch (e) {
        this.error = e.response?.data?.error || e.message
        return false
      }
    },

    async abort() {
      if (!this.sessionId) return false
      try {
        const res = await axios.post(`${API_BASE}/api/pi/session/${this.sessionId}/abort`)
        if (res.data.success) {
          this.isStreaming = false
          return true
        }
        return false
      } catch (e) {
        this.error = e.response?.data?.error || e.message
        return false
      }
    },

    async disposeSession() {
      this.disconnectSSE()
      if (!this.sessionId) return
      try {
        await axios.delete(`${API_BASE}/api/pi/session/${this.sessionId}`)
      } catch {}
      this.sessionId = null
      this.messages = []
      this.currentAssistant = null
      this.currentToolCall = null
      this.isStreaming = false
      this.error = null
      this.tokens = { input: 0, output: 0, total: 0 }
      this.cost = 0
      this.model = null
      this.tick = 0
    },

    clearError() {
      this.error = null
    },
  },
})
