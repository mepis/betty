import { ref, readonly, computed } from "vue";

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace("/ws", "").replace("ws://", "http://").replace("wss://", "https://")
  : import.meta.env.DEV
    ? "http://localhost:3001"
    : `${location.protocol === "https:" ? "https" : "http"}://${location.host}`;

// Shared state
const token = ref(localStorage.getItem("betty_token") || "");
const currentUser = ref(null);
const isLoading = ref(false);
const error = ref(null);

/**
 * Auth composable for managing user authentication state
 */
export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);

  /**
   * Login with username and password
   */
  async function login(username, password) {
    isLoading.value = true;
    error.value = null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      token.value = data.token;
      currentUser.value = data.user;
      localStorage.setItem("betty_token", data.token);
      return data.user;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Register a new user
   */
  async function register(username, email, password) {
    isLoading.value = true;
    error.value = null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      token.value = data.token;
      currentUser.value = data.user;
      localStorage.setItem("betty_token", data.token);
      return data.user;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logout current user
   */
  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
      });
    } catch {
      // Ignore logout API errors
    } finally {
      token.value = "";
      currentUser.value = null;
      localStorage.removeItem("betty_token");
    }
  }

  /**
   * Fetch current user info
   */
  async function fetchUser() {
    if (!token.value) {
      currentUser.value = null;
      return null;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });

      if (!res.ok) {
        // Token might be expired
        token.value = "";
        localStorage.removeItem("betty_token");
        currentUser.value = null;
        return null;
      }

      currentUser.value = await res.json();
      return currentUser.value;
    } catch {
      return null;
    }
  }

  /**
   * Get the current token
   */
  function getToken() {
    return token.value;
  }

  /**
   * Check if user has a specific permission
   */
  function hasPermission(resource, action) {
    const role = currentUser.value?.role;
    if (!role) return false;
    if (role === "super_admin") return true;

    // Role-based permission matrix (mirrors backend)
    const rolePermissions = {
      admin: [
        "users:create", "users:read", "users:update", "users:delete",
        "roles:create", "roles:read", "roles:update", "roles:delete",
        "sessions:create", "sessions:read", "sessions:update", "sessions:delete",
        "chat:use",
      ],
      moderator: [
        "users:read", "users:update",
        "sessions:read",
        "chat:use",
      ],
      user: [
        "sessions:create", "sessions:read", "sessions:update", "sessions:delete",
        "chat:use",
      ],
    };

    const perms = rolePermissions[role] || [];
    return perms.includes(`${resource}:${action}`);
  }

  /**
   * Check if user is admin or super_admin
   */
  function isAdmin() {
    const role = currentUser.value?.role;
    return role === "admin" || role === "super_admin";
  }

  /**
   * Sync auth state with localStorage.
   * Call this on route changes to handle cases where localStorage was
   * modified externally (e.g., by another tab, browser devtools, or test frameworks).
   */
  function syncWithStorage() {
    const stored = localStorage.getItem("betty_token");
    if (stored !== token.value) {
      token.value = stored || "";
      if (!stored) {
        currentUser.value = null;
      }
    }
  }

  return {
    token,
    user: readonly(currentUser),
    isAuthenticated,
    isLoading: readonly(isLoading),
    error: readonly(error),
    login,
    register,
    logout,
    fetchUser,
    getToken,
    hasPermission,
    isAdmin,
    syncWithStorage,
  };
}
