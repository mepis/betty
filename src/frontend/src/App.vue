<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBenchmarkStore } from '@/stores/benchmark'
import { useAuthStore } from '@/stores/auth'

const store = useBenchmarkStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(true)
const gitUpdateTimer = ref(null)
const updating = ref(false)

const navItems = [
  { name: 'Chat', path: '/', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
  { name: 'Docs', path: '/docs', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { name: 'Account', path: '/account', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
  { name: 'Admin', path: '/admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', requiresRole: 'admin' },
]

// Filter nav items based on user role
const visibleNavItems = computed(() => {
  return navItems.filter(item => {
    if (!item.requiresRole) return true
    const roleHierarchy = { admin: 3, operator: 2, viewer: 1 }
    return (roleHierarchy[auth.user?.role] || 0) >= (roleHierarchy[item.requiresRole] || 0)
  })
})

const roleLabel = computed(() => {
  const labels = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' }
  return labels[auth.user?.role] || ''
})

const roleColor = computed(() => {
  const colors = { admin: 'text-warning', operator: 'text-info', viewer: 'text-text-muted' }
  return colors[auth.user?.role] || 'text-text-muted'
})

async function handleLogout() {
  auth.logout()
  router.push('/login')
}

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

async function handleUpdate() {
  updating.value = true
  try {
    const result = await store.performUpdate()
    if (result.success) {
      store.showNotification('success', 'Updated and restarted successfully')
    } else {
      store.showNotification('error', result.error || 'Update failed')
    }
  } catch (e) {
    store.showNotification('error', e.message || 'Update failed')
  } finally {
    updating.value = false
  }
}
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
        <button
          @click="handleUpdate"
          :disabled="updating"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-subtle border border-warning/20 w-full transition-all duration-200 hover:bg-warning/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="!updating" class="w-3.5 h-3.5 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <svg v-else class="w-3.5 h-3.5 text-warning flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="text-xs font-medium text-warning">{{ updating ? 'Updating...' : 'Update Available' }}</span>
        </button>
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
    <main class="flex-1 flex flex-col min-h-0">
      <!-- Header -->
      <header class="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-xl">
        <div class="flex items-center justify-between px-6 py-5">
          <div>
            <h1 class="text-lg font-semibold tracking-tight">{{ route.meta.title || navItems.find(n => n.path === route.path)?.name || 'Dashboard' }}</h1>
          </div>
          <div class="flex items-center gap-3">
            <!-- User info & logout -->
            <div v-if="auth.isLoggedIn" class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 text-xs">
                <svg class="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span class="text-text-secondary">{{ auth.user?.username }}</span>
                <span :class="roleColor" class="font-medium">[{{ roleLabel }}]</span>
              </div>
              <button
                @click="handleLogout"
                class="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-error hover:bg-error-subtle transition-all duration-200"
                title="Logout"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
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
      <div class="flex-1 flex flex-col min-h-0">
        <!-- Notification banner -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform -translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform -translate-y-2 opacity-0"
        >
          <div v-if="store.notification.type" class="fixed top-4 right-4 z-50 max-w-md">
            <div
              class="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border"
              :class="
                store.notification.type === 'success'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-error/10 border-error/30 text-error'
              "
            >
              <svg v-if="store.notification.type === 'success'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium">{{ store.notification.message }}</p>
              </div>
              <button @click="store.clearNotification()" class="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </Transition>
        <router-view />
      </div>
    </main>
  </div>
</template>
