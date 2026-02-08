<script setup>
import { computed, ref } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const copied = ref(false)

const isUser = computed(() => props.message.role === 'user')

const formattedContent = computed(() => {
  if (isUser.value) {
    return props.message.content
  }
  return marked.parse(props.message.content, { breaks: true })
})

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}
</script>

<template>
  <div
    class="message-enter flex gap-3 px-4 py-3"
    :class="isUser ? 'bg-dark-900/50' : 'bg-dark-800/30'"
  >
    <!-- Avatar -->
    <div
      class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
      :class="isUser ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'"
    >
      {{ isUser ? 'U' : 'AI' }}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="font-medium text-sm" :class="isUser ? 'text-blue-400' : 'text-emerald-400'">
          {{ isUser ? 'You' : 'Assistant' }}
        </span>
        <span class="text-xs text-dark-500">{{ formattedTime }}</span>
      </div>

      <div
        v-if="isUser"
        class="text-dark-200 whitespace-pre-wrap break-words"
      >
        {{ formattedContent }}
      </div>
      <div
        v-else
        class="prose-dark text-dark-200 break-words"
        v-html="formattedContent"
      />
    </div>

    <!-- Copy button -->
    <button
      @click="copyContent"
      class="flex-shrink-0 p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
      :title="copied ? 'Copied!' : 'Copy message'"
    >
      <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <svg v-else class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </button>
  </div>
</template>
