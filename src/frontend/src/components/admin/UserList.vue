<template>
  <div class="user-list">
    <div class="user-list-header">
      <h2>Users</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">
        + New User
      </button>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>Create User</h3>
        <form @submit.prevent="createUser">
          <div class="form-group">
            <label>Username</label>
            <input v-model="newUser.username" type="text" required minlength="3" maxlength="30" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="newUser.email" type="email" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="newUser.password" type="password" required minlength="6" />
          </div>
          <div class="form-group">
            <label>Role</label>
            <select v-model="newUser.role_id">
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="showCreateModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="creating">
              {{ creating ? "Creating..." : "Create" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="editingUser" class="modal-overlay" @click.self="editingUser = null">
      <div class="modal">
        <h3>Edit User</h3>
        <form @submit.prevent="updateUser">
          <div class="form-group">
            <label>Username</label>
            <input v-model="editForm.username" type="text" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="editForm.email" type="email" required />
          </div>
          <div class="form-group">
            <label>New Password (leave blank to keep)</label>
            <input v-model="editForm.password" type="password" minlength="6" />
          </div>
          <div class="form-group">
            <label>Role</label>
            <select v-model="editForm.role_id">
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="editingUser = null">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="updating">
              {{ updating ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="errorMsg" class="auth-error"><span>⚠️</span> {{ errorMsg }}</div>

    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Email</th>
          <th>Role</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.username }}</td>
          <td>{{ user.email }}</td>
          <td><span class="role-badge">{{ user.role_name }}</span></td>
          <td>{{ formatDate(user.created_at) }}</td>
          <td class="actions">
            <button class="btn btn-sm" @click="startEdit(user)">Edit</button>
            <button
              class="btn btn-danger btn-sm"
              @click="confirmDelete(user)"
              :disabled="user.id === currentUserId"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useAuth } from "../../composables/useAuth.js";

const props = defineProps({
  roles: { type: Array, required: true },
});

const { getToken, user: authUser } = useAuth();

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace("/ws", "").replace("ws://", "http://").replace("wss://", "https://")
  : import.meta.env.DEV ? "http://localhost:3001" : `${location.protocol === "https:" ? "https" : "http"}://${location.host}`;

const users = ref([]);
const errorMsg = ref("");
const showCreateModal = ref(false);
const editingUser = ref(null);
const creating = ref(false);
const updating = ref(false);

const currentUserId = computed(() => authUser.value?.id);

const newUser = ref({ username: "", email: "", password: "", role_id: "" });
const editForm = ref({ username: "", email: "", password: "", role_id: "" });

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    users.value = await res.json();
  } catch (err) {
    errorMsg.value = err.message;
  }
}

async function createUser() {
  creating.value = true;
  errorMsg.value = "";
  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(newUser.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showCreateModal.value = false;
    newUser.value = { username: "", email: "", password: "", role_id: "" };
    await fetchUsers();
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    creating.value = false;
  }
}

function startEdit(user) {
  editingUser.value = user;
  editForm.value = {
    username: user.username,
    email: user.email,
    password: "",
    role_id: user.role_id,
  };
}

async function updateUser() {
  updating.value = true;
  errorMsg.value = "";
  try {
    const body = { ...editForm.value };
    if (!body.password) delete body.password;

    const res = await fetch(`${API_BASE}/api/users/${editingUser.value.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    editingUser.value = null;
    await fetchUsers();
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    updating.value = false;
  }
}

function confirmDelete(user) {
  if (user.id === currentUserId.value) return;
  if (!confirm(`Delete user "${user.username}"?`)) return;

  fetch(`${API_BASE}/api/users/${user.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchUsers();
  }).catch((err) => {
    errorMsg.value = err.message;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString();
}

onMounted(fetchUsers);

defineExpose({ fetchUsers });
</script>
