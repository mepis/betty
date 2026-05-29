<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const searchQuery = ref('');

onMounted(() => {
  // Sessions are loaded by SessionsView, not here
});

function isActive(path: string): boolean {
  return path === '/' ? route.path === '/' : route.path.startsWith(path);
}

function navigateToSettings(): void {
  router.push('/settings');
}
</script>

<template>
  <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
    <!-- Logo -->
    <div class="px-5 py-4 border-b border-slate-100">
      <router-link to="/" class="flex items-center gap-3 group">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        </div>
        <span class="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition">Betty</span>
      </router-link>
    </div>

    <!-- New Chat button -->
    <div class="px-4 py-3">
      <button @click="$router.push({ name: 'Sessions' })"
        class="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New Chat
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      <!-- Sessions link -->
      <router-link to="/" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition"
        :class="isActive('/') ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        Sessions
      </router-link>

      <!-- Settings -->
      <button @click="navigateToSettings" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition"
        :class="isActive('/settings') ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        Settings
      </button>

      <div class="border-t border-slate-100 my-2"></div>

      <!-- Recent sessions -->
      <p v-if="$route.name === 'Chat'" class="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Current Session</p>
    </nav>

    <!-- User info footer -->
    <div class="border-t border-slate-100 px-4 py-3">
      <div v-if="authStore.user" class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700 shrink-0">
          {{ authStore.user.displayName.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900 truncate">{{ authStore.user.displayName }}</p>
          <p class="text-xs text-slate-500 truncate">@{{ authStore.user.username }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>
