<template>
  <div class="min-h-screen flex items-center justify-center bg-dark-950">
    <div class="bg-dark-800 border border-dark-700 rounded-xl p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-dark-100 mb-2">Login to Betty</h1>
      <p class="text-sm text-dark-400 mb-6">Sign in to access your llama.cpp interface</p>

      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-200 mb-2">Username</label>
          <input
            v-model="username"
            type="text"
            required
            autofocus
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter username"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-dark-200 mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter password"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading || !username || !password"
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-dark-700 disabled:text-dark-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-800"
        >
          <span v-if="!isLoading">Login</span>
          <span v-else class="flex items-center justify-center">
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging in...
          </span>
        </button>
      </form>

      <div v-if="error" class="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
        <p class="text-red-200 text-sm">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref(null)

async function handleLogin() {
  isLoading.value = true
  error.value = null

  try {
    await auth.login(username.value, password.value)

    // Redirect to intended page or home
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message || 'Login failed. Please check your credentials.'
  } finally {
    isLoading.value = false
  }
}
</script>
