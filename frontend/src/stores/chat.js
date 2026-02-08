import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getChatCompletion } from '../api/llama'
import { useSettingsStore } from './settings'

export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const settingsStore = useSettingsStore()

  const hasMessages = computed(() => messages.value.length > 0)

  function addMessage(role, content) {
    messages.value.push({
      id: Date.now() + Math.random(),
      role,
      content,
      timestamp: new Date().toISOString(),
    })
  }

  async function sendMessage(content) {
    if (!content.trim() || isLoading.value) return

    error.value = null
    addMessage('user', content)
    isLoading.value = true

    try {
      const apiMessages = []

      if (settingsStore.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: settingsStore.systemPrompt,
        })
      }

      messages.value.forEach(msg => {
        apiMessages.push({
          role: msg.role,
          content: msg.content,
        })
      })

      const response = await getChatCompletion(apiMessages, {
        temperature: settingsStore.temperature,
        maxTokens: settingsStore.maxTokens,
        topP: settingsStore.topP,
      })

      const assistantMessage = response.choices?.[0]?.message?.content
      if (assistantMessage) {
        addMessage('assistant', assistantMessage)
      } else {
        throw new Error('No response from model')
      }
    } catch (e) {
      error.value = e.message || 'Failed to send message'
      console.error('Chat error:', e)
    } finally {
      isLoading.value = false
    }
  }

  function clearChat() {
    messages.value = []
    error.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    messages,
    isLoading,
    error,
    hasMessages,
    sendMessage,
    clearChat,
    clearError,
  }
})
