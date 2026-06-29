import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''
const STORAGE_KEY = 'pi-chat-session'

/** Persist session state to localStorage */
function persistSession(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionId: state.sessionId,
      messages: state.messages,
      model: state.model,
      thinking: state.thinking,
      tokens: state.tokens,
      cost: state.cost,
      contextWindow: state.contextWindow,
      contextPercent: state.contextPercent,
    }))
  } catch {}
}

/** Restore session state from localStorage */
function restoreSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Clear persisted session from localStorage */
function clearSessionStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

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
    skills: [],
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
          persistSession(this.$state)
          this.connectSSE()
          this.fetchSkills()
          return true
        }
        return false
      } catch (e) {
        this.error = e.response?.data?.error || e.message
        return false
      }
    },

    /** Restore a persisted session from localStorage, validate via SSE, and fallback to a new session */
    async restoreSession() {
      const saved = restoreSession()
      if (!saved?.sessionId) return false

      this.sessionId = saved.sessionId
      this.messages = saved.messages || []
      this.model = saved.model || null
      this.thinking = saved.thinking || 'off'
      this.tokens = saved.tokens || { input: 0, output: 0, total: 0 }
      this.cost = saved.cost || 0
      this.contextWindow = saved.contextWindow || 0
      this.contextPercent = saved.contextPercent
      this.tick = 0

      this.connectSSE()

      // Wait for SSE to confirm the session is alive (onopen) or confirm failure (onerror/timeout)
      const sseOk = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.disconnectSSE()
          resolve(false)
        }, 3000)

        const check = setInterval(() => {
          if (this.sseConnected) {
            clearTimeout(timeout)
            clearInterval(check)
            resolve(true)
          } else if (!this._sse) {
            // EventSource was closed (onerror fired, e.g. 404 for pruned session)
            clearTimeout(timeout)
            clearInterval(check)
            resolve(false)
          }
        }, 50)
      })

      if (!sseOk) {
        // Session is stale — clear and create fresh
        this.clearStaleSession()
        const created = await this.createSession()
        if (!created) {
          this.error = this.error || 'Failed to create a new session'
        }
        return created
      }

      this.fetchSkills()
      return true
    },

    /** Reset all session-related state and clear localStorage (session was stale) */
    clearStaleSession() {
      this.disconnectSSE()
      clearSessionStorage()
      this.sessionId = null
      this.messages = []
      this.currentAssistant = null
      this.currentToolCall = null
      this.isStreaming = false
      this.sseConnected = false
      this.error = null
      this.tokens = { input: 0, output: 0, total: 0 }
      this.cost = 0
      this.model = null
      this.contextWindow = 0
      this.contextPercent = null
      this.tick = 0
    },

    /** Persist current messages after a message is added via SSE */
    _persistAfterMessage() {
      persistSession(this.$state)
    },

    connectSSE() {
      if (!this.sessionId) return
      if (this._sse) this.disconnectSSE()

      // Include auth token in SSE URL (EventSource doesn't support custom headers)
      const token = localStorage.getItem('betty-token')
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ''
      const eventSource = new EventSource(`${API_BASE}/api/pi/session/${this.sessionId}/stream${tokenParam}`)

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
          this._persistAfterMessage()
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
        // Only update content — defer push/clear to pi-agent-end
        // message_end fires before tool execution events; pushing here
        // would orphan any subsequent tool calls (currentAssistant = null)
        if (data.role === 'assistant' && this.currentAssistant) {
          this.currentAssistant.content = data.content || this.currentAssistant.content
        }
      })

      eventSource.addEventListener('pi-agent-start', () => {
        this.isStreaming = true
      })

      eventSource.addEventListener('pi-agent-end', (e) => {
        const data = JSON.parse(e.data)
        // Finalize the current assistant message now that all tool calls are done
        if (this.currentAssistant) {
          this.messages.push(this.currentAssistant)
          this.currentAssistant = null
          this.tick++
          this._persistAfterMessage()
        }
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
        this._persistAfterMessage()
      })

      eventSource.addEventListener('pi-turn-end', () => {
        this.isStreaming = false
      })

      eventSource.addEventListener('pi-error', (e) => {
        const data = JSON.parse(e.data)
        this.error = data.message
        // Push any incomplete assistant message so errors don't lose content
        if (this.currentAssistant) {
          this.messages.push(this.currentAssistant)
          this.currentAssistant = null
          this.tick++
          this._persistAfterMessage()
        }
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
      clearSessionStorage()
      this.sessionId = null
      this.messages = []
      this.currentAssistant = null
      this.currentToolCall = null
      this.isStreaming = false
      this.error = null
      this.tokens = { input: 0, output: 0, total: 0 }
      this.cost = 0
      this.model = null
      this.contextWindow = 0
      this.contextPercent = null
      this.tick = 0
    },

    async fetchSkills() {
      try {
        const res = await axios.get(`${API_BASE}/api/pi/skills`)
        if (res.data.success) {
          this.skills = res.data.skills
        }
      } catch (e) {
        console.warn('[pi] Failed to fetch skills:', e.message)
        this.skills = []
      }
    },

    async newSession() {
      this.disconnectSSE()
      clearSessionStorage()
      this.sessionId = null
      this.messages = []
      this.currentAssistant = null
      this.currentToolCall = null
      this.isStreaming = false
      this.error = null
      this.tokens = { input: 0, output: 0, total: 0 }
      this.cost = 0
      this.model = null
      this.contextWindow = 0
      this.contextPercent = null
      this.tick = 0
      await this.createSession()
    },

    clearError() {
      this.error = null
    },
  },
})
