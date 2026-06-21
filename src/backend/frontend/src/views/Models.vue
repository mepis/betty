<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'

const store = useBenchmarkStore()
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const searchError = ref('')
const filterGguf = ref(true)
const selectedModel = ref(null)
const modelDetails = ref(null)
const modelFiles = ref([])
const downloading = ref(false)
const downloadProgress = ref(0)
const downloadedFiles = ref([])
const downloadingFile = ref('')
const showDetails = ref(false)
const toast = ref({ show: false, message: '', type: '' }) // type: 'success' | 'error'

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}
const showFilePicker = ref(false)
const filesLoading = ref(false)
const selectedFile = ref('')
const downloadsTab = ref('search') // 'search' | 'downloads'
const loadingDownloads = ref(false)

const modelTypes = computed(() => {
  const types = new Set()
  searchResults.value.forEach(model => {
    if (model.tags) {
      model.tags.forEach(tag => {
        if (tag.includes('gguf') || tag.includes('pytorch') || tag.includes('safetensors') || tag.includes('transformers')) {
          types.add(tag)
        }
      })
    }
  })
  return Array.from(types)
})

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

function formatDownloads(n) {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getLastUpdated(model) {
  return model.lastModified || model.createdAt || null
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  searchError.value = ''
  searchResults.value = []
  showFilePicker.value = false

  try {
    await store.searchHfModels(searchQuery.value.trim(), 20, filterGguf.value ? 'gguf' : null)
    if (store.hfError) {
      searchError.value = store.hfError
      store.hfError = null
    } else {
      searchResults.value = store.hfSearchResults || []
    }
  } catch (e) {
    searchError.value = e.message || 'Search failed'
  }
  searching.value = false
}

async function loadModelDetails(modelId) {
  try {
    // Search results already have all the info we need, so just show the modal
    modelDetails.value = store.hfModelDetails
    showDetails.value = true

    // Always load files for GGUF models (we filter by gguf by default)
    await loadModelFiles(modelId)
  } catch (e) {
    console.error('Failed to load model details:', e)
  }
}

async function loadModelFiles(modelId) {
  filesLoading.value = true
  showFilePicker.value = true
  try {
    await store.fetchHfModelFiles(modelId)
    modelFiles.value = store.hfModelFiles || []
    // Auto-select first GGUF file
    const ggufFile = modelFiles.value.find(f => f.path && f.path.endsWith('.gguf'))
    if (ggufFile) {
      selectedFile.value = ggufFile.path
    } else if (modelFiles.value.length > 0) {
      selectedFile.value = modelFiles.value[0].path
    }
  } catch (e) {
    console.error('Failed to load model files:', e)
    modelFiles.value = []
  } finally {
    filesLoading.value = false
  }
}

async function handleDownload() {
  if (!selectedModel.value || downloading.value) return
  downloading.value = true
  downloadProgress.value = 0
  downloadingFile.value = selectedFile.value || 'auto'

  try {
    await store.downloadHfModel(
      selectedModel.value.id || selectedModel.value.modelId,
      selectedFile.value || undefined,
      (progress, downloaded) => {
        downloadProgress.value = progress
        downloadingFile.value = `${selectedFile.value || 'auto'} (${formatSize(downloaded)})`
      }
    )
    if (store.hfError) {
      showToast(store.hfError, 'error')
      store.hfError = null
    } else {
      showToast('Download complete!', 'success')
    }
  } catch (e) {
    showToast(e.message || 'Download failed', 'error')
  }
  downloading.value = false
}

async function loadDownloads() {
  loadingDownloads.value = true
  try {
    await store.fetchHfDownloads()
    downloadedFiles.value = store.hfDownloads || []
  } catch (e) {
    console.error('Failed to load downloads:', e)
  }
  loadingDownloads.value = false
}

async function handleDeleteDownload(modelId) {
  if (!confirm(`Delete downloaded model "${modelId}"?`)) return
  try {
    await store.deleteHfDownload(modelId)
    downloadedFiles.value = downloadedFiles.value.filter(d => d.modelId !== modelId)
  } catch (e) {
    console.error('Failed to delete download:', e)
  }
}

function getTagColor(tag) {
  if (tag.includes('gguf')) return 'bg-warning-subtle text-warning'
  if (tag.includes('pytorch')) return 'bg-error-subtle text-error'
  if (tag.includes('safetensors')) return 'bg-success-subtle text-success'
  if (tag.includes('transformers')) return 'bg-accent-subtle text-accent'
  return 'bg-bg-tertiary text-text-muted'
}

function getModelIcon(model) {
  const tags = model.tags || []
  if (tags.some(t => t.includes('gguf'))) return '🤖'
  if (tags.some(t => t.includes('pytorch'))) return '🔥'
  if (tags.some(t => t.includes('transformers'))) return '⚡'
  return '📦'
}

onMounted(async () => {
  await loadDownloads()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Tabs -->
    <div class="flex items-center gap-2">
      <button
        @click="downloadsTab = 'search'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="downloadsTab === 'search' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
      >
        <svg class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search Models
      </button>
      <button
        @click="downloadsTab = 'downloads'; loadDownloads()"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="downloadsTab === 'downloads' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
      >
        <svg class="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Downloads
        <span v-if="downloadedFiles.length" class="ml-1 badge bg-bg-tertiary text-text-muted text-xs">{{ downloadedFiles.length }}</span>
      </button>
    </div>

    <!-- Search Tab -->
    <div v-if="downloadsTab === 'search'" class="space-y-6">
      <!-- Search Bar -->
      <div class="card">
        <div class="flex items-center gap-3">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              placeholder="Search GGUF models (e.g., llama, mistral, qwen)..."
              class="input w-full pl-10"
              :disabled="searching"
            />
          </div>
          <label class="flex items-center gap-2 text-xs text-text-muted cursor-pointer whitespace-nowrap select-none">
            <input
              v-model="filterGguf"
              type="checkbox"
              class="checkbox checkbox-sm checkbox-accent"
              :disabled="searching"
            />
            GGUF only
          </label>
          <button
            @click="handleSearch"
            class="btn btn-primary"
            :disabled="searching || !searchQuery.trim()"
          >
            <svg v-if="!searching" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>

      <!-- Search Error -->
      <div v-if="searchError" class="card bg-error-subtle border border-error/20">
        <div class="flex items-center gap-2 text-error text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ searchError }}
        </div>
      </div>

      <!-- Results -->
      <div v-if="searchResults.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="model in searchResults"
          :key="model.id"
          class="card hover:border-accent/30 transition-all cursor-pointer group"
          @click="selectedModel = model; loadModelDetails(model.id || model.modelId)"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl flex-shrink-0">{{ getModelIcon(model) }}</span>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                {{ model.id || model.modelId }}
              </h3>
              <p v-if="model.description" class="text-xs text-text-muted mt-1 line-clamp-2">
                {{ model.description }}
              </p>
              <div class="flex items-center gap-3 mt-2">
                <span class="flex items-center gap-1 text-xs text-text-secondary">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {{ formatDownloads(model.likes || 0) }}
                </span>
                <span class="flex items-center gap-1 text-xs text-text-secondary">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {{ formatDownloads(model.downloads || 0) }}
                </span>
                <span v-if="model.lastModified" class="text-xs text-text-muted">
                  {{ formatDate(model.lastModified) }}
                </span>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="tag in (model.tags || []).slice(0, 3)"
                  :key="tag"
                  class="badge text-xs"
                  :class="getTagColor(tag)"
                >
                  {{ tag }}
                </span>
                <span v-if="(model.tags || []).length > 3" class="badge text-xs bg-bg-tertiary text-text-muted">
                  +{{ (model.tags || []).length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!searching && searchResults.length === 0 && !searchError" class="card flex flex-col items-center justify-center py-16 text-text-muted">
        <svg class="w-12 h-12 mb-4 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p class="text-sm">Search for models on HuggingFace</p>
        <p class="text-xs mt-1">Try: "llama 3", "mistral", "qwen"</p>
      </div>
    </div>

    <!-- Download Tab -->
    <div v-if="downloadsTab === 'downloads'" class="space-y-4">
      <div v-if="loadingDownloads" class="card flex items-center justify-center py-12">
        <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <div v-else-if="downloadedFiles.length === 0" class="card flex flex-col items-center justify-center py-16 text-text-muted">
        <svg class="w-12 h-12 mb-4 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <p class="text-sm">No downloaded models yet</p>
        <p class="text-xs mt-1">Search for models to download GGUF files</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="download in downloadedFiles"
          :key="download.modelId"
          class="card"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-text-primary">{{ download.modelId }}</h3>
              <p class="text-xs text-text-muted mt-0.5">
                {{ download.files.length }} file{{ download.files.length !== 1 ? 's' : '' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="handleDeleteDownload(download.modelId)"
                class="btn btn-ghost btn-xs text-text-muted hover:text-error"
                title="Delete downloaded model"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div class="mt-3 space-y-1">
            <div
              v-for="file in download.files"
              :key="file.name"
              class="flex items-center justify-between text-xs px-3 py-1.5 rounded bg-bg-tertiary/50"
            >
              <span class="text-text-secondary truncate">{{ file.name }}</span>
              <span class="text-text-muted flex-shrink-0 ml-2">{{ formatSize(file.size) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Details Modal -->
    <div
      v-if="selectedModel && (showDetails || downloading)"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="selectedModel = null; showDetails = false; showFilePicker = false; downloading = false" />
      <div class="relative bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] mx-4 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-text-primary truncate">{{ selectedModel.id || selectedModel.modelId }}</h3>
            <p class="text-xs text-text-muted mt-0.5">HuggingFace Model</p>
          </div>
          <button
            @click="selectedModel = null; showDetails = false; showFilePicker = false; downloading = false"
            class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all flex-shrink-0"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="overflow-auto flex-1 p-6">
          <!-- Model Info (from search results) -->
          <div class="space-y-4">
            <p v-if="selectedModel.description" class="text-sm text-text-secondary leading-relaxed">
              {{ selectedModel.description }}
            </p>

            <div class="grid grid-cols-3 gap-3">
              <div class="bg-bg-tertiary rounded-lg p-3">
                <div class="text-xs text-text-muted mb-1">Downloads</div>
                <div class="text-sm font-mono font-medium text-text-primary">{{ formatDownloads(selectedModel.downloads || 0) }}</div>
              </div>
              <div class="bg-bg-tertiary rounded-lg p-3">
                <div class="text-xs text-text-muted mb-1">Likes</div>
                <div class="text-sm font-mono font-medium text-text-primary">{{ formatDownloads(selectedModel.likes || 0) }}</div>
              </div>
              <div class="bg-bg-tertiary rounded-lg p-3">
                <div class="text-xs text-text-muted mb-1">Last Updated</div>
                <div class="text-sm font-mono font-medium text-text-primary">{{ formatDate(getLastUpdated(selectedModel)) }}</div>
              </div>
            </div>

            <!-- Tags -->
            <div v-if="selectedModel.tags?.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in selectedModel.tags"
                :key="tag"
                class="badge text-xs"
                :class="getTagColor(tag)"
              >
                {{ tag }}
              </span>
            </div>

            <!-- Pipeline Tag -->
            <div v-if="selectedModel.pipeline_tag" class="text-xs text-text-muted">
              Pipeline: <span class="text-text-secondary font-medium">{{ selectedModel.pipeline_tag }}</span>
            </div>

            <!-- HuggingFace Link -->
            <a
              :href="`https://huggingface.co/${selectedModel.id || selectedModel.modelId}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on HuggingFace
            </a>
          </div>

          <!-- File Picker (GGUF files) -->
          <div v-if="showFilePicker" class="mt-4 space-y-3">
            <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              GGUF Files
            </h4>

            <div v-if="filesLoading" class="flex items-center justify-center py-6">
              <svg class="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <div v-else-if="modelFiles.length === 0" class="text-xs text-text-muted py-4 text-center">
              No GGUF files found for this model
            </div>

            <div v-else class="max-h-48 overflow-auto border border-border rounded-lg">
              <div
                v-for="file in modelFiles.filter(f => f.path && f.path.endsWith('.gguf'))"
                :key="file.path"
                @click="selectedFile = file.path"
                class="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
                :class="selectedFile === file.path ? 'bg-accent-subtle' : 'hover:bg-bg-tertiary'"
              >
                <span class="text-xs font-mono text-text-secondary truncate">{{ file.path }}</span>
                <span v-if="file.size" class="text-xs text-text-muted flex-shrink-0 ml-2">{{ formatSize(file.size) }}</span>
              </div>
            </div>
          </div>

          <!-- Download Progress -->
          <div v-if="downloading" class="mt-4 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-muted">Downloading: {{ downloadingFile }}</span>
              <span class="font-mono text-text-secondary">{{ downloadProgress }}%</span>
            </div>
            <div class="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300 bg-accent"
                :style="{ width: downloadProgress + '%' }"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <button
            @click="selectedModel = null; showDetails = false; showFilePicker = false; downloading = false"
            class="btn btn-ghost btn-sm"
            :disabled="downloading"
          >
            Close
          </button>
          <button
            v-if="!downloading && modelFiles.length > 0 && selectedFile"
            @click="handleDownload"
            class="btn btn-primary btn-sm"
          >
            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download {{ selectedFile.split('/').pop() }}
          </button>
          <button
            v-if="downloading"
            class="btn btn-primary btn-sm"
            disabled
          >
            Downloading... {{ downloadProgress }}%
          </button>
        </div>

      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" class="fixed bottom-6 right-6 z-[100] max-w-sm">
        <div
          class="rounded-lg p-4 shadow-lg border flex items-center gap-3"
          :class="toast.type === 'success' ? 'bg-success-subtle border-success/30 text-success' : 'bg-error-subtle border-error/30 text-error'"
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
