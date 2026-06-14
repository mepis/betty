<template>
  <div class="users-page">
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <h1>User Management</h1>
      </div>
      <button v-if="isAdmin" class="create-user-btn" @click="openCreateModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Create User
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading users...</span>
    </div>

    <div v-else-if="error" class="error-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {{ error }}
      <button class="retry-btn" @click="loadUsers">Retry</button>
    </div>

    <div v-else-if="!isAdmin" class="forbidden-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <h2>Access Denied</h2>
      <p>You need admin privileges to manage users.</p>
    </div>

    <template v-else>
      <!-- Create User Modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Create New User</h2>
            <button class="modal-close" @click="closeCreateModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div v-if="createError" class="error-msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {{ createError }}
          </div>

          <div v-if="createSuccess" class="success-msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {{ createSuccess }}
          </div>

          <form class="create-form" @submit.prevent="handleCreateUser">
            <div class="form-group">
              <label for="new-name">Name</label>
              <input
                id="new-name"
                v-model="newUserName"
                type="text"
                placeholder="User's name"
                :disabled="creatingUser"
              >
            </div>

            <div class="form-group">
              <label for="new-email">Email</label>
              <input
                id="new-email"
                v-model="newUserEmail"
                type="email"
                placeholder="user@example.com"
                required
                :disabled="creatingUser"
                autofocus
              >
            </div>

            <div class="form-group">
              <label for="new-password">Password</label>
              <input
                id="new-password"
                v-model="newUserPassword"
                type="password"
                placeholder="At least 6 characters"
                required
                minlength="6"
                :disabled="creatingUser"
              >
            </div>

            <div class="form-group">
              <label for="new-role">Role</label>
              <select
                id="new-role"
                v-model="newUserRole"
                :disabled="creatingUser"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="closeCreateModal" :disabled="creatingUser">Cancel</button>
              <button type="submit" class="submit-btn" :disabled="creatingUser || !isCreateValid">
                <span v-if="creatingUser" class="spinner-sm"></span>
                <span>{{ creatingUser ? 'Creating...' : 'Create User' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">{{ users.length }}</span>
          <span class="stat-label">Total users</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ adminCount }}</span>
          <span class="stat-label">Admins</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ userCount }}</span>
          <span class="stat-label">Regular users</span>
        </div>
      </div>

      <!-- Users table -->
      <div class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Created</th>
              <th>Last login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" :class="{ 'current-user': u.id === currentUserId }">
              <td>
                <div class="user-cell">
                  <div class="user-avatar-sm">{{ u.name?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase() || '?' }}</div>
                  <div class="user-details">
                    <div class="user-name-cell">{{ u.name || u.email?.split('@')[0] }}</div>
                    <div class="user-email">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="role-badge" :class="u.role">
                  {{ u.role }}
                </span>
              </td>
              <td class="mono">{{ formatDate(u.createdAt) }}</td>
              <td class="mono">{{ u.lastLogin ? formatDate(u.lastLogin) : 'Never' }}</td>
              <td>
                <div class="actions-cell">
                  <select
                    v-if="u.id !== currentUserId"
                    class="role-select"
                    :value="u.role"
                    @change="changeRole(u, $event.target.value)"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span v-else class="self-role">You</span>

                  <button
                    v-if="u.id !== currentUserId"
                    class="delete-btn"
                    @click="confirmDelete(u)"
                    title="Delete user"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { authStore } from '../stores/auth.js';

const emit = defineEmits(['close']);

const users = ref([]);
const loading = ref(true);
const error = ref('');

// Create user modal state
const showCreateModal = ref(false);
const newUserName = ref('');
const newUserEmail = ref('');
const newUserPassword = ref('');
const newUserRole = ref('user');
const creatingUser = ref(false);
const createError = ref('');
const createSuccess = ref('');

const isCreateValid = computed(() => {
  return newUserEmail.value &&
    newUserEmail.value.includes('@') &&
    newUserPassword.value &&
    newUserPassword.value.length >= 6;
});

const currentUserId = computed(() => authStore.user.value?.id || '');
const isAdmin = computed(() => authStore.user.value?.role === 'admin');
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length);
const userCount = computed(() => users.value.filter(u => u.role === 'user').length);

async function loadUsers() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch('/api/admin/users', {
      credentials: 'include',
      headers: { 'X-Request-Type': 'api' },
    });

    if (res.status === 403) {
      // Not admin — show forbidden state
      loading.value = false;
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to load users');
    }

    const data = await res.json();
    users.value = data.users || [];
  } catch (err) {
    error.value = err.message || 'Failed to load users';
  } finally {
    loading.value = false;
  }
}

async function changeRole(user, newRole) {
  try {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Type': 'api',
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to update role');
      // Reload to revert the UI
      loadUsers();
      return;
    }

    const data = await res.json();
    const idx = users.value.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users.value[idx] = data.user;
    }
  } catch (err) {
    alert('Failed to update role: ' + err.message);
    loadUsers();
  }
}

