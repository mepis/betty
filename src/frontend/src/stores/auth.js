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
     * Set the error message (for clearing errors).
     */
    setError(message) {
      this.error = message;
    },
  },
});
