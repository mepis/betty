<script setup>
import { ref } from 'vue'
import { useDocumentsStore } from '../stores/documents'

const props = defineProps({
  document: {
    type: Object,
    required: true,
  },
})

const documentsStore = useDocumentsStore()
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

function getFileIcon(type) {
  switch (type) {
    case 'pdf':
      return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    case 'txt':
      return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    case 'md':
      return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    default:
      return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'ready':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'processing':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'error':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-dark-700 text-dark-400 border-dark-600'
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function handleDelete() {
  isDeleting.value = true
  try {
    await documentsStore.deleteDocument(props.document.id)
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('Delete failed:', error)
  } finally {
    isDeleting.value = false
  }
}

async function handleReprocess() {
  try {
    await documentsStore.reprocessDocument(props.document.id)
  } catch (error) {
    console.error('Reprocess failed:', error)
  }
}
</script>

<template>
  <div class="border border-dark-700 rounded-lg p-4 bg-dark-800 hover:bg-dark-750 transition-colors">
    <!-- File Icon & Type -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getFileIcon(document.type)" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-dark-100 font-medium truncate">{{ document.metadata.title || document.filename }}</h3>
          <p class="text-xs text-dark-400 uppercase">{{ document.type }}</p>
        </div>
      </div>

      <!-- Status Badge -->
      <span :class="['text-xs px-2 py-1 rounded border', getStatusColor(document.status)]">
        {{ document.status }}
      </span>
    </div>

    <!-- Metadata -->
    <div class="space-y-2 mb-4">
      <div class="flex items-center gap-2 text-xs text-dark-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{{ document.chunkCount }} chunks</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-dark-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
        <span>{{ formatFileSize(document.size) }}</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-dark-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{{ formatDate(document.uploadedAt) }}</span>
      </div>
    </div>

    <!-- Tags -->
    <div v-if="document.metadata.tags && document.metadata.tags.length > 0" class="flex flex-wrap gap-1 mb-4">
      <span
        v-for="tag in document.metadata.tags"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300"
      >
        {{ tag }}
      </span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-3 border-t border-dark-700">
      <button
        v-if="document.status === 'ready'"
        @click="handleReprocess"
        :disabled="documentsStore.isProcessing[document.id]"
        class="flex-1 py-1.5 px-3 rounded text-xs font-medium border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-dark-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ documentsStore.isProcessing[document.id] ? 'Processing...' : 'Reprocess' }}
      </button>

      <button
        v-if="document.status === 'processing'"
        disabled
        class="flex-1 py-1.5 px-3 rounded text-xs font-medium border border-blue-600 text-blue-400 cursor-not-allowed flex items-center justify-center gap-1"
      >
        <div class="flex gap-0.5">
          <span class="loading-dot w-1 h-1 bg-blue-400 rounded-full"></span>
          <span class="loading-dot w-1 h-1 bg-blue-400 rounded-full"></span>
          <span class="loading-dot w-1 h-1 bg-blue-400 rounded-full"></span>
        </div>
        Processing
      </button>

      <button
        @click="showDeleteConfirm = true"
        class="py-1.5 px-3 rounded text-xs font-medium border border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
      >
        Delete
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showDeleteConfirm = false"
    >
      <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 max-w-sm mx-4">
        <h3 class="text-lg font-semibold text-dark-100 mb-2">Delete Document?</h3>
        <p class="text-dark-300 text-sm mb-6">
          This will delete <strong>{{ document.filename }}</strong> and all its chunks and embeddings. This action cannot be undone.
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
