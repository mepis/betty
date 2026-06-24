<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const mode = ref('login') // 'login' | 'register'
const registerUsername = ref('')
const registerPassword = ref('')
const confirmPassword = ref('')
const registerRole = ref('viewer')

onMounted(async () => {
  // If already logged in, redirect away
  if (auth.isLoggedIn) {
    router.push('/admin')
  }
})

async function handleLogin() {
  if (!username.value.trim() || !password.value) return
  const ok = await auth.login(username.value.trim(), password.value)
  if (ok) {
    router.push('/admin')
  }
}

async function handleRegister() {
  if (!registerUsername.value.trim() || !registerPassword.value) return
  if (registerPassword.value !== confirmPassword.value) {
    auth.setError('Passwords do not match')
    return
  }
  const ok = await auth.register(
    registerUsername.value.trim(),
    registerPassword.value,
    registerRole.value
  )
  if (ok) {
    router.push('/admin')
  }
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  auth.setError(null)
}

// Handle Enter key on login form
function handleKeyDown(e) {
  if (e.key === 'Enter') {
    if (mode.value === 'login') {
      handleLogin()
    } else {
      handleRegister()
    }
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-primary px-4">
    <div class="w-full max-w-md">
      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-text-primary">Betty</h1>
        <p class="text-text-muted mt-2">llama.cpp Benchmark Tool</p>
      </div>

      <!-- Auth Card -->
      <div class="card">
        <!-- Error message -->
        <div v-if="auth.error" class="mb-4 p-3 bg-error-subtle border border-error/30 rounded-lg text-sm text-error">
          {{ auth.error }}
        </div>

        <!-- Login Form -->
        <div v-if="mode === 'login'">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Sign In</h2>
          <form @submit.prevent="handleLogin" @keydown="handleKeyDown" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Username</label>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Password</label>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              :disabled="auth.loading"
              class="btn btn-primary w-full"
            >
              <svg v-if="auth.loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sign In
            </button>
          </form>
          <div class="mt-4 text-center">
            <button
              v-if="!auth.isAdmin"
              @click="toggleMode"
              class="text-sm text-accent hover:text-accent-hover"
            >
              Don't have an account? Register
            </button>
          </div>
        </div>

        <!-- Register Form -->
        <div v-else>
          <h2 class="text-lg font-semibold text-text-primary mb-4">Create Account</h2>
          <form @submit.prevent="handleRegister" @keydown="handleKeyDown" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Username</label>
              <input
                v-model="registerUsername"
                type="text"
                autocomplete="username"
                class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Choose a username"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Password</label>
              <input
                v-model="registerPassword"
                type="password"
                autocomplete="new-password"
                class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Choose a password"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Confirm Password</label>
              <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Confirm your password"
                required
              />
            </div>
            <div v-if="auth.isAdmin" class="hidden">
              <!-- First user becomes admin automatically, this field is hidden -->
            </div>
            <div v-else>
              <label class="block text-sm font-medium text-text-secondary mb-1">Role</label>
              <select
                v-model="registerRole"
                class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="viewer">Viewer (read-only)</option>
                <option value="operator">Operator (run benchmarks)</option>
              </select>
            </div>
            <button
              type="submit"
              :disabled="auth.loading"
              class="btn btn-primary w-full"
            >
              <svg v-if="auth.loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Create Account
            </button>
          </form>
          <div class="mt-4 text-center">
            <button
              @click="toggleMode"
              class="text-sm text-accent hover:text-accent-hover"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-text-muted mt-6">
        Betty v{{ $store?.benchmark?.version || '1.0' }} &middot; llama.cpp Benchmark Tool
      </p>
    </div>
  </div>
</template>
