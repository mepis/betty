<script setup>
import { ref, onMounted } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'

const store = useBenchmarkStore()
const templateUrl = ref('')
const templateFilename = ref('')
const downloading = ref(false)
const downloadProgress = ref(0)
const downloadError = ref('')
const toast = ref({ show: false, message: '', type: '' })

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleDownload() {
  if (!templateUrl.value.trim() || downloading.value) return
  downloading.value = true
  downloadProgress.value = 0
  downloadError.value = ''

  try {
    const result = await store.downloadMmproj(
      templateUrl.value.trim(),
      templateFilename.value.trim() || undefined,
      (progress, downloaded, filename, alreadyExists) => {
        downloadProgress.value = progress
        if (filename) {
          if (alreadyExists) {
            showToast(`${filename} already exists`, 'info')
          } else {
            showToast(`Downloaded ${filename}`, 'success')
          }
          templateUrl.value = ''
          templateFilename.value = ''
          store.fetchMmprojModels()
        }
      }
    )

    if (!result && store.mmprojDownloadError) {
      downloadError.value = store.mmprojDownloadError
      showToast(store.mmprojDownloadError, 'error')
    }
  } catch (e) {
    downloadError.value = e.message || 'Download failed'
    showToast(e.message || 'Download failed', 'error')
  }
  downloading.value = false
  downloadProgress.value = 0
}

async function handleDelete(filename) {
  if (!confirm(`Delete "${filename}"?`)) return
  try {
    const result = await store.deleteMmproj(filename)
    if (result) {
      showToast(`Deleted ${filename}`, 'success')
    } else {
      showToast(store.mmprojDownloadError || 'Delete failed', 'error')
    }
  } catch (e) {
    showToast(e.message || 'Delete failed', 'error')
  }
}

onMounted(async () => {
  await store.fetchMmprojModels()
})
</script>

<template>
  <div class="m-2 space-y-6">
    <!-- Download Form -->
    <div class="card">
      <h3 class="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download mmproj Model
      </h3>
      <div class="flex items-center gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <input
            v-model="templateUrl"
            placeholder="Model URL (e.g., https://huggingface.co/.../mmproj.gguf)..."
            class="input w-full pl-10"
            :disabled="downloading"
          />
        </div>
        <input
          v-model="templateFilename"
          placeholder="Filename (optional)"
          class="input w-48"
          :disabled="downloading"
        />
        <button
          @click="handleDownload"
          class="btn btn-primary"
          :disabled="downloading || !templateUrl.trim()"
        >
          <svg v-if="!downloading" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ downloading ? 'Downloading...' : 'Download' }}
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="downloading" class="mt-3 space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-text-muted">Downloading mmproj model...</span>
          <span class="font-mono text-text-secondary">{{ downloadProgress }}%</span>
        </div>
        <div class="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 bg-accent"
            :style="{ width: downloadProgress + '%' }"
          />
        </div>
      </div>

      <!-- Error -->
      <div v-if="downloadError" class="mt-3 flex items-center gap-2 text-error text-xs">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ downloadError }}
      </div>
    </div>

    <!-- mmproj Models List -->
    <div class="space-y-3">
      <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        MMPROJ Models
        <span v-if="store.mmprojModels.length" class="badge bg-bg-tertiary text-text-muted text-xs">{{ store.mmprojModels.length }}</span>
      </h3>

      <!-- Empty State -->
      <div v-if="store.mmprojModels.length === 0" class="card flex flex-col items-center justify-center py-16 text-text-muted">
        <svg class="w-12 h-12 mb-4 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p class="text-sm">No mmproj models found</p>
        <p class="text-xs mt-1">Download mmproj models using the form above</p>
      </div>

      <!-- Model Cards -->
      <div
        v-for="model in store.mmprojModels"
        :key="model.filename"
        class="card"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-text-primary truncate">{{ model.filename }}</h4>
            <div class="flex items-center gap-3 mt-1">
              <span class="flex items-center gap-1 text-xs text-text-secondary">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {{ formatSize(model.size) }}
              </span>
              <span class="flex items-center gap-1 text-xs text-text-muted">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatDate(model.modified) }}
              </span>
            </div>
          </div>
          <button
            @click="handleDelete(model.filename)"
            class="btn btn-ghost btn-xs text-text-muted hover:text-error"
            title="Delete model"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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
