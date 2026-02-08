<script setup>
import { ref } from 'vue'
import { useDocumentsStore } from '../stores/documents'

const emit = defineEmits(['close', 'success'])

const documentsStore = useDocumentsStore()

const isDragging = ref(false)
const selectedFile = ref(null)
const title = ref('')
const tags = ref('')
const error = ref(null)

const allowedTypes = ['pdf', 'txt', 'md']
const maxFileSize = 10 * 1024 * 1024 // 10MB

function handleDragOver(event) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event) {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer.files
  if (files.length > 0) {
    handleFileSelect(files[0])
  }
}

function handleFileInput(event) {
  const files = event.target.files
  if (files.length > 0) {
    handleFileSelect(files[0])
  }
}

function handleFileSelect(file) {
  error.value = null

  // Validate file type
  const extension = file.name.split('.').pop().toLowerCase()
  if (!allowedTypes.includes(extension)) {
    error.value = `File type .${extension} not allowed. Allowed types: ${allowedTypes.join(', ')}`
    return
  }

  // Validate file size
  if (file.size > maxFileSize) {
    error.value = `File too large. Maximum size: ${maxFileSize / 1024 / 1024}MB`
    return
  }

  selectedFile.value = file
  if (!title.value) {
    title.value = file.name
  }
}

function removeFile() {
  selectedFile.value = null
  error.value = null
}

async function handleUpload() {
  if (!selectedFile.value) {
    error.value = 'Please select a file'
    return
  }

  try {
    const metadata = {
      title: title.value || selectedFile.value.name,
      tags: tags.value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
    }

    await documentsStore.uploadDocument(selectedFile.value, metadata)
    emit('success')
  } catch (err) {
    error.value = err.message || 'Upload failed'
  }
}

function handleClose() {
  emit('close')
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="handleClose">
    <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 max-w-lg w-full">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-dark-100">Upload Document</h3>
        <button
          @click="handleClose"
          class="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Upload Area -->
      <div
        v-if="!selectedFile"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-dark-600 hover:border-dark-500 hover:bg-dark-900/50',
        ]"
        @click="$refs.fileInput.click()"
      >
        <svg class="w-12 h-12 mx-auto mb-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-dark-200 font-medium mb-1">Drop your file here or click to browse</p>
        <p class="text-sm text-dark-400">PDF, TXT, or MD files (max 10MB)</p>

        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.txt,.md"
          @change="handleFileInput"
          class="hidden"
        />
      </div>

      <!-- Selected File -->
      <div v-else class="border border-dark-600 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="flex-shrink-0 w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-dark-100 font-medium truncate">{{ selectedFile.name }}</p>
              <p class="text-sm text-dark-400">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
          </div>
          <button
            @click="removeFile"
            class="flex-shrink-0 p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Metadata Inputs -->
      <div v-if="selectedFile" class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-dark-200 mb-2">Title (optional)</label>
          <input
            v-model="title"
            type="text"
            placeholder="Document title"
            class="w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-dark-200 mb-2">Tags (optional)</label>
          <input
            v-model="tags"
            type="text"
            placeholder="tag1, tag2, tag3"
            class="w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p class="text-xs text-dark-400 mt-1">Separate tags with commas</p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="p-3 rounded-lg bg-red-900/30 border border-red-800 mb-4">
        <p class="text-red-200 text-sm">{{ error }}</p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-end">
        <button
          @click="handleClose"
          class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleUpload"
          :disabled="!selectedFile || documentsStore.isUploading"
          class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <div v-if="documentsStore.isUploading" class="flex gap-1">
            <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
            <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
            <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
          </div>
          <span>{{ documentsStore.isUploading ? 'Uploading...' : 'Upload' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
