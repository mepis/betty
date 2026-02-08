<template>
  <div class="flex h-screen bg-dark-900">
    <Sidebar />

    <main class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-dark-100">Admin Settings</h1>
            <p class="text-dark-400 mt-1">Configure system-wide model parameters</p>
          </div>

          <div class="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 class="text-lg font-semibold text-dark-100 mb-6">Model Parameters</h2>

            <!-- Loading State -->
            <div v-if="settings.loading" class="flex items-center justify-center py-8">
              <div class="text-dark-400">Loading settings...</div>
            </div>

            <!-- Error State -->
            <div v-else-if="settings.error" class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <p class="text-red-400 text-sm">{{ settings.error }}</p>
            </div>

            <div v-else class="space-y-6">
              <!-- Temperature -->
              <div>
                <label class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-dark-200">Temperature</span>
                  <span class="text-sm text-dark-400">{{ settings.temperature.toFixed(2) }}</span>
                </label>
                <input
                  type="range"
                  v-model.number="settings.temperature"
                  min="0"
                  max="2"
                  step="0.05"
                  class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p class="mt-1 text-xs text-dark-500">Higher = more creative, lower = more focused</p>
              </div>

              <!-- Max Tokens -->
              <div>
                <label class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-dark-200">Max Tokens</span>
                  <span class="text-sm text-dark-400">{{ settings.maxTokens }}</span>
                </label>
                <input
                  type="range"
                  v-model.number="settings.maxTokens"
                  min="64"
                  max="4096"
                  step="64"
                  class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p class="mt-1 text-xs text-dark-500">Maximum response length</p>
              </div>

              <!-- Top P -->
              <div>
                <label class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-dark-200">Top P</span>
                  <span class="text-sm text-dark-400">{{ settings.topP.toFixed(2) }}</span>
                </label>
                <input
                  type="range"
                  v-model.number="settings.topP"
                  min="0"
                  max="1"
                  step="0.05"
                  class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p class="mt-1 text-xs text-dark-500">Nucleus sampling threshold</p>
              </div>

              <!-- System Prompt -->
              <div>
                <label class="block text-sm font-medium text-dark-200 mb-2">
                  System Prompt
                </label>
                <textarea
                  v-model="settings.systemPrompt"
                  rows="4"
                  class="w-full rounded-lg bg-dark-800 border border-dark-600 px-3 py-2 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Instructions for the AI assistant..."
                />
              </div>

              <!-- Reset Button -->
              <button
                @click="settings.resetToDefaults"
                class="w-full py-2 px-4 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors text-sm"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          <!-- Embedding Model Configuration -->
          <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 mt-6">
            <h2 class="text-lg font-semibold text-dark-100 mb-6">Embedding Model</h2>

            <div class="space-y-4">
              <!-- Toggle: Use Same Model vs Separate Model -->
              <div>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="embeddingEnabled"
                    class="w-4 h-4 rounded border-dark-600 bg-dark-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-dark-800"
                  />
                  <span class="text-sm font-medium text-dark-200">Use separate model for embeddings</span>
                </label>
                <p class="mt-1 text-xs text-dark-500 ml-7">
                  When disabled, the chat model handles both chat and embeddings.
                  Enable this to run a dedicated embedding model on a separate server.
                </p>
              </div>

              <!-- Model Selector (shown when enabled) -->
              <div v-if="embeddingEnabled" class="mt-4">
                <label class="block text-sm font-medium text-dark-200 mb-2">
                  Embedding Model
                </label>
                <select
                  v-model="selectedEmbeddingModel"
                  class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  :disabled="savingEmbedding"
                >
                  <option :value="null" disabled>Select a model...</option>
                  <option v-for="model in localModels" :key="model.filename" :value="model.filename">
                    {{ model.name || model.filename }} ({{ formatSize(model.size) }})
                  </option>
                </select>
                <p class="mt-1 text-xs text-dark-500">
                  Choose a model optimized for embeddings (e.g., nomic-embed, bge, e5)
                </p>

                <!-- Status indicator -->
                <div class="mt-3 flex items-center gap-2">
                  <template v-if="savingEmbedding">
                    <div class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                    <span class="text-sm text-yellow-400">Starting server...</span>
                  </template>
                  <template v-else-if="settings.embeddingServerStatus?.isRunning">
                    <div class="w-2 h-2 rounded-full bg-green-400"></div>
                    <span class="text-sm text-green-400">
                      Running on port {{ settings.embeddingServerStatus.port }}
                    </span>
                  </template>
                  <template v-else-if="selectedEmbeddingModel">
                    <div class="w-2 h-2 rounded-full bg-red-400"></div>
                    <span class="text-sm text-red-400">Not running</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- User Management -->
          <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 mt-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-dark-100">User Management</h2>
              <button
                @click="openCreateUser"
                class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
              >
                Add User
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="auth.usersLoading" class="flex items-center justify-center py-8">
              <div class="text-dark-400">Loading users...</div>
            </div>

            <!-- Users Table -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-dark-700">
                    <th class="text-left py-2 px-3 text-dark-400 font-medium">Username</th>
                    <th class="text-left py-2 px-3 text-dark-400 font-medium">Email</th>
                    <th class="text-left py-2 px-3 text-dark-400 font-medium">Role</th>
                    <th class="text-left py-2 px-3 text-dark-400 font-medium">Status</th>
                    <th class="text-right py-2 px-3 text-dark-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in auth.users" :key="user.id" class="border-b border-dark-700/50">
                    <td class="py-3 px-3 text-dark-200">{{ user.username }}</td>
                    <td class="py-3 px-3 text-dark-300">{{ user.email }}</td>
                    <td class="py-3 px-3">
                      <span
                        :class="user.role === 'admin' ? 'bg-purple-900/50 text-purple-300' : 'bg-dark-700 text-dark-300'"
                        class="px-2 py-0.5 rounded text-xs"
                      >
                        {{ user.role }}
                      </span>
                    </td>
                    <td class="py-3 px-3">
                      <span
                        :class="user.isActive ? 'text-green-400' : 'text-red-400'"
                        class="text-xs"
                      >
                        {{ user.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          @click="openEditUser(user)"
                          class="text-dark-400 hover:text-dark-200 transition-colors"
                          title="Edit user"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          @click="openResetPassword(user)"
                          class="text-dark-400 hover:text-dark-200 transition-colors"
                          title="Reset password"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        <button
                          v-if="user.id !== auth.user?.id"
                          @click="handleDeleteUser(user)"
                          class="text-dark-400 hover:text-red-400 transition-colors"
                          title="Delete user"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Create User Modal -->
          <div v-if="showCreateUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 w-full max-w-md mx-4">
              <h3 class="text-lg font-semibold text-dark-100 mb-4">Create New User</h3>

              <div v-if="userActionError" class="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                <p class="text-red-400 text-sm">{{ userActionError }}</p>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-dark-200 mb-1">Username</label>
                  <input
                    v-model="newUser.username"
                    type="text"
                    class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-dark-200 mb-1">Email</label>
                  <input
                    v-model="newUser.email"
                    type="email"
                    class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-dark-200 mb-1">Password</label>
                  <input
                    v-model="newUser.password"
                    type="password"
                    class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-dark-200 mb-1">Role</label>
                  <select
                    v-model="newUser.role"
                    class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div class="flex justify-end gap-3 mt-6">
                <button
                  @click="showCreateUser = false"
                  class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 transition-colors text-sm"
                  :disabled="userActionLoading"
                >
                  Cancel
                </button>
                <button
                  @click="handleCreateUser"
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                  :disabled="userActionLoading || !newUser.username || !newUser.email || !newUser.password"
                >
                  {{ userActionLoading ? 'Creating...' : 'Create User' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Edit User Modal -->
          <div v-if="showEditUser && editingUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 w-full max-w-md mx-4">
              <h3 class="text-lg font-semibold text-dark-100 mb-4">Edit User: {{ editingUser.username }}</h3>

              <div v-if="userActionError" class="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                <p class="text-red-400 text-sm">{{ userActionError }}</p>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-dark-200 mb-1">Email</label>
                  <input
                    v-model="editingUser.email"
                    type="email"
                    class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-dark-200 mb-1">Role</label>
                  <select
                    v-model="editingUser.role"
                    class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="editingUser.isActive"
                      class="w-4 h-4 rounded border-dark-600 bg-dark-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-dark-200">Active</span>
                  </label>
                </div>
              </div>

              <div class="flex justify-end gap-3 mt-6">
                <button
                  @click="showEditUser = false"
                  class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 transition-colors text-sm"
                  :disabled="userActionLoading"
                >
                  Cancel
                </button>
                <button
                  @click="handleUpdateUser"
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                  :disabled="userActionLoading"
                >
                  {{ userActionLoading ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Reset Password Modal -->
          <div v-if="showResetPassword && editingUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 w-full max-w-md mx-4">
              <h3 class="text-lg font-semibold text-dark-100 mb-4">Reset Password: {{ editingUser.username }}</h3>

              <div v-if="userActionError" class="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                <p class="text-red-400 text-sm">{{ userActionError }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-dark-200 mb-1">New Password</label>
                <input
                  v-model="newPassword"
                  type="password"
                  class="w-full rounded-lg bg-dark-700 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div class="flex justify-end gap-3 mt-6">
                <button
                  @click="showResetPassword = false"
                  class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 transition-colors text-sm"
                  :disabled="userActionLoading"
                >
                  Cancel
                </button>
                <button
                  @click="handleResetPassword"
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                  :disabled="userActionLoading || !newPassword"
                >
                  {{ userActionLoading ? 'Updating...' : 'Update Password' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Server Information -->
          <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 mt-6">
            <h2 class="text-lg font-semibold text-dark-100 mb-6">Server Information</h2>

            <div class="space-y-3">
              <div class="flex items-center justify-between py-2 border-b border-dark-700">
                <span class="text-sm text-dark-300">API Server</span>
                <div class="flex items-center gap-2">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="serverStatus.api === 'running' ? 'bg-green-400' : serverStatus.api === 'checking' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'"
                  ></div>
                  <span
                    class="text-sm"
                    :class="serverStatus.api === 'running' ? 'text-green-400' : serverStatus.api === 'checking' ? 'text-yellow-400' : 'text-red-400'"
                  >
                    {{ serverStatus.api === 'running' ? 'Running' : serverStatus.api === 'checking' ? 'Checking...' : 'Error' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-sm text-dark-300">llama.cpp Server</span>
                <div class="flex items-center gap-2">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="serverStatus.llama === 'running' ? 'bg-green-400' : serverStatus.llama === 'checking' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'"
                  ></div>
                  <span
                    class="text-sm"
                    :class="serverStatus.llama === 'running' ? 'text-green-400' : serverStatus.llama === 'checking' ? 'text-yellow-400' : 'text-red-400'"
                  >
                    {{ serverStatus.llama === 'running' ? 'Running' : serverStatus.llama === 'checking' ? 'Checking...' : 'Error' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="bg-dark-800 rounded-lg border border-red-900/50 p-6 mt-6">
            <h2 class="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
            <p class="text-sm text-dark-400 mb-4">
              Shutting down the server will stop both the API server and the llama.cpp server. You'll need to restart the application manually.
            </p>
            <button
              @click="confirmShutdown"
              :disabled="isShuttingDown"
              class="py-2.5 px-4 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {{ isShuttingDown ? 'Shutting down...' : 'Shutdown Server' }}
            </button>
          </div>

          <!-- Shutdown Confirmation Modal -->
          <div v-if="showShutdownConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-dark-800 rounded-lg border border-dark-700 p-6 w-full max-w-md mx-4">
              <h3 class="text-lg font-semibold text-dark-100 mb-2">Shutdown Server?</h3>
              <p class="text-dark-300 text-sm mb-6">
                This will stop both the API server and the llama.cpp server. You'll need to restart the application manually.
              </p>
              <div class="flex justify-end gap-3">
                <button
                  @click="cancelShutdown"
                  class="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  @click="handleShutdown"
                  class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm"
                >
                  Shutdown
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import { getModelCatalog, getHealth, shutdownServer } from '../api/llama'

const settings = useSettingsStore()
const auth = useAuthStore()

// Local models for dropdown
const localModels = ref([])
const embeddingEnabled = ref(false)
const selectedEmbeddingModel = ref(null)
const savingEmbedding = ref(false)
const initialized = ref(false)

// User management state
const showCreateUser = ref(false)
const showEditUser = ref(false)
const showResetPassword = ref(false)
const editingUser = ref(null)
const newUser = ref({ username: '', email: '', password: '', role: 'user' })
const newPassword = ref('')
const userActionLoading = ref(false)
const userActionError = ref(null)

// Server management state
const serverStatus = ref({ api: 'checking', llama: 'checking' })
const showShutdownConfirm = ref(false)
const isShuttingDown = ref(false)

// Format file size
function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Load settings and models when component mounts
onMounted(async () => {
  await settings.fetchSettings()

  // Initialize local state from settings
  embeddingEnabled.value = settings.embeddingModelEnabled
  selectedEmbeddingModel.value = settings.embeddingModelFilename

  // Fetch available models
  try {
    const response = await getModelCatalog()
    // API returns { local: [...], available: [...] }
    localModels.value = response.local || []
  } catch (e) {
    console.error('Failed to fetch models:', e)
  }

  // Mark as initialized after next tick to prevent watch from triggering on initial values
  await nextTick()
  initialized.value = true
})

// Save embedding settings when they change
async function saveEmbeddingChanges() {
  if (!initialized.value) return // Don't save during initialization

  savingEmbedding.value = true
  try {
    await settings.saveEmbeddingSettings(
      embeddingEnabled.value,
      embeddingEnabled.value ? selectedEmbeddingModel.value : null
    )
  } finally {
    savingEmbedding.value = false
  }
}

// Watch for changes and save
watch([embeddingEnabled, selectedEmbeddingModel], () => {
  // Only save if initialized and we have a valid model selected when enabled
  if (initialized.value && (!embeddingEnabled.value || selectedEmbeddingModel.value)) {
    saveEmbeddingChanges()
  }
})

// User management functions
async function loadUsers() {
  try {
    await auth.fetchUsers()
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
}

function openCreateUser() {
  newUser.value = { username: '', email: '', password: '', role: 'user' }
  userActionError.value = null
  showCreateUser.value = true
}

function openEditUser(user) {
  editingUser.value = { ...user }
  userActionError.value = null
  showEditUser.value = true
}

function openResetPassword(user) {
  editingUser.value = user
  newPassword.value = ''
  userActionError.value = null
  showResetPassword.value = true
}

async function handleCreateUser() {
  userActionLoading.value = true
  userActionError.value = null
  try {
    await auth.createUser(
      newUser.value.username,
      newUser.value.email,
      newUser.value.password,
      newUser.value.role
    )
    showCreateUser.value = false
  } catch (e) {
    userActionError.value = e.message
  } finally {
    userActionLoading.value = false
  }
}

async function handleUpdateUser() {
  userActionLoading.value = true
  userActionError.value = null
  try {
    await auth.updateUser(editingUser.value.id, {
      email: editingUser.value.email,
      role: editingUser.value.role,
      isActive: editingUser.value.isActive,
    })
    showEditUser.value = false
  } catch (e) {
    userActionError.value = e.message
  } finally {
    userActionLoading.value = false
  }
}

async function handleResetPassword() {
  userActionLoading.value = true
  userActionError.value = null
  try {
    await auth.updateUserPassword(editingUser.value.id, newPassword.value)
    showResetPassword.value = false
  } catch (e) {
    userActionError.value = e.message
  } finally {
    userActionLoading.value = false
  }
}

async function handleDeleteUser(user) {
  if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
    return
  }
  try {
    await auth.deleteUser(user.id)
  } catch (e) {
    alert(e.message)
  }
}

// Server management functions
async function checkServerHealth() {
  try {
    await getHealth()
    serverStatus.value.api = 'running'
    serverStatus.value.llama = 'running'
  } catch (e) {
    serverStatus.value.api = 'error'
    serverStatus.value.llama = 'error'
  }
}

function confirmShutdown() {
  showShutdownConfirm.value = true
}

function cancelShutdown() {
  showShutdownConfirm.value = false
}

async function handleShutdown() {
  isShuttingDown.value = true
  try {
    await shutdownServer()
  } catch (e) {
    // Server is shutting down, so this error is expected
    console.log('Server shutdown initiated')
  }
  showShutdownConfirm.value = false
}

// Load users and check server health on mount
onMounted(async () => {
  loadUsers()
  checkServerHealth()
})
</script>
