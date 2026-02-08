<template>
  <div class="min-h-screen flex items-center justify-center bg-dark-950">
    <div class="bg-dark-800 border border-dark-700 rounded-xl p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-dark-100 mb-2">Welcome to Betty</h1>
      <p class="text-sm text-dark-400 mb-6">
        First-time setup: Create an administrator account
      </p>

      <form @submit.prevent="handleSetup">
        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-200 mb-2">Username</label>
          <input
            v-model="username"
            type="text"
            required
            autofocus
            minlength="3"
            maxlength="20"
            pattern="[a-zA-Z0-9_]+"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Choose a username"
          />
          <p class="text-xs text-dark-500 mt-1">3-20 characters, letters, numbers, and underscore only</p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-200 mb-2">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-200 mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Choose a strong password"
          />
          <p class="text-xs text-dark-500 mt-1">Minimum 8 characters</p>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-dark-200 mb-2">Confirm Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': password && confirmPassword && password !== confirmPassword }"
            placeholder="Confirm your password"
          />
          <p v-if="password && confirmPassword && password !== confirmPassword" class="text-xs text-red-400 mt-1">
            Passwords do not match
          </p>
        </div>

        <button
          type="submit"
          :disabled="isLoading || !isFormValid"
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-dark-700 disabled:text-dark-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-800"
        >
          <span v-if="!isLoading">Create Admin Account</span>
          <span v-else class="flex items-center justify-center">
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating account...
          </span>
        </button>
      </form>

      <div v-if="error" class="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
        <p class="text-red-200 text-sm">{{ error }}</p>
      </div>

      <div v-if="success" class="mt-4 p-3 rounded-lg bg-green-900/30 border border-green-800">
        <p class="text-green-200 text-sm">Account created successfully! Redirecting to login...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref(null)
const success = ref(false)

const isFormValid = computed(() => {
  return (
    username.value.length >= 3 &&
    email.value.includes('@') &&
    password.value.length >= 8 &&
    password.value === confirmPassword.value
  )
})

async function handleSetup() {
  if (!isFormValid.value) {
    return
  }

  isLoading.value = true
  error.value = null
  success.value = false

  try {
    await auth.completeSetup(username.value, email.value, password.value)

    success.value = true

    // Redirect to login after short delay
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Setup failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
