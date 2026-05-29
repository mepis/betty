<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatInterface from '../components/ChatInterface.vue';
import { useSessionStore } from '../stores/sessions.js';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const sessionId = computed(() => String(route.params.id));
const titleInputVisible = ref(false);
const editingTitle = ref('');
let sseAbort: AbortController | null = null;

// Load session on mount or route change
watch(sessionId, (id) => {
  if (!id) return;
  // Clean up previous SSE connection
  abortSSE();
  sessionStore.fetchSession(id).then((session) => {
    if (session) {
      editingTitle.value = session.session.title;
    } else {
      router.push({ name: 'Sessions' });
    }
  }).catch(console.error);
}, { immediate: true, flush: 'post' });

function abortSSE(): void {
  if (sseAbort) { sseAbort.abort(); sseAbort = null; }
}

async function sendUserMessage(content: string): Promise<void> {
  const id = sessionId.value;
  if (!id || !content.trim()) return;

  // Optimistic user message is added by sendMessage() in the store
  await sessionStore.sendMessage(content, id);

  // Start SSE connection for assistant response
  startSSE(id, content);
}

function startSSE(sessionId: string, initialContent: string): void {
  abortSSE();
  sseAbort = new AbortController();
  const controller = sseAbort;

  fetch(`/sse/${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('betty_token') || ''}`,
    },
    body: JSON.stringify({ content: initialContent }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) throw new Error(`SSE error: ${response.status}`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done || controller.signal.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          handleSSEEvent(data);
        } catch { /* skip malformed events */ }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') console.error('SSE error:', err);
  });
}

function handleSSEEvent(event: Record<string, unknown>): void {
  switch (event.type) {
    case 'message_start':
      // Store assistant message ID for later updates
      break;
    case 'content_delta':
      sessionStore.addAssistantMessage(
        String(event.sessionId || ''),
        String(event.content || '')
      );
      break;
    case 'token_count':
      // Could update token count display here
      break;
    case 'done':
      abortSSE();
      break;
    case 'error':
      abortSSE();
      console.error('SSE error:', event.message);
      break;
  }
}

async function saveTitle(): Promise<void> {
  const id = sessionId.value;
  if (!id || !editingTitle.value.trim()) return;
  try {
    await sessionStore.updateSessionTitle(id, editingTitle.value.trim());
    // Refresh the current session to update local state
    await sessionStore.fetchSession(id);
  } catch (err: unknown) {
    console.error('Failed to save title:', err);
  } finally {
    titleInputVisible.value = false;
  }
}

function forkFromMessage(messageId: string): void {
  sendUserMessage('').then(() => {
    // Create a new session branched from this message
    sessionStore.createSession(undefined, messageId).then((newId) => {
      router.push({ name: 'Chat', params: { id: newId } });
    }).catch(console.error);
  });
}

onUnmounted(() => abortSSE());
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Session title bar -->
    <header class="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
      <div v-if="sessionStore.currentSession" class="flex items-center gap-2">
        <button @click="router.push({ name: 'Sessions' })" title="Back to sessions"
          class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>

        <span v-if="!titleInputVisible" @click="titleInputVisible = true" class="font-medium text-slate-900 cursor-pointer hover:text-indigo-600 transition truncate">
          {{ sessionStore.currentSession.session.title }}
        </span>

        <input v-show="titleInputVisible" v-model.trim="editingTitle" @keyup.enter="saveTitle" @blur="saveTitle" type="text"
          class="border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48" />
      </div>
    </header>

    <!-- Chat area -->
    <div class="flex-1 overflow-hidden">
      <ChatInterface v-if="sessionStore.currentSession" :messages="sessionStore.currentSession.messages" @send="sendUserMessage" />
      <div v-else class="h-full flex items-center justify-center text-slate-500">Loading…</div>
    </div>
  </div>
</template>
