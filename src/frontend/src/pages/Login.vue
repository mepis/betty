<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-logo">🤖</span>
        <h1>Pi Chat</h1>
        <p>Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div v-if="errorMsg" class="auth-error">
          <span>⚠️</span> {{ errorMsg }}
        </div>

        <div class="form-group">
          <label for="username">Username</label>
          <input ref="usernameInput"
            id="username"
            v-model="username"
            type="text"
            placeholder="Enter your username"
            minlength="3"
            maxlength="30"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input ref="usernameInput"
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-full"
          :disabled="isLoading || !username || !password"
        >
          {{ isLoading ? "Signing in..." : "Sign In" }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Don't have an account? <a href="#register">Sign up</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { useAuth } from "../composables/useAuth.js";

const emit = defineEmits(["login-success"]);

const { login, isLoading, error } = useAuth();

const username = ref("");
const password = ref("");
const errorMsg = ref("");
const usernameInput = ref(null);

onMounted(async () => {
  await nextTick();
  usernameInput.value?.focus();
});

async function handleLogin() {
  errorMsg.value = "";
  try {
    const user = await login(username.value, password.value);
    emit("login-success", user);
  } catch (err) {
    errorMsg.value = err.message || error.value || "Login failed";
  }
}
</script>
