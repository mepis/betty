<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useSettingsStore } from './stores/settings'

const auth = useAuthStore()
const settings = useSettingsStore()

// Fetch current user and settings on app mount
onMounted(async () => {
  await auth.fetchCurrentUser()
  // Only fetch settings if authenticated
  if (auth.isAuthenticated) {
    await settings.fetchSettings()
  }
})
</script>

<template>
  <RouterView />
</template>
