import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { User, UserRole } from "@/types";

const TOKEN_KEY = "betty_token";

export const useAuthStore = defineStore("auth", () => {
  // ─── State ────────────────────────────────────────────────────────────────
  // A-01: Wrap localStorage access in try/catch to prevent crashes in private browsing
  let storedToken: string | null = null;
  try {
    storedToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage may be unavailable (private browsing, cookie settings)
    console.warn("[auth] localStorage unavailable, token not loaded from storage");
  }
  const token = ref<string | null>(storedToken);
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
      // A-05: Verify token is a string before storing
      if (typeof data.token !== "string" || !data.token) {
        throw new Error("Invalid token received from server");
      }
      token.value = data.token;
      user.value = data.user;
      try {
        localStorage.setItem(TOKEN_KEY, data.token);
      } catch {
        // localStorage may be unavailable in private browsing
        console.warn("[auth] Could not persist token to localStorage");
      }
    } finally {
      isLoading.value = false;
    }
  }

  /** Logout and clear session. */
  function logout(): void {
    token.value = null;
    user.value = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // localStorage may be unavailable
    }
  }

  /** Load existing session from localStorage. */
  async function loadSession(): Promise<void> {
    if (!token.value) return;
    try {
      const resp = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (!resp.ok) {
        logout();
        return;
      }
      const data = await resp.json();
      user.value = data;
    } catch {
      logout();
    }
  }

  /** Validate a token by checking expiry locally first, then falling back to /api/me. */
  async function validateToken(t: string): Promise<boolean> {
    // Fast path: check JWT expiry locally (no network round-trip)
    try {
      const parts = t.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8")
        );
        if (payload.exp && typeof payload.exp === "number" && Date.now() >= payload.exp * 1000) {
          return false;
        }
      }
    } catch {
      // Malformed JWT — fall through to API validation
    }
    // Slow path: validate via server
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
  // A-11: Fire-and-forget session load on initialization (error handled below)
  loadSession().catch((err) => {
    console.warn("[auth] Session load failed:", err);
  });

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
