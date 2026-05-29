<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/sessions.js';

const router = useRouter();
const sessionStore = useSessionStore();
const newTitle = ref('');
const creating = ref(false);

onMounted(() => {
  sessionStore.fetchSessions(1, 50).catch(console.error);
});

async function createNew(): Promise<void> {
  const title = newTitle.value.trim() || 'New Chat';
  creating.value = true;
  try {
    const id = await sessionStore.createSession(title);
    router.push({ name: 'Chat', params: { id } });
  } catch (err: unknown) {
    console.error('Failed to create session:', err);
  } finally {
    creating.value = false;
    newTitle.value = '';
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Delete this session and all its messages?')) return;
  try {
    await sessionStore.deleteSession(id);
  } catch (err: unknown) {
    console.error('Failed to delete:', err);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString();
}

function truncate(text?: string | null, max = 80): string {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '…' : text;
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between max-w-3xl mx-auto">
        <h1 class="text-xl font-semibold text-slate-900">Your Sessions</h1>

        <!-- New session input -->
        <form @submit.prevent="createNew" class="flex gap-2 w-full max-w-sm ml-4">
          <input v-model.trim="newTitle" type="text" placeholder="New chat title…"
            class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          <button type="submit" :disabled="creating"
            class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition">
            {{ creating ? 'Creating…' : '+ New Chat' }}
          </button>
        </form>
      </div>
    </header>

    <!-- Session list -->
    <main class="px-6 py-6 max-w-3xl mx-auto">
      <div v-if="sessionStore.loading" class="flex items-center justify-center py-12">
        <svg class="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75"/></svg>
      </div>

      <div v-else-if="sessionStore.sessions.length === 0" class="text-center py-16">
        <p class="text-slate-500 text-lg mb-2">No sessions yet</p>
        <p class="text-slate-400 text-sm">Create a new chat to get started!</p>
      </div>

      <ul v-else class="space-y-3">
        <li v-for="session in sessionStore.sessions" :key="session.id"
          class="group bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer"
          @click="router.push({ name: 'Chat', params: { id: session.id } })">

          <!-- Title row -->
          <div class="flex items-start justify-between gap-3">
            <h3 class="font-medium text-slate-900 truncate">{{ session.title }}</h3>
            <button @click.stop="handleDelete(session.id)" title="Delete"
              class="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>

          <!-- Message preview -->
          <p v-if="session.lastMessage" class="text-sm text-slate-500 mt-1 truncate">{{ truncate(session.lastMessage) }}</p>
          <p v-else class="text-xs text-slate-400 mt-1">Empty session</p>

          <!-- Metadata -->
          <div class="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{{ formatDate(session.updatedAt) }}</span>
            <span v-if="session.branchPointId" class="text-indigo-500 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
              Branched
            </span>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>
