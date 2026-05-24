<template>
  <div class="role-manager">
    <div class="role-list-header">
      <h2>Roles</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">
        + New Role
      </button>
    </div>

    <!-- Create Role Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal modal-lg">
        <h3>Create Custom Role</h3>
        <form @submit.prevent="createRole">
          <div class="form-group">
            <label>Role Name</label>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="e.g. editor, viewer"
              pattern="^[a-z][a-z0-9_]*$"
              title="Starts with a letter, lowercase letters, numbers, and underscores only"
              required
            />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input v-model="createForm.description" type="text" placeholder="Describe this role" />
          </div>

          <div class="form-group">
            <label>Permissions</label>
            <div class="permission-grid">
              <div
                v-for="resource in resources"
                :key="resource"
                class="permission-group"
              >
                <strong>{{ resource }}</strong>
                <label v-for="action in actions" :key="action" class="checkbox-label">
                  <input
                    type="checkbox"
                    :value="{ resource, action }"
                    v-model="createForm.permissions"
                  />
                  {{ action }}
                </label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" @click="closeCreateModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="creating">
              {{ creating ? "Creating..." : "Create" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Role Modal -->
    <div v-if="editingRole" class="modal-overlay" @click.self="editingRole = null">
      <div class="modal modal-lg">
        <h3>Edit Role: {{ editingRole.name }}</h3>
        <form @submit.prevent="updateRole">
          <div class="form-group">
            <label>Role Name</label>
            <input v-model="editForm.name" type="text" required />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input v-model="editForm.description" type="text" />
          </div>

          <div class="form-group">
            <label>Permissions</label>
            <div class="permission-grid">
              <div
                v-for="resource in resources"
                :key="resource"
                class="permission-group"
              >
                <strong>{{ resource }}</strong>
                <label v-for="action in actions" :key="action" class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="hasPermission(editForm.permissions, resource, action)"
                    @change="togglePermission(resource, action, $event.target.checked)"
                  />
                  {{ action }}
                </label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" @click="editingRole = null">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="errorMsg" class="auth-error"><span>⚠️</span> {{ errorMsg }}</div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Permissions</th>
          <th>Type</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.id">
          <td><strong>{{ role.name }}</strong></td>
          <td>{{ role.description || "—" }}</td>
          <td>
            <span class="perm-chip" v-for="perm in role.permissions" :key="perm.id">
              {{ perm.resource }}:{{ perm.action }}
            </span>
            <span v-if="!role.permissions.length" class="text-muted">None</span>
          </td>
          <td>
            <span :class="['type-badge', role.is_system ? 'system' : 'custom']">
              {{ role.is_system ? "System" : "Custom" }}
            </span>
          </td>
          <td class="actions">
            <button
              v-if="!role.is_system"
              class="btn btn-sm"
              @click="startEdit(role)"
            >
              Edit
            </button>
            <button
              v-if="!role.is_system"
              class="btn btn-danger btn-sm"
              @click="confirmDelete(role)"
            >
              Delete
            </button>
            <span v-else class="text-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useAuth } from "../../composables/useAuth.js";

const { getToken } = useAuth();

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace("/ws", "").replace("ws://", "http://").replace("wss://", "https://")
  : import.meta.env.DEV ? "http://localhost:3001" : `${location.protocol === "https:" ? "https" : "http"}://${location.host}`;

const roles = ref([]);
const errorMsg = ref("");
const showCreateModal = ref(false);
const editingRole = ref(null);
const creating = ref(false);
const saving = ref(false);

const resources = ["users", "roles", "sessions", "chat", "system"];
const actions = ["create", "read", "update", "delete", "use", "manage"];

const createForm = reactive({
  name: "",
  description: "",
  permissions: [],
});

const editForm = reactive({
  id: null,
  name: "",
  description: "",
  permissions: [],
});

async function fetchRoles() {
  try {
    const res = await fetch(`${API_BASE}/api/roles`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch roles");
    roles.value = await res.json();
  } catch (err) {
    errorMsg.value = err.message;
  }
}

function closeCreateModal() {
  showCreateModal.value = false;
  createForm.name = "";
  createForm.description = "";
  createForm.permissions = [];
}

async function createRole() {
  creating.value = true;
  errorMsg.value = "";
  try {
    const res = await fetch(`${API_BASE}/api/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        name: createForm.name,
        description: createForm.description,
        permissions: createForm.permissions,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    closeCreateModal();
    await fetchRoles();
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    creating.value = false;
  }
}

function startEdit(role) {
  editingRole.value = role;
  editForm.id = role.id;
  editForm.name = role.name;
  editForm.description = role.description;
  editForm.permissions = [...role.permissions];
}

function hasPermission(perms, resource, action) {
  return perms.some((p) => p.resource === resource && p.action === action);
}

function togglePermission(resource, action, checked) {
  if (checked) {
    editForm.permissions.push({ resource, action });
  } else {
    editForm.permissions = editForm.permissions.filter(
      (p) => !(p.resource === resource && p.action === action)
    );
  }
}

async function updateRole() {
  saving.value = true;
  errorMsg.value = "";
  try {
    // Update role info
    const roleRes = await fetch(`${API_BASE}/api/roles/${editingRole.value.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
      }),
    });
    const roleData = await roleRes.json();
    if (!roleRes.ok) throw new Error(roleData.error);

    // Update permissions
    const permRes = await fetch(`${API_BASE}/api/roles/${editingRole.value.id}/permissions`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ permissions: editForm.permissions }),
    });
    const permData = await permRes.json();
    if (!permRes.ok) throw new Error(permData.error);

    editingRole.value = null;
    await fetchRoles();
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    saving.value = false;
  }
}

function confirmDelete(role) {
  if (!confirm(`Delete role "${role.name}"? Users with this role will be unaffected.`)) return;

  fetch(`${API_BASE}/api/roles/${role.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchRoles();
  }).catch((err) => {
    errorMsg.value = err.message;
  });
}

onMounted(fetchRoles);

defineExpose({ fetchRoles });
</script>
