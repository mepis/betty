<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-800 transition-colors w-full"
    >
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
        <span class="text-sm font-medium text-white">
          {{ userInitial }}
        </span>
      </div>
      <div class="flex-1 text-left min-w-0">
        <p class="text-sm font-medium text-dark-100 truncate">{{ auth.user?.username }}</p>
        <p class="text-xs text-dark-500">{{ roleLabel }}</p>
      </div>
      <svg
        class="w-4 h-4 text-dark-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute bottom-full left-0 right-0 mb-2 bg-dark-800 border border-dark-700 rounded-lg shadow-lg overflow-hidden"
    >
      <div class="p-3 border-b border-dark-700">
        <p class="text-xs text-dark-500">Signed in as</p>
        <p class="text-sm font-medium text-dark-100">{{ auth.user?.email }}</p>
      </div>

      <button
        @click="handleLogout"
        :disabled="isLoggingOut"
        class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-dark-900 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span v-if="!isLoggingOut">Logout</span>
        <span v-else>Logging out...</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const isOpen = ref(false)
const isLoggingOut = ref(false)

const userInitial = computed(() => {
  return auth.user?.username?.charAt(0).toUpperCase() || '?'
})

const roleLabel = computed(() => {
  if (auth.user?.role === 'admin') {
    return 'Administrator'
  }
  return 'User'
})

async function handleLogout() {
  isLoggingOut.value = true

  try {
    await auth.logout()
    router.push('/login')
  } catch (err) {
    console.error('Logout failed:', err)
    // Redirect to login anyway
    router.push('/login')
  } finally {
    isLoggingOut.value = false
    isOpen.value = false
  }
}

// Close dropdown when clicking outside
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      isOpen.value = false
    }
  })
}
</script>
