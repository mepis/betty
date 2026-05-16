<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon">🤖</div>
          <h1>Betty</h1>
          <p class="login-subtitle">AI Coding Assistant</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="Enter your username"
              required
              autofocus
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-login"
            :disabled="store.isLoading"
          >
            <span v-if="store.isLoading" class="spinner"></span>
            <span v-else>Sign In</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";

const store = useAuthStore();
const username = ref("");
const password = ref("");
const error = ref("");

async function handleLogin(): Promise<void> {
  error.value = "";
  try {
    await store.login(username.value, password.value);
  } catch (err) {
    error.value = (err as Error).message || "Login failed";
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: var(--bg-primary);
  font-family: var(--font-sans);
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: 0 16px 48px var(--shadow);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), #a371f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input {
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition);
}

.form-group input:focus {
  border-color: var(--accent);
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.error-message {
  padding: 10px 14px;
  border-radius: var(--radius);
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid var(--red);
  color: var(--red);
  font-size: 13px;
}

.btn-login {
  padding: 12px;
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
