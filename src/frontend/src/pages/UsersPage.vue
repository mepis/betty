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

const currentUserId = computed(() => authStore.user?.id || '');
const isAdmin = computed(() => authStore.user?.role === 'admin');
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
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* Mobile */
@media (max-width: 768px) {
  .users-page {
    padding: 16px;
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
