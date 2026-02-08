import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '../api/llama';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const error = ref(null);
  const isLoading = ref(false);
  const users = ref([]);
  const usersLoading = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  // Actions
  async function login(username, password) {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await api.login(username, password);
      user.value = data.user;
      return data;
    } catch (err) {
      error.value = err.message || 'Login failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    error.value = null;

    try {
      await api.logout();
      user.value = null;
    } catch (err) {
      error.value = err.message || 'Logout failed';
      // Clear user anyway on logout failure
      user.value = null;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser() {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await api.getCurrentUser();
      user.value = data.user;
      return data;
    } catch (err) {
      if (err.status === 401) {
        // Not authenticated - clear user
        user.value = null;
      } else {
        error.value = err.message || 'Failed to fetch user';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function checkFirstSetup() {
    try {
      const data = await api.checkFirstSetup();
      return data.needsSetup;
    } catch (err) {
      error.value = err.message || 'Failed to check setup status';
      return false;
    }
  }

  async function completeSetup(username, email, password) {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await api.setupAdmin(username, email, password);
      return data;
    } catch (err) {
      error.value = err.message || 'Setup failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  // User Management Actions (Admin only)
  async function fetchUsers() {
    usersLoading.value = true;
    error.value = null;

    try {
      const data = await api.getUsers();
      users.value = data.users;
      return data.users;
    } catch (err) {
      error.value = err.message || 'Failed to fetch users';
      throw err;
    } finally {
      usersLoading.value = false;
    }
  }

  async function createUser(username, email, password, role = 'user') {
    error.value = null;

    try {
      const data = await api.createUser(username, email, password, role);
      users.value.push(data.user);
      return data.user;
    } catch (err) {
      error.value = err.message || 'Failed to create user';
      throw err;
    }
  }

  async function updateUser(userId, updates) {
    error.value = null;

    try {
      const data = await api.updateUser(userId, updates);
      const index = users.value.findIndex(u => u.id === userId);
      if (index !== -1) {
        users.value[index] = data.user;
      }
      return data.user;
    } catch (err) {
      error.value = err.message || 'Failed to update user';
      throw err;
    }
  }

  async function updateUserPassword(userId, password) {
    error.value = null;

    try {
      await api.updateUserPassword(userId, password);
      return true;
    } catch (err) {
      error.value = err.message || 'Failed to update password';
      throw err;
    }
  }

  async function deleteUser(userId) {
    error.value = null;

    try {
      await api.deleteUser(userId);
      users.value = users.value.filter(u => u.id !== userId);
      return true;
    } catch (err) {
      error.value = err.message || 'Failed to delete user';
      throw err;
    }
  }

  return {
    // State
    user,
    error,
    isLoading,
    users,
    usersLoading,

    // Getters
    isAuthenticated,
    isAdmin,

    // Actions
    login,
    logout,
    fetchCurrentUser,
    checkFirstSetup,
    completeSetup,
    clearError,

    // User Management (Admin)
    fetchUsers,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
  };
});
