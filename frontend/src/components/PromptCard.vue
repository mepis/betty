<script setup>
import { ref } from 'vue'
import { usePromptsStore } from '../stores/prompts'

const props = defineProps({
  prompt: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'edit', 'use', 'duplicate', 'delete'])

const promptsStore = usePromptsStore()
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

function getTypeColor(type) {
  switch (type) {
    case 'system':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'user':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'template':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    default:
      return 'bg-dark-700 text-dark-400 border-dark-600'
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateContent(content, maxLength = 100) {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

async function handleDelete() {
  isDeleting.value = true
  try {
    await promptsStore.deletePrompt(props.prompt.id)
    showDeleteConfirm.value = false
    emit('delete', props.prompt.id)
  } catch (error) {
    console.error('Delete failed:', error)
  } finally {
    isDeleting.value = false
  }
}

async function handleDuplicate() {
  try {
    const newPrompt = await promptsStore.duplicatePrompt(props.prompt.id)
    emit('duplicate', newPrompt)
  } catch (error) {
    console.error('Duplicate failed:', error)
  }
}
</script>

<template>
  <div
    :class="[
      'border rounded-lg p-4 bg-dark-800 transition-colors cursor-pointer',
      selected ? 'border-blue-500 bg-dark-750' : 'border-dark-700 hover:bg-dark-750',
    ]"
    @click="emit('select', prompt)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="text-dark-100 font-medium truncate">{{ prompt.name }}</h3>
        <p v-if="prompt.description" class="text-xs text-dark-400 truncate mt-0.5">
          {{ prompt.description }}
        </p>
      </div>

      <!-- Type Badge -->
      <span :class="['text-xs px-2 py-1 rounded border ml-2 flex-shrink-0', getTypeColor(prompt.type)]">
        {{ prompt.type }}
      </span>
    </div>

    <!-- Content Preview -->
    <div class="bg-dark-900 rounded p-2 mb-3">
      <p class="text-xs text-dark-300 font-mono whitespace-pre-wrap">
        {{ truncateContent(prompt.content) }}
      </p>
    </div>

    <!-- Tags -->
    <div v-if="prompt.tags && prompt.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
      <span
        v-for="tag in prompt.tags"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300"
      >
        {{ tag }}
      </span>
    </div>

    <!-- Metadata -->
    <div class="flex items-center gap-4 text-xs text-dark-400 mb-3">
      <div class="flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{{ formatDate(prompt.updatedAt) }}</span>
      </div>
      <div class="flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{{ prompt.content.length }} chars</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-3 border-t border-dark-700" @click.stop>
      <button
        @click="emit('edit', prompt)"
        class="flex-1 py-1.5 px-3 rounded text-xs font-medium border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-colors"
      >
        Edit
      </button>
      <button
        @click="emit('use', prompt)"
        class="flex-1 py-1.5 px-3 rounded text-xs font-medium border border-blue-600 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors"
      >
        Use
      </button>
      <button
        @click="handleDuplicate"
        class="py-1.5 px-2 rounded text-xs font-medium border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-colors"
        title="Duplicate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <button
        @click="showDeleteConfirm = true"
        class="py-1.5 px-2 rounded text-xs font-medium border border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        title="Delete"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showDeleteConfirm = false"
    >
      <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 max-w-sm mx-4">
        <h3 class="text-lg font-semibold text-dark-100 mb-2">Delete Prompt?</h3>
        <p class="text-dark-300 text-sm mb-6">
          This will delete <strong>{{ prompt.name }}</strong>. This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            @click="showDeleteConfirm = false"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-dark-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleDelete"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
