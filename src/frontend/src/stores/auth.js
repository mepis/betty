import { ref, computed } from 'vue';

// Auth state
const user = ref(null);
const isAuthenticated = ref(false);
const authEnabled = ref(true);

// ─── API Helpers ────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Type': 'api',
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (response.status === 401) {
    // Token expired or invalid — clear auth and redirect
    logout();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  return response;
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function login(email, password) {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  user.value = data.user;
  isAuthenticated.value = true;
  return data;
}

async function register(name, email, password) {
  const response = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  user.value = data.user;
  isAuthenticated.value = true;
  return data;
}

function logout() {
  fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});

  user.value = null;
  isAuthenticated.value = false;
}

async function init() {
  try {
    // Check auth status first
    const statusRes = await fetch('/api/auth/status');
    const statusData = await statusRes.json();
    authEnabled.value = statusData.authEnabled;

    if (!authEnabled.value) {
      isAuthenticated.value = true;
      return;
    }

    if (!statusData.hasUsers) {
      // No users yet — redirect to register
      if (window.location.pathname !== '/register') {
        window.location.href = '/register';
      }
      return;
    }

    // Check if user is authenticated
    const meRes = await fetch('/api/me', { credentials: 'include' });
    if (meRes.ok) {
      const meData = await meRes.json();
      if (meData.user) {
        user.value = meData.user;
        isAuthenticated.value = true;
      } else {
        // Not authenticated — redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else {
      // Not authenticated — redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  } catch (err) {
    console.error('[auth] Init error:', err);
    // On error, redirect to login as a safety measure
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }
}

export const authStore = {
  user,
  isAuthenticated,
  authEnabled,
  login,
  register,
  logout,
  init,
};
