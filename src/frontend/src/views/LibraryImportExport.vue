<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const API_BASE = import.meta.env.VITE_API_URL || ''

const auth = useAuthStore()

// Export state
const exporting = ref(false)
const exportError = ref('')

// Import state
const importing = ref(false)
const importFile = ref(null)
const importProgress = ref(0)
const importProgressText = ref('')
const importStatus = ref('')
const importError = ref('')
const toast = ref({ show: false, message: '', type: '' })

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}

function formatProgressText(extracted, total) {
  if (total) return `${extracted}/${total} files`
  return `${extracted} files`
}

async function handleExport() {
  exporting.value = true
  exportError.value = ''

  try {
    const token = auth.token || localStorage.getItem('betty-token')
    const response = await fetch(`${API_BASE}/api/library/export`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `Export failed (${response.status})`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'betty-library-export.tar.gz'
    a.click()
    URL.revokeObjectURL(url)

    showToast('Library exported successfully', 'success')
  } catch (e) {
    exportError.value = e.message || 'Export failed'
    showToast(e.message || 'Export failed', 'error')
  } finally {
    exporting.value = false
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    importFile.value = file
    importStatus.value = ''
    importError.value = ''
    importProgress.value = 0
  }
}

async function handleImport() {
  if (!importFile.value || importing.value) return

  importing.value = true
  importProgress.value = 0
  importProgressText.value = ''
  importStatus.value = 'Extracting...'
  importError.value = ''

  try {
    const token = auth.token || localStorage.getItem('betty-token')
    const formData = new FormData()
    formData.append('archive', importFile.value)

    const response = await fetch(`${API_BASE}/api/library/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `Import failed (${response.status})`)
    }

    // Read SSE response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''

      for (const eventBlock of parts) {
        const eventLines = eventBlock.split('\n')
        let currentEvent = ''
        let currentData = ''

        for (const line of eventLines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice('event: '.length)
          } else if (line.startsWith('data: ')) {
            currentData = line.slice('data: '.length)
          }
        }

        if (currentEvent === 'library-import' && currentData) {
          if (currentData.startsWith('PROGRESS:')) {
            const payload = currentData.slice('PROGRESS:'.length)
            const [progress, progressText] = payload.split(':')
            importProgress.value = parseInt(progress, 10)
            importProgressText.value = progressText || ''
          } else if (currentData.startsWith('COMPLETE:')) {
            const msg = currentData.slice('COMPLETE:'.length)
            importStatus.value = `Import complete — ${msg}`
            importProgress.value = 100
            importProgressText.value = ''
            showToast('Library imported successfully', 'success')
          } else if (currentData.startsWith('ERROR:')) {
            const errMsg = currentData.slice('ERROR:'.length)
            importError.value = errMsg
            importStatus.value = ''
            throw new Error(errMsg)
          }
        }
      }
    }
  } catch (e) {
    importError.value = e.message || 'Import failed'
    importStatus.value = ''
    showToast(e.message || 'Import failed', 'error')
  } finally {
    importing.value = false
    // Only clear the file on success, so the user can retry on failure
    if (!importError.value) {
      importFile.value = null
      const fileInput = document.getElementById('library-import-file')
      if (fileInput) fileInput.value = ''
    }
  }
}
</script>

<template>
  <div class="m-2 space-y-6">
    <!-- Export Section -->
    <div class="card">
      <h3 class="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Library
      </h3>
      <p class="text-xs text-text-muted mb-3">
        Compress the entire library (~/.betty/library/) into a tar.gz archive for backup or transfer.
      </p>
      <div class="flex items-center gap-3">
        <button
          @click="handleExport"
          class="btn btn-primary"
          :disabled="exporting"
        >
          <svg v-if="!exporting" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ exporting ? 'Exporting...' : 'Export Library' }}
        </button>
      </div>

      <!-- Export Error -->
      <div v-if="exportError" class="mt-3 flex items-center gap-2 text-error text-xs">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ exportError }}
      </div>
    </div>

    <!-- Import Section -->
    <div class="card">
      <h3 class="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
        </svg>
        Import Library
      </h3>
      <div class="bg-warning-subtle border border-warning/30 text-warning text-xs rounded-md p-3 mb-3 flex items-start gap-2">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Importing will <strong>overwrite</strong> existing files with the same name. Export your library first if you want to keep a backup.</span>
      </div>
      <p class="text-xs text-text-muted mb-3">
        Restore library contents from a tar.gz archive previously exported from Betty.
      </p>
      <div class="flex items-center gap-3">
        <label class="btn btn-ghost cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Choose File
          <input
            id="library-import-file"
            type="file"
            accept=".tar.gz,.tgz"
            @change="handleFileSelect"
            class="hidden"
            :disabled="importing"
          />
        </label>
        <span v-if="importFile" class="text-xs text-text-secondary truncate max-w-xs">
          {{ importFile.name }} ({{ (importFile.size / 1024 / 1024).toFixed(1) }} MB)
        </span>
        <button
          @click="handleImport"
          class="btn btn-primary"
          :disabled="importing || !importFile"
        >
          <svg v-if="!importing" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ importing ? 'Importing...' : 'Import' }}
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="importing" class="mt-3 space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-text-muted">{{ importStatus || 'Importing...' }} {{ importProgressText }}</span>
          <span class="font-mono text-text-secondary">{{ importProgress }}%</span>
        </div>
        <div class="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 bg-accent"
            :style="{ width: importProgress + '%' }"
          />
        </div>
      </div>

      <!-- Import Status -->
      <div v-if="importStatus && !importing" class="mt-3 flex items-center gap-2 text-success text-xs">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ importStatus }}
      </div>

      <!-- Import Error -->
      <div v-if="importError" class="mt-3 flex items-center gap-2 text-error text-xs">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ importError }}
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" class="fixed bottom-6 right-6 z-[100] max-w-sm">
        <div
          class="rounded-lg p-4 shadow-lg border flex items-center gap-3"
          :class="toast.type === 'success' ? 'bg-success-subtle border-success/30 text-success' : toast.type === 'info' ? 'bg-bg-tertiary border-border text-text-secondary' : 'bg-error-subtle border-error/30 text-error'"
        >
          <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm">{{ toast.message }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
