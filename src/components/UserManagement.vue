<template>
  <div class="user-management">
    <div class="um-header">
      <h3>User Management</h3>
      <button class="btn btn-primary" @click="showCreateForm = true">
        <span class="icon">+</span> Add User
      </button>
    </div>

    <!-- Create User Form -->
    <div v-if="showCreateForm" class="um-form">
      <div class="um-form-header">
        <h4>Create New User</h4>
        <button class="btn btn-icon" @click="showCreateForm = false">✕</button>
      </div>
      <form @submit.prevent="handleCreateUser" class="um-form-body">
        <div class="form-row">
          <div class="form-group">
            <label>Username</label>
            <input v-model="newUser.username" type="text" placeholder="Username" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="newUser.password" type="password" placeholder="Password" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Role</label>
            <select v-model="newUser.role">
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div class="um-form-actions">
          <button type="button" class="btn" @click="showCreateForm = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            Create
          </button>
        </div>
      </form>
    </div>

    <!-- Error message -->
    <div v-if="error" class="um-error">{{ error }}</div>

    <!-- Users Table -->
    <div class="um-table" v-if="users.length > 0">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.username }}</td>
            <td>
              <span class="role-badge" :class="u.role">{{ u.role }}</span>
            </td>
            <td>{{ formatDate(u.createdAt) }}</td>
            <td class="um-actions">
              <select
                :value="u.role"
                @change="handleRoleChange(u.id, $event)"
                class="role-select"
                :disabled="isSubmitting"
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                class="btn btn-icon btn-reset-pw"
                @click="openResetPassword(u.id, u.username)"
                :disabled="isSubmitting"
                title="Reset password"
              >
                🔑
              </button>
              <button
                class="btn btn-icon btn-delete"
                @click="openDeleteUser(u.id, u.username)"
                :disabled="isSubmitting"
                title="Delete user"
              >
                🗑
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!isLoading" class="um-empty">
      No users found.
    </div>

    <!-- Password reset modal -->
    <div v-if="showResetModal" class="modal-overlay" @click.self="showResetModal = false">
      <div class="modal modal-small">
        <div class="modal-header">
          <h3>Reset Password</h3>
          <button class="btn btn-icon" @click="showResetModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p>Reset password for <strong>{{ resetTargetUsername }}</strong>?</p>
          <div class="form-group">
            <label>New Password</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="New password"
              required
              autofocus
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showResetModal = false">Cancel</button>
          <button class="btn btn-primary" @click="confirmResetPassword" :disabled="isSubmitting">
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal modal-small">
        <div class="modal-header">
          <h3>Delete User</h3>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete <strong>{{ deleteTargetUsername }}</strong>? This cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDeleteModal = false">Cancel</button>
          <button class="btn btn-warning" @click="confirmDeleteUser" :disabled="isSubmitting">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { User } from "@/types";

interface UserPublic {
  id: string;
  username: string;
  role: "admin" | "user" | "viewer";
  createdAt: number;
}

const props = defineProps<{ token: string }>();

const users = ref<UserPublic[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const error = ref("");

// Create user form
const showCreateForm = ref(false);
const newUser = ref({ username: "", password: "", role: "user" as const });

// Password reset
const showResetModal = ref(false);
const resetTargetId = ref("");
const resetTargetUsername = ref("");
const newPassword = ref("");

// Delete confirmation
const showDeleteModal = ref(false);
const deleteTargetId = ref("");
const deleteTargetUsername = ref("");

async function fetchUsers(): Promise<void> {
  isLoading.value = true;
  error.value = "";
  try {
    const resp = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${props.token}` },
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch users");
    }
    const data = await resp.json();
    users.value = data.users;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateUser(): Promise<void> {
  isSubmitting.value = true;
  error.value = "";
  try {
    const resp = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.token}`,
      },
      body: JSON.stringify(newUser.value),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create user");
    }
    newUser.value = { username: "", password: "", role: "user" };
    showCreateForm.value = false;
    await fetchUsers();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isSubmitting.value = false;
  }
}

async function handleRoleChange(userId: string, event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement;
  const role = target.value as "admin" | "user" | "viewer";
  isSubmitting.value = true;
  error.value = "";
  try {
    const resp = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.token}`,
      },
      body: JSON.stringify({ role }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update role");
    }
    await fetchUsers();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isSubmitting.value = false;
  }
}

function openResetPassword(id: string, username: string): void {
  resetTargetId.value = id;
  resetTargetUsername.value = username;
  newPassword.value = "";
  showResetModal.value = true;
}

async function confirmResetPassword(): Promise<void> {
  if (!newPassword.value) return;
  isSubmitting.value = true;
  error.value = "";
  try {
    const resp = await fetch(`/api/users/${resetTargetId.value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.token}`,
      },
      body: JSON.stringify({ password: newPassword.value }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Failed to reset password");
    }
    showResetModal.value = false;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isSubmitting.value = false;
  }
}

function openDeleteUser(id: string, username: string): void {
  deleteTargetId.value = id;
  deleteTargetUsername.value = username;
  showDeleteModal.value = true;
}

async function confirmDeleteUser(): Promise<void> {
  isSubmitting.value = true;
  error.value = "";
  try {
    const resp = await fetch(`/api/users/${deleteTargetId.value}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${props.token}` },
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete user");
    }
    showDeleteModal.value = false;
    await fetchUsers();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    isSubmitting.value = false;
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.user-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.um-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.um-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.um-form {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.um-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border);
}

.um-form-header h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.um-form-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--accent);
}

.um-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.um-error {
  padding: 10px 14px;
  border-radius: var(--radius);
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid var(--red);
  color: var(--red);
  font-size: 13px;
}

.um-table {
  overflow-x: auto;
}

.um-table table {
  width: 100%;
  border-collapse: collapse;
}

.um-table th,
.um-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.um-table th {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.role-badge.admin {
  background: rgba(248, 81, 73, 0.15);
  color: var(--red);
}

.role-badge.user {
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent);
}

.role-badge.viewer {
  background: rgba(139, 148, 158, 0.15);
  color: var(--text-secondary);
}

.um-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.role-select {
  padding: 4px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.btn-reset-pw {
  font-size: 14px;
  opacity: 0.7;
}

.btn-reset-pw:hover {
  opacity: 1;
}

.btn-delete {
  font-size: 14px;
  opacity: 0.7;
}

.btn-delete:hover {
  opacity: 1;
}

.um-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
