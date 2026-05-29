import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const useAuthStore = defineStore('auth', () => {
    // State — persisted to localStorage
    const token = ref(localStorage.getItem('betty_token') || '');
    const user = ref(null);
    if (token.value) {
        try {
            const saved = localStorage.getItem('betty_user');
            if (saved)
                user.value = JSON.parse(saved);
        }
        catch { /* ignore */ }
    }
    // Getters
    const isAuthenticated = computed(() => !!token.value && !!user.value);
    // Actions
    async function login(username, password) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Login failed' }));
            throw new Error(err.error || 'Login failed');
        }
        const data = await res.json();
        token.value = data.token;
        user.value = data.user;
        localStorage.setItem('betty_token', data.token);
        localStorage.setItem('betty_user', JSON.stringify(data.user));
        return data;
    }
    async function register(username, displayName, password) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayName, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Registration failed' }));
            throw new Error(err.error || 'Registration failed');
        }
        const data = await res.json();
        token.value = data.token;
        user.value = data.user;
        localStorage.setItem('betty_token', data.token);
        localStorage.setItem('betty_user', JSON.stringify(data.user));
        return data;
    }
    async function fetchMe() {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token.value}` },
            });
            if (!res.ok) {
                logout();
                return null;
            }
            const data = await res.json();
            user.value = data.user;
            localStorage.setItem('betty_user', JSON.stringify(data.user));
            return data.user;
        }
        catch {
            logout();
            return null;
        }
    }
    function logout() {
        token.value = '';
        user.value = null;
        localStorage.removeItem('betty_token');
        localStorage.removeItem('betty_user');
    }
    return { token, user, isAuthenticated, login, register, fetchMe, logout };
});
//# sourceMappingURL=auth.js.map