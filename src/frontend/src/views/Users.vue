<script setup>
import { ref, onMounted, computed, Teleport } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const users = ref([])
const loading = ref(false)
const saving = ref(false)

const toast = ref({ show: false, message: '', type: '' })
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingUser = ref(null)

const createForm = ref({ username: '', password: '', role: 'viewer' })
const editForm = ref({ role: '', password: '' })

const currentUser = computed(() => authStore.user)

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin': return 'bg-accent/20 text-accent'
    case 'operator': return 'bg-amber-500/20 text-amber-400'
    case 'viewer': return 'bg-sky-500/20 text-sky-400'
    default: return 'bg-bg-tertiary text-text-muted'
  }
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

async function loadUsers() {
  loading.value = true
  try {
    const data = await authStore.fetchUsers()
    if (data) {
      users.value = Array.isArray(data) ? data : (data.users || [])
    }
  } catch (e) {
    showToast(e.message || 'Failed to load users', 'error')
  }
  loading.value = false
}

async function handleCreateUser() {
  if (!createForm.value.username.trim()) {
    showToast('Username is required', 'error')
    return
  }
  if (!createForm.value.password || createForm.value.password.length < 8) {
    showToast('Password must be at least 8 characters', 'error')
    return
  }
  saving.value = true
  try {
    const result = await authStore.createUser(
      createForm.value.username.trim(),
      createForm.value.password,
      createForm.value.role
    )
    if (result) {
      showToast(`User "${createForm.value.username.trim()}" created`, 'success')
      showCreateModal.value = false
      createForm.value = { username: '', password: '', role: 'viewer' }
      await loadUsers()
    } else {
      showToast(authStore.error || 'Failed to create user', 'error')
    }
  } catch (e) {
    showToast(e.message || 'Failed to create user', 'error')
  }
  saving.value = false
}

function openEditModal(user) {
  editingUser.value = user
  editForm.value = { role: user.role || 'viewer', password: '' }
  showEditModal.value = true
}

async function handleEditUser() {
  if (!editingUser.value) return
  if (!editForm.value.role) {
    showToast('Please select a role', 'error')
    return
  }
  saving.value = true
  try {
    const updates = { role: editForm.value.role }
    if (editForm.value.password) {
      updates.password = editForm.value.password
    }
    const result = await authStore.updateUser(editingUser.value.username, updates)
    if (result) {
      showToast(`User "${editingUser.value.username}" updated`, 'success')
      showEditModal.value = false
      editingUser.value = null
      editForm.value = { role: '', password: '' }
      await loadUsers()
    } else {
      showToast(authStore.error || 'Failed to update user', 'error')
    }
  } catch (e) {
    showToast(e.message || 'Failed to update user', 'error')
  }
  saving.value = false
}

async function confirmDelete(user) {
  if (!confirm(`Delete user '${user.username}'? This cannot be undone.`)) return
  saving.value = true
  try {
    const result = await authStore.deleteUser(user.username)
    if (result) {
      showToast(`User "${user.username}" deleted`, 'success')
      await loadUsers()
    } else {
      showToast(authStore.error || 'Failed to delete user', 'error')
    }
  } catch (e) {
    showToast(e.message || 'Failed to delete user', 'error')
  }
  saving.value = false
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="m-2 space-y-6">
    <!-- User List Card -->
    <div class="card">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text-primary">User Management</h2>
        <button
          @click="showCreateModal = true"
          class="btn btn-primary btn-sm"
        >
          <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create User
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Empty state -->
      <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center py-16 text-text-muted">
        <svg class="w-12 h-12 mb-4 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p class="text-sm">No users found</p>
        <button
          @click="showCreateModal = true"
          class="btn btn-primary btn-sm mt-3"
        >
          Create User
        </button>
      </div>

      <!-- User list -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Username</th>
              <th class="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Role</th>
              <th class="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Created</th>
              <th class="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.username"
              class="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-medium flex-shrink-0">
                    {{ user.username.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm font-medium text-text-primary">{{ user.username }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="badge text-xs" :class="getRoleBadgeClass(user.role)">
                  {{ user.role || 'viewer' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-text-muted">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="openEditModal(user)"
                    class="btn btn-ghost btn-sm text-text-muted hover:text-accent"
                    title="Edit user"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="user.username !== currentUser?.username"
                    @click="confirmDelete(user)"
                    class="btn btn-ghost btn-sm text-text-muted hover:text-error"
                    title="Delete user"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center" @keydown="(e) => { if (e.key === 'Escape') showCreateModal = false }">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCreateModal = false" />
        <div class="relative bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 class="text-lg font-semibold text-text-primary">Create User</h3>
          <button
            @click="showCreateModal = false"
            class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Username</label>
            <input
              v-model="createForm.username"
              type="text"
              placeholder="Enter username"
              class="input w-full"
              :disabled="saving"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Password</label>
            <input
              v-model="createForm.password"
              type="password"
              placeholder="Enter password"
              class="input w-full"
              :disabled="saving"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Role</label>
            <select
              v-model="createForm.role"
              class="input w-full"
              :disabled="saving"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            @click="showCreateModal = false"
            class="btn btn-ghost btn-sm"
            :disabled="saving"
          >
            Cancel
          </button>
          <button
            @click="handleCreateUser"
            class="btn btn-primary btn-sm"
            :disabled="saving || !createForm.username.trim() || !createForm.password"
          >
            <svg v-if="!saving" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <svg v-else class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ saving ? 'Creating...' : 'Create User' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Edit User Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center" @keydown="(e) => { if (e.key === 'Escape') showEditModal = false }">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showEditModal = false" />
        <div class="relative bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 class="text-lg font-semibold text-text-primary">Edit User</h3>
          <button
            @click="showEditModal = false"
            class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Username</label>
            <input
              :value="editingUser?.username"
              type="text"
              disabled
              class="input w-full opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Role</label>
            <select
              v-model="editForm.role"
              class="input w-full"
              :disabled="saving"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">
              Password
              <span class="text-xs text-text-muted font-normal">(Leave blank to keep current)</span>
            </label>
            <input
              v-model="editForm.password"
              type="password"
              placeholder="New password (optional)"
              class="input w-full"
              :disabled="saving"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            @click="showEditModal = false"
            class="btn btn-ghost btn-sm"
            :disabled="saving"
          >
            Cancel
          </button>
          <button
            @click="handleEditUser"
            class="btn btn-primary btn-sm"
            :disabled="saving"
          >
            <svg v-if="!saving" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

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
