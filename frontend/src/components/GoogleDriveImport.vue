<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-dark-800 rounded-lg border border-dark-700 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-dark-700">
        <h2 class="text-lg font-semibold text-dark-100">Import from Google Drive</h2>
        <button
          @click="$emit('close')"
          class="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <!-- Loading State -->
        <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
          <div class="text-dark-400">Loading...</div>
        </div>

        <!-- Not Configured State (Admin only) -->
        <div v-else-if="!status.configured && isAdmin" class="p-6 space-y-4">
          <div class="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <p class="text-yellow-400 text-sm">
              Google Drive integration needs to be configured. Please enter your Google API credentials below.
            </p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-dark-200 mb-1">Client ID</label>
              <input
                v-model="credentials.clientId"
                type="text"
                class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                placeholder="your-client-id.apps.googleusercontent.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-200 mb-1">Client Secret</label>
              <input
                v-model="credentials.clientSecret"
                type="password"
                class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                placeholder="Client secret"
              />
            </div>
            <p class="text-xs text-dark-500">
              Create credentials in the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-blue-400 hover:underline">Google Cloud Console</a>.
              Enable the Google Drive API and set the redirect URI to your callback URL.
            </p>
          </div>

          <button
            @click="saveCredentials"
            :disabled="!credentials.clientId || !credentials.clientSecret || savingCredentials"
            class="w-full py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            {{ savingCredentials ? 'Saving...' : 'Save Credentials' }}
          </button>
        </div>

        <!-- Not Configured State (Non-admin) -->
        <div v-else-if="!status.configured" class="p-6">
          <div class="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <p class="text-yellow-400 text-sm">
              Google Drive integration is not configured. Please contact an administrator to set it up.
            </p>
          </div>
        </div>

        <!-- Not Connected State -->
        <div v-else-if="!status.connected" class="p-6 text-center space-y-4">
          <div class="w-16 h-16 mx-auto bg-dark-700 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-dark-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.83 0 5.98 1.63 4.25 4.16L1.5 0H0l4.5 7.8-4.5 7.8h1.5l2.75-4.16C5.98 14.37 8.83 16 12 16s6.02-1.63 7.75-4.16l2.75 4.16H24l-4.5-7.8L24 0h-1.5l-2.75 4.16C18.02 1.63 15.17 0 12 0zm0 2c2.65 0 5.05 1.23 6.63 3.16L12 14.88 5.37 5.16C6.95 3.23 9.35 2 12 2z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium text-dark-100">Connect to Google Drive</h3>
            <p class="text-sm text-dark-400 mt-1">
              Sign in with your Google account to import documents from your Drive or shared drives.
            </p>
          </div>
          <button
            @click="connectGoogleDrive"
            :disabled="connecting"
            class="py-2.5 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            {{ connecting ? 'Connecting...' : 'Connect Google Drive' }}
          </button>
        </div>

        <!-- Connected - File Browser -->
        <div v-else class="flex-1 flex flex-col overflow-hidden">
          <!-- Drive Selector & Breadcrumb -->
          <div class="p-3 border-b border-dark-700 space-y-2">
            <!-- Drive Type Tabs -->
            <div class="flex gap-2">
              <button
                @click="switchDrive('personal')"
                :class="currentDriveType === 'personal' ? 'bg-blue-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'"
                class="px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                My Drive
              </button>
              <button
                @click="switchDrive('shared')"
                :class="currentDriveType === 'shared' ? 'bg-blue-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'"
                class="px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                Shared Drives
              </button>
            </div>

            <!-- Shared Drive Selector -->
            <div v-if="currentDriveType === 'shared' && sharedDrives.length > 0" class="flex gap-2">
              <select
                v-model="selectedSharedDrive"
                @change="loadSharedDriveRoot"
                class="flex-1 rounded-lg bg-dark-700 border border-dark-600 px-3 py-1.5 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
              >
                <option :value="null" disabled>Select a shared drive...</option>
                <option v-for="drive in sharedDrives" :key="drive.id" :value="drive.id">
                  {{ drive.name }}
                </option>
              </select>
            </div>

            <!-- Breadcrumb -->
            <div class="flex items-center gap-1 text-sm overflow-x-auto">
              <button
                v-for="(folder, index) in currentPath"
                :key="folder.id"
                @click="navigateToFolder(folder.id, index)"
                class="text-dark-400 hover:text-dark-200 transition-colors whitespace-nowrap"
              >
                {{ folder.name }}
                <span v-if="index < currentPath.length - 1" class="mx-1 text-dark-600">/</span>
              </button>
            </div>
          </div>

          <!-- File List -->
          <div class="flex-1 overflow-y-auto p-2">
            <div v-if="loadingFiles" class="flex items-center justify-center py-8">
              <div class="text-dark-400">Loading files...</div>
            </div>

            <div v-else-if="files.length === 0" class="flex items-center justify-center py-8">
              <div class="text-dark-400">No supported files in this folder</div>
            </div>

            <div v-else class="space-y-1">
              <div
                v-for="file in files"
                :key="file.id"
                @click="file.isFolder ? navigateIntoFolder(file) : toggleFileSelection(file)"
                :class="[
                  'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                  selectedFiles.has(file.id) ? 'bg-blue-600/20 border border-blue-500' : 'hover:bg-dark-700 border border-transparent'
                ]"
              >
                <!-- Icon -->
                <div class="w-8 h-8 flex items-center justify-center">
                  <svg v-if="file.isFolder" class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                  </svg>
                  <svg v-else-if="file.type === 'pdf'" class="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-1v1.5H7V13h1.5zm1 1H8v2h1.5v-2zm2 3.5h2c.55 0 1-.45 1-1V14c0-.55-.45-1-1-1h-2v4.5zm1-3.5h1v2h-1v-2zm4.5-1H15V18h1v-1.5h.5c.55 0 1-.45 1-1V14c0-.55-.45-1-1-1zm0 2.5h-.5v-1.5h.5v1.5z"/>
                  </svg>
                  <svg v-else class="w-6 h-6 text-dark-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
                  </svg>
                </div>

                <!-- Name & Info -->
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-dark-200 truncate">{{ file.name }}</div>
                  <div v-if="!file.isFolder" class="text-xs text-dark-500">
                    {{ formatSize(file.size) }}
                  </div>
                </div>

                <!-- Selection Indicator -->
                <div v-if="!file.isFolder" class="w-5 h-5">
                  <div
                    :class="selectedFiles.has(file.id) ? 'bg-blue-500' : 'border border-dark-600'"
                    class="w-5 h-5 rounded flex items-center justify-center"
                  >
                    <svg v-if="selectedFiles.has(file.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tags Input -->
          <div class="p-3 border-t border-dark-700">
            <label class="block text-sm font-medium text-dark-200 mb-1">Tags (optional)</label>
            <input
              v-model="importTags"
              type="text"
              class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
              placeholder="Comma-separated tags..."
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="status.connected" class="p-4 border-t border-dark-700 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="disconnect"
            class="text-sm text-dark-400 hover:text-dark-200 transition-colors"
          >
            Disconnect
          </button>
          <span v-if="selectedFiles.size > 0" class="text-sm text-dark-400">
            {{ selectedFiles.size }} file{{ selectedFiles.size > 1 ? 's' : '' }} selected
          </span>
        </div>
        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            @click="importSelected"
            :disabled="selectedFiles.size === 0 || importing"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            {{ importing ? 'Importing...' : `Import ${selectedFiles.size > 0 ? selectedFiles.size + ' Files' : ''}` }}
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="p-3 bg-red-900/20 border-t border-red-800">
        <p class="text-red-400 text-sm">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import * as api from '../api/llama'

