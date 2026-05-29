<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin(): Promise<void> {
  if (!username.value.trim() || !password.value) {
    error.value = 'Username and password are required';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    await authStore.login(username.value, password.value);
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
    <div class="w-full max-w-md">
      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Betty</h1>
        <p class="mt-2 text-slate-600">Sign in to your account</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {{ error }}
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input id="username" v-model.trim="username" type="text" required autocomplete="username"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input id="password" v-model="password" type="password" required autocomplete="current-password"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
          </div>

          <!-- Submit -->
          <button type="submit" :disabled="loading"
            class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75"/></svg>
              Signing in...
            </span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="mt-6 text-center">
          <p class="text-sm text-slate-600">
            Don't have an account?
            <router-link to="/register" class="text-indigo-600 hover:text-indigo-700 font-medium">Sign up</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
