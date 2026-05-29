<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister(): Promise<void> {
  if (!username.value.trim() || !displayName.value.trim() || !password.value) {
    error.value = 'All fields are required';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    await authStore.register(username.value, displayName.value, password.value);
    router.push('/');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Betty</h1>
        <p class="mt-2 text-slate-600">Create your account</p>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-8">
        <form @submit.prevent="handleRegister" class="space-y-5">
          <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {{ error }}
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input id="username" v-model.trim="username" type="text" required minlength="3" maxlength="30" autocomplete="username"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <!-- Display Name -->
          <div>
            <label for="displayName" class="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
            <input id="displayName" v-model.trim="displayName" type="text" required maxlength="50" autocomplete="name"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input id="password" v-model="password" type="password" required minlength="8" autocomplete="new-password"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
            <input id="confirmPassword" v-model="confirmPassword" type="password" required minlength="8" autocomplete="new-password"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <button type="submit" :disabled="loading"
            class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg transition">
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75"/></svg>
              Creating account...
            </span>
            <span v-else>Create Account</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-slate-600">
            Already have an account?
            <router-link to="/login" class="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
