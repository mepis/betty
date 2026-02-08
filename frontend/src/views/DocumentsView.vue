<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDocumentsStore } from '../stores/documents'
import Sidebar from '../components/Sidebar.vue'
import DocumentUpload from '../components/DocumentUpload.vue'
import DocumentCard from '../components/DocumentCard.vue'
import GoogleDriveImport from '../components/GoogleDriveImport.vue'

const route = useRoute()
const documentsStore = useDocumentsStore()
const showUploadDialog = ref(false)
const showGoogleDriveImport = ref(false)
const showImportMenu = ref(false)
const searchInput = ref('')

onMounted(async () => {
  try {
    await documentsStore.fetchDocuments()
  } catch (error) {
    console.error('Failed to fetch documents:', error)
  }

  // Check for Google Drive callback parameters
  const urlParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '')

  if (urlParams.get('google_drive_connected') === 'true' || hashParams.get('google_drive_connected') === 'true') {
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0])
    // Open Google Drive import dialog
    showGoogleDriveImport.value = true
  }

  const driveError = urlParams.get('google_drive_error') || hashParams.get('google_drive_error')
  if (driveError) {
    documentsStore.setError(`Google Drive connection failed: ${driveError}`)
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0])
  }
})

function handleSearch() {
  documentsStore.setSearchQuery(searchInput.value)
}

function openUploadDialog() {
  // Clear any existing errors before opening upload dialog
  documentsStore.clearError()
  showUploadDialog.value = true
}

function closeUploadDialog() {
  showUploadDialog.value = false
}

async function handleUploadSuccess() {
  showUploadDialog.value = false
  // Refresh the documents list to ensure it's in sync with the server
  try {
    await documentsStore.fetchDocuments()
  } catch (error) {
    console.error('Failed to refresh documents:', error)
  }
}

function openGoogleDriveImport() {
  showImportMenu.value = false
  showGoogleDriveImport.value = true
}

function closeGoogleDriveImport() {
  showGoogleDriveImport.value = false
}

async function handleGoogleDriveImported(result) {
  // Refresh the documents list
  try {
    await documentsStore.fetchDocuments()
  } catch (error) {
    console.error('Failed to refresh documents:', error)
  }
}

function toggleImportMenu() {
  showImportMenu.value = !showImportMenu.value
}

function closeImportMenu() {
  showImportMenu.value = false
}
</script>

<template>
  <div class="flex h-screen bg-dark-950">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Area -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-900">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div>
            <h2 class="text-lg font-semibold text-dark-100">Knowledge Base</h2>
            <p class="text-xs text-dark-400">{{ documentsStore.totalDocuments }} documents</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="openUploadDialog"
            class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </button>

          <!-- Import Dropdown -->
          <div class="relative">
            <button
              @click="toggleImportMenu"
              class="px-3 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors flex items-center gap-1"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showImportMenu"
              class="absolute right-0 mt-2 w-56 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-10"
            >
              <button
                @click="openGoogleDriveImport"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-dark-200 hover:bg-dark-700 transition-colors rounded-lg"
              >
                <svg class="w-5 h-5 text-dark-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C8.83 0 5.98 1.63 4.25 4.16L1.5 0H0l4.5 7.8-4.5 7.8h1.5l2.75-4.16C5.98 14.37 8.83 16 12 16s6.02-1.63 7.75-4.16l2.75 4.16H24l-4.5-7.8L24 0h-1.5l-2.75 4.16C18.02 1.63 15.17 0 12 0zm0 2c2.65 0 5.05 1.23 6.63 3.16L12 14.88 5.37 5.16C6.95 3.23 9.35 2 12 2z"/>
                </svg>
                <div class="text-left">
                  <div>Google Drive</div>
                  <div class="text-xs text-dark-500">Import from Drive or Shared Drives</div>
                </div>
              </button>
            </div>

            <!-- Click outside to close -->
            <div v-if="showImportMenu" class="fixed inset-0 z-0" @click="closeImportMenu"></div>
          </div>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-6xl mx-auto space-y-6">
          <!-- Search Bar -->
          <div class="flex items-center gap-3">
            <div class="flex-1 relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchInput"
                @input="handleSearch"
                type="text"
                placeholder="Search documents..."
                class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-800 border border-dark-600 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="documentsStore.error" class="p-4 rounded-lg bg-red-900/30 border border-red-800 flex items-start justify-between">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-red-200 text-sm">{{ documentsStore.error }}</span>
            </div>
            <button @click="documentsStore.clearError" class="text-red-300 hover:text-red-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Empty State -->
          <div v-if="!documentsStore.hasDocuments" class="flex flex-col items-center justify-center py-16">
            <div class="w-20 h-20 rounded-2xl bg-dark-800 flex items-center justify-center mb-6">
              <svg class="w-10 h-10 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-dark-100 mb-2">No documents yet</h3>
            <p class="text-dark-400 text-center mb-6 max-w-md">
              Upload PDF, TXT, or MD files to build your knowledge base for RAG-enhanced chat.
            </p>
            <button
              @click="openUploadDialog"
              class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Upload Your First Document
            </button>
          </div>

          <!-- Documents Grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DocumentCard
              v-for="document in documentsStore.filteredDocuments"
              :key="document.id"
              :document="document"
            />
          </div>

          <!-- No Search Results -->
          <div v-if="documentsStore.hasDocuments && documentsStore.filteredDocuments.length === 0" class="flex flex-col items-center justify-center py-16">
            <svg class="w-16 h-16 text-dark-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 class="text-lg font-semibold text-dark-100 mb-2">No documents found</h3>
            <p class="text-dark-400 text-center">Try a different search query</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Upload Dialog -->
    <DocumentUpload
      v-if="showUploadDialog"
      @close="closeUploadDialog"
      @success="handleUploadSuccess"
    />

    <!-- Google Drive Import Dialog -->
    <GoogleDriveImport
      v-if="showGoogleDriveImport"
      @close="closeGoogleDriveImport"
      @imported="handleGoogleDriveImported"
    />
  </div>
</template>