function confirmDelete(user) {
  const displayName = user.name || user.email;
  if (confirm(`Delete user "${displayName}"? This cannot be undone.`)) {
    deleteUser(user);
  }
}

async function deleteUser(user) {
  try {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-Request-Type': 'api' },
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete user');
      return;
    }

    users.value = users.value.filter(u => u.id !== user.id);
  } catch (err) {
    alert('Failed to delete user: ' + err.message);
  }
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function openCreateModal() {
  showCreateModal.value = true;
  newUserName.value = '';
  newUserEmail.value = '';
  newUserPassword.value = '';
  newUserRole.value = 'user';
  createError.value = '';
  createSuccess.value = '';
}

function closeCreateModal() {
  showCreateModal.value = false;
  createError.value = '';
  createSuccess.value = '';
}

async function handleCreateUser() {
  createError.value = '';
  createSuccess.value = '';
  creatingUser.value = true;

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Type': 'api',
      },
      body: JSON.stringify({
        name: newUserName.value || undefined,
        email: newUserEmail.value,
        password: newUserPassword.value,
        role: newUserRole.value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    users.value.unshift(data.user);
    createSuccess.value = 'User created successfully';
    newUserName.value = '';
    newUserEmail.value = '';
    newUserPassword.value = '';
    newUserRole.value = 'user';
  } catch (err) {
    createError.value = err.message || 'Failed to create user';
  } finally {
    creatingUser.value = false;
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.users-page {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  background: var(--bg-primary);
  min-height: 100vh;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-user-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--accent);
  color: var(--btn-primary-text);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity var(--transition-fast);
}

.create-user-btn:hover {
  opacity: 0.9;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-light);
}

.page-header h1 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

/* Loading / Error / Forbidden states */
.loading-state,
.forbidden-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--text-muted);
}

.loading-state .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.forbidden-state svg {
  color: var(--text-muted);
  opacity: 0.4;
}

.forbidden-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
}

.forbidden-state p {
  font-size: 14px;
  color: var(--text-muted);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: var(--error-dim);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius);
  color: var(--error);
  font-size: 14px;
}

.retry-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: var(--error);
  color: #09090b;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* Stats */
.stats-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat {
  flex: 1;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* Table */
.table-container {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.users-table thead th {
  text-align: left;
  padding: 12px 16px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.users-table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-fast);
}

.users-table tbody tr:last-child {
  border-bottom: none;
}

.users-table tbody tr:hover {
  background: var(--bg-hover);
}

.users-table tbody tr.current-user {
  background: var(--accent-dim-soft);
}

.users-table tbody td {
  padding: 12px 16px;
  color: var(--text-secondary);
  vertical-align: middle;
}

.mono {
  font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  font-size: 12.5px;
  color: var(--text-muted);
}

/* User cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-dim);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name-cell {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Role badge */
.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.role-badge.admin {
  background: var(--warning-dim);
  color: var(--warning);
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.role-badge.user {
  background: var(--info-dim);
  color: var(--info);
  border: 1px solid rgba(96, 165, 250, 0.2);
}

/* Actions */
.actions-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-select {
  padding: 5px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2352525a' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 22px;
  transition: border-color var(--transition-fast);
}

.role-select:hover {
  border-color: var(--border-light);
}

.role-select:focus {
  outline: none;
  border-color: var(--accent);
}

.self-role {
  font-size: 12px;
  color: var(--text-muted);
  padding: 5px 0;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.delete-btn:hover {
  background: var(--error-dim);
  color: var(--error);
  border-color: rgba(248, 113, 113, 0.3);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.create-form {
  padding: 24px;
}

.create-form .form-group {
  margin-bottom: 16px;
}

.create-form .form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.create-form .form-group input,
.create-form .form-group select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.create-form .form-group input:focus,
.create-form .form-group select:focus {
  border-color: var(--accent);
}

.create-form .form-group input::placeholder {
  color: var(--text-tertiary);
}

.create-form .form-group input:disabled,
.create-form .form-group select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.create-form .form-group select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2352525a' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn {
  padding: 10px 18px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.cancel-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-light);
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn {
  padding: 10px 18px;
  background: var(--accent);
  color: var(--btn-primary-text);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: opacity var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 6px;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin: 16px 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.success-msg {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin: 16px 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Mobile */
@media (max-width: 768px) {
  .users-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .create-user-btn {
    width: 100%;
    justify-content: center;
  }

  .stats-bar {
    flex-direction: column;
    gap: 8px;
  }

  .users-table {
    font-size: 13px;
  }

  .users-table thead th,
  .users-table tbody td {
    padding: 10px 12px;
  }

  .user-email {
    display: none;
  }
}
</style>
