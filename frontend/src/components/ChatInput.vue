<script setup>
import { ref, computed } from 'vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

const input = ref('')
const textareaRef = ref(null)

const canSend = computed(() => input.value.trim() && !chatStore.isLoading)

function handleSubmit() {
  if (!canSend.value) return
  chatStore.sendMessage(input.value)
  input.value = ''
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

function autoResize(e) {
  const textarea = e.target
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
}
</script>

<template>
  <div class="border-t border-dark-700 bg-dark-900 p-4">
    <div class="max-w-4xl mx-auto">
      <div class="relative flex items-end gap-2">
        <textarea
          ref="textareaRef"
          v-model="input"
          @keydown="handleKeydown"
          @input="autoResize"
          :disabled="chatStore.isLoading"
          placeholder="Send a message..."
          rows="1"
          class="flex-1 resize-none rounded-xl bg-dark-800 border border-dark-600 px-4 py-3 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          @click="handleSubmit"
          :disabled="!canSend"
          class="flex-shrink-0 p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors"
        >
          <svg v-if="!chatStore.isLoading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <div v-else class="flex gap-1">
            <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
            <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
            <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
          </div>
        </button>
      </div>
      <p class="mt-2 text-xs text-dark-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  </div>
</template>
