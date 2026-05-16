import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { User, UserRole } from "@/types";

const TOKEN_KEY = "betty_token";

export const useAuthStore = defineStore("auth", () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<User | null>(null);
  const isLoading = ref(false);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === "admin");

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Login with username and password. */
  async function login(username: string, password: string): Promise<void> {
    isLoading.value = true;
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Login failed");
      }
      token.value = data.token;
      user.value = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
    } finally {
      isLoading.value = false;
    }
  }

  /** Logout and clear session. */
  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  /** Load existing session from localStorage. */
  async function loadSession(): Promise<void> {
    if (!token.value) return;
    try {
      const resp = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (!resp.ok) {
        // Token is invalid, clear session
        logout();
        return;
      }
      const data = await resp.json();
      user.value = data;
    } catch {
      logout();
    }
  }

  /** Validate a token by calling /api/me. */
  async function validateToken(t: string): Promise<boolean> {
    try {
      const resp = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  loadSession();

  return {
    token,
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    loadSession,
    validateToken,
  } as const;
});
