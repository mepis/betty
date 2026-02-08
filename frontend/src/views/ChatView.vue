<script setup>
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import Sidebar from '../components/Sidebar.vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'

const chat = useChatStore()

const messagesContainer = ref(null)

watch(
  () => chat.messages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
)

const suggestions = [
  'Explain quantum computing in simple terms',
  'Write a haiku about programming',
  'What are the benefits of TypeScript?',
  'Help me debug a JavaScript error',
]

function sendSuggestion(text) {
  chat.sendMessage(text)
}
</script>

<template>
  <div class="flex h-screen bg-dark-950">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Chat Area -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="flex items-center gap-3 px-4 py-3 border-b border-dark-700 bg-dark-900">
        <h2 class="font-semibold text-dark-100">Chat</h2>
        <span v-if="chat.isLoading" class="text-sm text-dark-400">Generating...</span>
      </header>

      <!-- Messages -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto"
      >
        <!-- Empty State -->
        <div v-if="!chat.hasMessages" class="flex flex-col items-center justify-center h-full p-8">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-6">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-dark-100 mb-2">Start a conversation</h3>
          <p class="text-dark-400 text-center mb-8 max-w-md">
            Ask questions, get help with code, brainstorm ideas, or just chat.
          </p>

          <!-- Suggestions -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              @click="sendSuggestion(suggestion)"
              class="p-4 rounded-xl bg-dark-800 border border-dark-700 text-left hover:bg-dark-700 hover:border-dark-600 transition-colors group"
            >
              <span class="text-sm text-dark-300 group-hover:text-dark-100">{{ suggestion }}</span>
            </button>
          </div>
        </div>

        <!-- Message List -->
        <div v-else class="max-w-4xl mx-auto">
          <ChatMessage
            v-for="message in chat.messages"
            :key="message.id"
            :message="message"
          />

          <!-- Loading indicator -->
          <div v-if="chat.isLoading" class="flex gap-3 px-4 py-3 bg-dark-800/30">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-medium text-white">
              AI
            </div>
            <div class="flex items-center gap-1 py-2">
              <span class="loading-dot w-2 h-2 bg-dark-400 rounded-full"></span>
              <span class="loading-dot w-2 h-2 bg-dark-400 rounded-full"></span>
              <span class="loading-dot w-2 h-2 bg-dark-400 rounded-full"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Banner -->
      <div
        v-if="chat.error"
        class="px-4 py-3 bg-red-900/50 border-t border-red-800 flex items-center justify-between"
      >
        <span class="text-red-200 text-sm">{{ chat.error }}</span>
        <button
          @click="chat.clearError"
          class="text-red-300 hover:text-red-100 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Input -->
      <ChatInput />
    </main>
  </div>
</template>
