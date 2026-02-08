import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getSettings, updateSettings, updateEmbeddingSettings, getEmbeddingStatus } from '../api/llama'

const defaults = {
  temperature: 0.7,
  maxTokens: 512,
  topP: 0.95,
  systemPrompt: 'You are a helpful, friendly AI assistant.',
  embeddingModelEnabled: false,
  embeddingModelFilename: null,
}

export const useSettingsStore = defineStore('settings', () => {
  const temperature = ref(defaults.temperature)
  const maxTokens = ref(defaults.maxTokens)
  const topP = ref(defaults.topP)
  const systemPrompt = ref(defaults.systemPrompt)
  const embeddingModelEnabled = ref(defaults.embeddingModelEnabled)
  const embeddingModelFilename = ref(defaults.embeddingModelFilename)
  const embeddingServerStatus = ref(null)
  const sidebarOpen = ref(true)
  const loading = ref(false)
  const error = ref(null)

  // Debounce timer for auto-save
  let saveTimer = null

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      const response = await getSettings()
      const data = response.settings

      // Use nullish coalescing to fall back to defaults if fields are missing
      temperature.value = data.temperature ?? defaults.temperature
      maxTokens.value = data.maxTokens ?? defaults.maxTokens
      topP.value = data.topP ?? defaults.topP
      systemPrompt.value = data.systemPrompt ?? defaults.systemPrompt
      embeddingModelEnabled.value = data.embeddingModelEnabled ?? false
      embeddingModelFilename.value = data.embeddingModelFilename ?? null

      // Fetch embedding server status
      await fetchEmbeddingStatus()
    } catch (e) {
      console.error('Failed to fetch settings:', e)
      error.value = e.message
      // Keep using current values (defaults) on error
    } finally {
      loading.value = false
    }
  }

  async function fetchEmbeddingStatus() {
    try {
      const response = await getEmbeddingStatus()
      embeddingServerStatus.value = response.status
    } catch (e) {
      console.error('Failed to fetch embedding status:', e)
      embeddingServerStatus.value = null
    }
  }

  async function saveSettings() {
    try {
      await updateSettings({
        temperature: temperature.value,
        maxTokens: maxTokens.value,
        topP: topP.value,
        systemPrompt: systemPrompt.value,
      })
      error.value = null
    } catch (e) {
      console.error('Failed to save settings:', e)
      error.value = e.message
    }
  }

  function debouncedSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveSettings()
    }, 1000) // Save 1 second after last change
  }

  // Watch for changes and auto-save (debounced)
  watch([temperature, maxTokens, topP, systemPrompt], debouncedSave)

  async function resetToDefaults() {
    temperature.value = defaults.temperature
    maxTokens.value = defaults.maxTokens
    topP.value = defaults.topP
    systemPrompt.value = defaults.systemPrompt
    // Auto-save will trigger via watch

    // Reset embedding settings separately (requires server restart)
    await saveEmbeddingSettings(false, null)
  }

  async function saveEmbeddingSettings(enabled, modelFilename) {
    try {
      const response = await updateEmbeddingSettings({
        enabled,
        modelFilename,
      })
      embeddingModelEnabled.value = enabled
      embeddingModelFilename.value = modelFilename
      embeddingServerStatus.value = response.status
      error.value = null
    } catch (e) {
      console.error('Failed to save embedding settings:', e)
      error.value = e.message
    }
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    temperature,
    maxTokens,
    topP,
    systemPrompt,
    embeddingModelEnabled,
    embeddingModelFilename,
    embeddingServerStatus,
    sidebarOpen,
    loading,
    error,
    fetchSettings,
    fetchEmbeddingStatus,
    saveSettings,
    saveEmbeddingSettings,
    resetToDefaults,
    toggleSidebar,
  }
})
