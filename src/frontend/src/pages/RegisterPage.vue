<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <div class="logo-mark">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1>Betty</h1>
        <p>Create your account</p>
      </div>

      <div v-if="error" class="error-msg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        {{ error }}
      </div>

      <div v-if="success" class="success-msg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        {{ success }}
      </div>

      <form class="register-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Your name"
            autocomplete="name"
            :disabled="loading"
          >
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
            :disabled="loading"
            autofocus
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="At least 6 characters"
            required
            minlength="6"
            autocomplete="new-password"
            :disabled="loading"
            @input="checkPasswordStrength"
          >
          <div class="password-strength">
            <div class="strength-bar" :class="strengthClass" :style="{ width: strengthWidth }"></div>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            required
            autocomplete="new-password"
            :disabled="loading"
          >
        </div>

        <button type="submit" class="register-btn" :disabled="loading || !isValid">
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? 'Creating account...' : 'Create account' }}</span>
        </button>
      </form>

      <div class="login-link">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { authStore } from '../stores/auth.js';

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);
const strength = ref(0);

const strengthClass = computed(() => {
  if (strength.value <= 33) return 'strength-weak';
  if (strength.value <= 66) return 'strength-medium';
  return 'strength-strong';
});

const strengthWidth = computed(() => `${strength.value}%`);

const isValid = computed(() => {
  return email.value &&
    password.value &&
    confirmPassword.value &&
    password.value === confirmPassword.value &&
    password.value.length >= 6 &&
    email.value.includes('@');
});

function checkPasswordStrength() {
  const pw = password.value;
  if (!pw) {
    strength.value = 0;
    return;
  }
  let s = 0;
  if (pw.length >= 6) s += 33;
  if (pw.length >= 10) s += 33;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s += 34;
  strength.value = s;
}

async function handleRegister() {
  error.value = '';
  success.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  loading.value = true;

  try {
    await authStore.register(name.value, email.value, password.value);
    success.value = 'Account created! Redirecting...';
  } catch (err) {
    error.value = err.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // If auth is disabled or users already exist, redirect away
  fetch('/api/auth/status')
    .then(r => r.json())
    .then(data => {
      if (!data.authEnabled || data.hasUsers) {
        window.location.href = '/login';
      }
    })
    .catch(() => {});
});
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.register-container {
  width: 100%;
  max-width: 400px;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-mark {
  width: 48px;
  height: 48px;
  background: var(--accent-dim);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin: 0 auto 16px;
}

.register-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.register-header p {
  font-size: 14px;
  color: var(--text-muted);
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.success-msg {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.register-form {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus {
  border-color: var(--accent);
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.password-strength {
  height: 3px;
  border-radius: 2px;
  margin-top: 6px;
  background: var(--border);
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s;
}

.strength-weak {
  background: #ef4444;
}

.strength-medium {
  background: #f59e0b;
}

.strength-strong {
  background: #22c55e;
}

.register-btn {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: var(--btn-primary-text);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
}

.register-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.register-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-link {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.login-link a {
  color: var(--accent);
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
