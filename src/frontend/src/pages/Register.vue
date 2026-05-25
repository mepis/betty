<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-logo">🤖</span>
        <h1>Pi Chat</h1>
        <p>Create your account</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div v-if="errorMsg" class="auth-error">
          <span>⚠️</span> {{ errorMsg }}
        </div>

        <div class="form-group">
          <label for="reg-username">Username</label>
          <input
            ref="usernameInput"
            id="reg-username"
            v-model="username"
            type="text"
            placeholder="Choose a username"
            minlength="3"
            maxlength="30"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label for="reg-email">Email</label>
          <input
            id="reg-email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
        </div>

        <div class="form-group">
          <label for="reg-password">Password</label>
          <input
            id="reg-password"
            v-model="password"
            type="password"
            placeholder="At least 6 characters"
            minlength="6"
            autocomplete="new-password"
            required
          />
        </div>

        <div class="form-group">
          <label for="reg-confirm">Confirm Password</label>
          <input
            id="reg-confirm"
            v-model="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            autocomplete="new-password"
            required
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-full"
          :disabled="isLoading || !canSubmit"
        >
          {{ isLoading ? "Creating account..." : "Sign Up" }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Already have an account? <a href="#login">Sign in</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useAuth } from "../composables/useAuth.js";

const emit = defineEmits(["register-success"]);

const { register, isLoading, error } = useAuth();

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMsg = ref("");
const usernameInput = ref(null);

const canSubmit = computed(() => {
  return username.value && email.value && password.value && confirmPassword.value
    && password.value === confirmPassword.value;
});

onMounted(async () => {
  await nextTick();
  usernameInput.value?.focus();
});

async function handleRegister() {
  errorMsg.value = "";

  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match";
    return;
  }

  try {
    const user = await register(username.value, email.value, password.value);
    emit("register-success", user);
  } catch (err) {
    errorMsg.value = err.message || error.value || "Registration failed";
  }
}
</script>
