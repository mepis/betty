<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const saving = ref(false)
const success = ref(false)
const error = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

function clearMessages() {
  success.value = false
  error.value = ''
}

async function handleChangePassword() {
  clearMessages()
  saving.value = true

  // Validate inputs
  if (!currentPassword.value) {
    error.value = 'Current password is required'
    saving.value = false
    return
  }
  if (!newPassword.value) {
    error.value = 'New password is required'
    saving.value = false
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'New password must be at least 8 characters'
    saving.value = false
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    saving.value = false
    return
  }

  try {
    const ok = await auth.changePassword(currentPassword.value, newPassword.value)
    if (ok) {
      success.value = true
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      setTimeout(() => (success.value = false), 4000)
    } else {
      error.value = auth.error || 'Failed to change password'
    }
  } catch (e) {
    error.value = e.message || 'Failed to change password'
  }
  saving.value = false
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="card">
      <div class="flex items-center gap-3 mb-6">
        <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <div>
          <h2 class="text-base font-semibold text-text-primary">Change Password</h2>
          <p class="text-xs text-text-muted mt-0.5">Enter your current password and a new password to update your account.</p>
        </div>
      </div>

      <!-- Success message -->
      <div v-if="success" class="mb-4 flex items-start gap-2 p-3 rounded-lg bg-success-subtle border border-success/30 text-success text-sm">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Password changed successfully</span>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 flex items-start gap-2 p-3 rounded-lg bg-error-subtle border border-error/30 text-error text-sm">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <!-- Current password -->
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1.5">Current Password</label>
          <input
            v-model="currentPassword"
            type="password"
            class="input"
            placeholder="Enter current password"
            autocomplete="current-password"
          />
        </div>

        <!-- New password -->
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1.5">New Password</label>
          <input
            v-model="newPassword"
            type="password"
            class="input"
            placeholder="Enter new password"
            autocomplete="new-password"
            @input="clearMessages"
          />
          <p class="text-xs text-text-muted mt-1">Must be at least 8 characters</p>
        </div>

        <!-- Confirm new password -->
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1.5">Confirm New Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="input"
            placeholder="Confirm new password"
            autocomplete="new-password"
            @input="clearMessages"
          />
        </div>

        <!-- Submit button -->
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="saving"
          >
            <svg v-if="!saving" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {{ saving ? 'Changing...' : 'Change Password' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