const emit = defineEmits(['close', 'imported'])

const auth = useAuthStore()
const isAdmin = computed(() => auth.isAdmin)

// State
const loading = ref(true)
const error = ref(null)
const status = reactive({ configured: false, connected: false })

// Credentials (admin only)
const credentials = reactive({ clientId: '', clientSecret: '' })
const savingCredentials = ref(false)

// Connection
const connecting = ref(false)

// File browser
const currentDriveType = ref('personal') // 'personal' or 'shared'
const sharedDrives = ref([])
const selectedSharedDrive = ref(null)
const currentFolderId = ref('root')
const currentPath = ref([{ id: 'root', name: 'My Drive' }])
const files = ref([])
const loadingFiles = ref(false)
const selectedFiles = reactive(new Map())

// Import
const importTags = ref('')
const importing = ref(false)

// Helpers
function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Load status on mount
onMounted(async () => {
  await loadStatus()
})

async function loadStatus() {
  loading.value = true
  error.value = null
  try {
    const data = await api.getGoogleDriveStatus()
    status.configured = data.configured
    status.connected = data.connected

    if (status.connected) {
      await loadSharedDrives()
      await loadFiles()
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function saveCredentials() {
  savingCredentials.value = true
  error.value = null
  try {
    await api.configureGoogleDrive(credentials.clientId, credentials.clientSecret)
    status.configured = true
    credentials.clientId = ''
    credentials.clientSecret = ''
  } catch (e) {
    error.value = e.message
  } finally {
    savingCredentials.value = false
  }
}

async function connectGoogleDrive() {
  connecting.value = true
  error.value = null
  try {
    const data = await api.getGoogleDriveAuthUrl()
    // Open OAuth popup
    window.location.href = data.authUrl
  } catch (e) {
    error.value = e.message
    connecting.value = false
  }
}

async function disconnect() {
  try {
    await api.disconnectGoogleDrive()
    status.connected = false
    files.value = []
    selectedFiles.clear()
  } catch (e) {
    error.value = e.message
  }
}

async function loadSharedDrives() {
  try {
    const data = await api.getGoogleDriveSharedDrives()
    sharedDrives.value = data.sharedDrives || []
  } catch (e) {
    console.error('Failed to load shared drives:', e)
  }
}

async function loadFiles() {
  loadingFiles.value = true
  error.value = null
  try {
    const driveId = currentDriveType.value === 'shared' ? selectedSharedDrive.value : null
    const data = await api.getGoogleDriveFiles(currentFolderId.value, driveId)
    files.value = data.files || []
    currentPath.value = data.path || [{ id: 'root', name: 'My Drive' }]
  } catch (e) {
    error.value = e.message
  } finally {
    loadingFiles.value = false
  }
}

function switchDrive(type) {
  currentDriveType.value = type
  selectedFiles.clear()

  if (type === 'personal') {
    currentFolderId.value = 'root'
    selectedSharedDrive.value = null
    loadFiles()
  } else if (type === 'shared' && sharedDrives.value.length > 0 && !selectedSharedDrive.value) {
    // Auto-select first shared drive
    selectedSharedDrive.value = sharedDrives.value[0].id
    loadSharedDriveRoot()
  }
}

function loadSharedDriveRoot() {
  if (selectedSharedDrive.value) {
    currentFolderId.value = selectedSharedDrive.value
    loadFiles()
  }
}

function navigateIntoFolder(folder) {
  currentFolderId.value = folder.id
  loadFiles()
}

function navigateToFolder(folderId, pathIndex) {
  currentFolderId.value = folderId
  currentPath.value = currentPath.value.slice(0, pathIndex + 1)
  loadFiles()
}

function toggleFileSelection(file) {
  if (selectedFiles.has(file.id)) {
    selectedFiles.delete(file.id)
  } else {
    selectedFiles.set(file.id, file)
  }
}

async function importSelected() {
  if (selectedFiles.size === 0) return

  importing.value = true
  error.value = null

  try {
    const filesToImport = Array.from(selectedFiles.values()).map(f => ({
      id: f.id,
      name: f.name,
    }))

    const tags = importTags.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t)

    const result = await api.importFromGoogleDrive(filesToImport, tags)

    emit('imported', result)
    emit('close')
  } catch (e) {
    error.value = e.message
  } finally {
    importing.value = false
  }
}
</script>
