import { defineStore } from "pinia";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("betty-token") || null,
    user: null, // { id, username, role }
    loading: false,
    error: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === "admin",
    isOperator: (state) => state.user?.role === "operator",
    isViewer: (state) => state.user?.role === "viewer",
    canEdit: (state) => ["admin", "operator"].includes(state.user?.role),
    canAdmin: (state) => state.user?.role === "admin",
  },

  actions: {
    /**
     * Restore session from localStorage on page load.
     */
    async restoreSession() {
      if (!this.token) {
        this.user = null;
        return;
      }

      this.loading = true;
      try {
        const { data } = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (data.success) {
          this.user = data.data;
        } else {
          this.logout();
        }
      } catch (err) {
        console.error("[auth] Failed to restore session:", err.message);
        this.logout();
      } finally {
        this.loading = false;
      }
    },

    /**
     * Login with username and password.
     */
    async login(username, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.post(`${API_BASE}/api/auth/login`, {
          username,
          password,
        });
        if (data.success) {
          this.token = data.data.token;
          this.user = data.data.user;
          localStorage.setItem("betty-token", data.data.token);
          // Set default auth header for all future requests
          axios.defaults.headers.common["Authorization"] = `Bearer ${data.data.token}`;
          return true;
        } else {
          this.error = data.error || "Login failed";
          return false;
        }
      } catch (err) {
        this.error = err.response?.data?.error || "Network error";
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Register a new user.
     */
    async register(username, password, role) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.post(`${API_BASE}/api/auth/register`, {
          username,
          password,
          role,
        });
        if (data.success) {
          this.token = data.data.token;
          this.user = data.data.user;
          localStorage.setItem("betty-token", data.data.token);
          axios.defaults.headers.common["Authorization"] = `Bearer ${data.data.token}`;
          return true;
        } else {
          this.error = data.error || "Registration failed";
          return false;
        }
      } catch (err) {
        this.error = err.response?.data?.error || "Network error";
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout and clear session.
     */
    logout() {
      this.token = null;
      this.user = null;
      this.error = null;
      localStorage.removeItem("betty-token");
      delete axios.defaults.headers.common["Authorization"];
    },

    /**
     * Change the current user's password.
     */
    async changePassword(currentPassword, newPassword) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.put(
          `${API_BASE}/api/auth/password`,
          { currentPassword, newPassword },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        if (data.success) {
          return true;
        } else {
          this.error = data.error || "Failed to change password";
          return false;
        }
      } catch (err) {
        this.error = err.response?.data?.error || "Network error";
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Set the error message (for clearing errors).
     */
    setError(message) {
      this.error = message;
    },

    /**
     * Fetch all users (admin only).
     */
    async fetchUsers() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.get(`${API_BASE}/api/auth/users`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (data.success) {
          return data.data;
        } else {
          this.error = data.error || 'Failed to fetch users';
          return [];
        }
      } catch (err) {
        this.error = err.response?.data?.error || 'Network error';
        return [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update an existing user (role and/or password).
     */
    async updateUser(username, updates) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.put(
          `${API_BASE}/api/auth/users/${encodeURIComponent(username)}`,
          updates,
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        if (data.success) {
          return data.data;
        } else {
          this.error = data.error || 'Failed to update user';
          return null;
        }
      } catch (err) {
        this.error = err.response?.data?.error || 'Network error';
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete a user by username.
     */
    async deleteUser(username) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.delete(
          `${API_BASE}/api/auth/users/${encodeURIComponent(username)}`,
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        if (data.success) {
          return data.data;
        } else {
          this.error = data.error || 'Failed to delete user';
          return null;
        }
      } catch (err) {
        this.error = err.response?.data?.error || 'Network error';
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create a new user (admin only).
     * Unlike register(), this does NOT set session state.
     */
    async createUser(username, password, role) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.post(
          `${API_BASE}/api/auth/register`,
          { username, password, role },
          { headers: { Authorization: `Bearer ${this.token}` } }
        );
        if (data.success) {
          return data.data;
        } else {
          this.error = data.error || 'Failed to create user';
          return null;
        }
      } catch (err) {
        this.error = err.response?.data?.error || 'Network error';
        return null;
      } finally {
        this.loading = false;
      }
    },
  },
});
