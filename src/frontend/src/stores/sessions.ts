import { defineStore } from 'pinia';
import { useChatStore } from './chat';

export interface SessionStats {
  tokensUsed: number;
  cost: number;
  contextPercentage: number;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  messageCount: number;
  sessionFile?: string; // Full JSONL file path
  stats?: SessionStats;
}

export const useSessionStore = defineStore('sessions', {
  state: () => ({
    sessions: [] as Session[],
    activeSessionId: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    activeSession: (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId) || null,
    sortedSessions: (state) =>
      [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt),
  },

  actions: {
    async fetchSessions() {
      this.loading = true;
      this.error = null;
      try {
        const settingsStore = useChatStore();
        const response = await fetch('/api/sessions', {
          headers: {
            'X-Shared-Secret': settingsStore.currentSessionId ? '' : '',
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        this.sessions = data.sessions || [];
      } catch (err: any) {
        this.error = err.message;
        console.error('Failed to fetch sessions:', err);
      } finally {
        this.loading = false;
      }
    },

    async createSession() {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const newSession: Session = {
          id: data.id,
          name: 'New Session',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: data.model || 'unknown',
          messageCount: 0,
          sessionFile: data.sessionFile,
        };
        this.sessions.unshift(newSession);
        this.activeSessionId = newSession.id;
        return newSession;
      } catch (err: any) {
        this.error = err.message;
        throw err;
      }
    },

    async deleteSession(sessionId: string) {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.sessions = this.sessions.filter((s) => s.id !== sessionId);
        if (this.activeSessionId === sessionId) {
          this.activeSessionId = this.sessions[0]?.id || null;
        }
      } catch (err: any) {
        this.error = err.message;
        throw err;
      }
    },

    async switchSession(sessionId: string) {
      this.activeSessionId = sessionId;
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        this.activeSessionId = sessionId;
      }
    },

    async renameSession(sessionId: string, name: string) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.name = name;
        session.updatedAt = Date.now();
      }
    },

    async updateSessionStats(sessionId: string, stats: SessionStats) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.stats = stats;
      }
    },

    async loadSessionMessages(sessionId: string) {
      // Messages are loaded via WebSocket, not REST
      // This is a placeholder for future REST-based loading
    },

    updateSessionFile(sessionId: string, sessionFile: string) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) session.sessionFile = sessionFile;
    },
  },
});
