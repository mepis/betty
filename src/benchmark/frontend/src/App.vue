<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBenchmarkStore } from '@/stores/benchmark'

const store = useBenchmarkStore()
const route = useRoute()
const sidebarOpen = ref(true)
const gitUpdateTimer = ref(null)

const navItems = [
  { name: 'Run Tests', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Models', path: '/models', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { name: 'Config', path: '/config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { name: 'Reports', path: '/reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'Docs', path: '/docs', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
]

const activeNav = computed(() => route.path)

onMounted(() => {
  store.fetchGitUpdateStatus()
  gitUpdateTimer.value = setInterval(() => {
    store.fetchGitUpdateStatus()
  }, 60 * 60 * 1000)
})

onUnmounted(() => {
  if (gitUpdateTimer.value) {
    clearInterval(gitUpdateTimer.value)
  }
})
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      :class="[
        'flex flex-col border-r border-border bg-bg-secondary transition-all duration-300',
        sidebarOpen ? 'w-56' : 'w-16',
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center justify-between gap-3 px-4 py-5 border-b border-border">
        <div class="flex items-center gap-3">
          <template v-if="sidebarOpen">
            <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span class="font-semibold text-lg tracking-tight">Betty</span>
          </template>
          <button
            v-else
            @click="sidebarOpen = !sidebarOpen"
            class="flex items-center justify-center p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          v-if="sidebarOpen"
          @click="sidebarOpen = !sidebarOpen"
          class="flex items-center justify-center p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <!-- Status indicator -->
      <div class="p-3">
        <div
          class="flex items-center gap-2 px-3 py-2 rounded-lg"
          :class="
            store.isRunning
              ? 'bg-success-subtle'
              : store.isError
                ? 'bg-error-subtle'
                : 'bg-bg-tertiary'
          "
        >
          <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="
              store.isRunning
                ? 'bg-success animate-pulse'
                : store.isError
                  ? 'bg-error'
                  : 'bg-text-muted'
            "
          />
          <span v-if="sidebarOpen" class="text-xs font-medium" :class="
            store.isRunning
              ? 'text-success'
              : store.isError
                ? 'text-error'
                : 'text-text-muted'
          ">
            {{ store.isRunning ? 'Running' : store.isError ? 'Error' : 'Idle' }}
          </span>
        </div>
      </div>

      <!-- Update available -->
      <div v-if="sidebarOpen && store.hasUpdate" class="p-3 pt-0">
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-subtle border border-warning/20">
          <svg class="w-3.5 h-3.5 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span class="text-xs font-medium text-warning">Update Available</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-4 px-2 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          :class="
            activeNav === item.path
              ? 'bg-accent-subtle text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          "
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span v-if="sidebarOpen">{{ item.name }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto">
      <!-- Header -->
      <header class="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-xl border-b border-border">
        <div class="flex items-center justify-between px-6 py-3">
          <div>
            <h1 class="text-lg font-semibold tracking-tight">{{ route.meta.title || navItems.find(n => n.path === route.path)?.name || 'Dashboard' }}</h1>
            <p v-if="route.meta.description" class="text-xs text-text-muted mt-0.5">{{ route.meta.description }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Status badges -->
            <div v-if="store.liveResults.length > 0" class="flex items-center gap-3 text-xs">
              <div class="flex items-center gap-1.5 text-text-secondary">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {{ store.liveResults.length }} run{{ store.liveResults.length !== 1 ? 's' : '' }}
              </div>
              <div v-if="store.avgGenTokensPerSec > 0" class="flex items-center gap-1.5 text-text-secondary">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {{ store.avgGenTokensPerSec }} tok/s
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <div class="p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
