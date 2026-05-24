<template>
  <div class="admin-page">
    <header class="admin-header">
      <h1>⚙️ Admin Panel</h1>
      <button class="btn" @click="$emit('close')">← Back to Chat</button>
    </header>

    <div class="admin-tabs">
      <button
        :class="['tab-btn', activeTab === 'users' ? 'active' : '']"
        @click="activeTab = 'users'"
      >
        👥 Users
      </button>
      <button
        :class="['tab-btn', activeTab === 'roles' ? 'active' : '']"
        @click="activeTab = 'roles'"
      >
        🔑 Roles & Permissions
      </button>
    </div>

    <div class="admin-content">
      <UserList v-if="activeTab === 'users'" ref="userListRef" :roles="roles" />
      <RoleManager v-if="activeTab === 'roles'" ref="roleManagerRef" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuth } from "../composables/useAuth.js";
import UserList from "../components/admin/UserList.vue";
import RoleManager from "../components/admin/RoleManager.vue";

defineEmits(["close"]);

const { getToken } = useAuth();
const activeTab = ref("users");
const roles = ref([]);
const userListRef = ref(null);
const roleManagerRef = ref(null);

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace("/ws", "").replace("ws://", "http://").replace("wss://", "https://")
  : import.meta.env.DEV ? "http://localhost:3001" : `${location.protocol === "https:" ? "https" : "http"}://${location.host}`;

async function fetchRoles() {
  try {
    const res = await fetch(`${API_BASE}/api/roles`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) roles.value = await res.json();
  } catch {
    // Ignore errors
  }
}

onMounted(fetchRoles);
</script>
