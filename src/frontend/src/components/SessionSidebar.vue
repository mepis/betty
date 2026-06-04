<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <button @click="createNewSession" class="new-session-btn">
        + New Session
      </button>
      <button @click="$emit('toggle')" class="mobile-toggle">☰</button>
    </div>

    <div class="session-list">
      <div
        v-if="loading"
        class="px-3 py-4 text-center text-gray-500 text-sm"
      >
        Loading sessions...
      </div>

      <div
        v-for="session in sortedSessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === activeSessionId }"
        @click="switchSession(session)"
      >
        <div class="flex items-center gap-2">
          <div class="session-name flex-1 min-w-0">
            {{ session.name || 'Untitled' }}
          </div>
          <button
            @click.stop="deleteSession(session.id)"
            class="delete-btn"
            title="Delete session"
          >
            🗑
          </button>
        </div>
        <div class="session-meta">
          <span>{{ formatDate(session.updatedAt) }}</span>
          <span v-if="session.model">{{ session.model }}</span>
        </div>
      </div>

      <div v-if="!loading && sortedSessions.length === 0" class="px-3 py-8 text-center text-gray-600 text-sm">
        No sessions yet
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSessionStore } from '@/stores/sessions';
import { useChatStore } from '@/stores/chat';
import { useWebSocket } from '@/composables/useWebSocket';
import { useToast } from '@/composables/useToast';

defineEmits<{
  toggle: [];
}>();

const sessionStore = useSessionStore();
const chatStore = useChatStore();
const { sendCommand } = useWebSocket();
const { showToast } = useToast();

const loading = computed(() => sessionStore.loading);
const sortedSessions = computed(() => sessionStore.sortedSessions);
const activeSessionId = computed(() => sessionStore.activeSessionId);

async function createNewSession() {
  try {
    await sessionStore.createSession();
    await sendCommand('new_session', {});
    chatStore.onSessionChanged();
  } catch (err: any) {
    showToast('error', `Failed to create session: ${err.message}`);
  }
}

async function switchSession(session: any) {
  try {
    const sessionPath = session.sessionFile || session.id;
    await sendCommand('switch_session', { sessionPath });
    await sessionStore.switchSession(session.id);
    chatStore.onSessionChanged();
  } catch (err: any) {
    showToast('error', `Failed to switch session: ${err.message}`);
  }
}

async function deleteSession(sessionId: string) {
  try {
    await sessionStore.deleteSession(sessionId);
    await sendCommand('abort', {});
  } catch (err: any) {
    showToast('error', `Failed to delete session: ${err.message}`);
  }
}

function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

// Load sessions on mount
sessionStore.fetchSessions();
</script>
