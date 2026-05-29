<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();
const settings = ref({
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  theme: 'light' as string,
});
const savedMessage = ref(false);

onMounted(() => {
  const stored = localStorage.getItem('betty_settings');
  if (stored) { try { Object.assign(settings.value, JSON.parse(stored)); } catch { /* ignore */ } }
});

function saveSettings(): void {
  localStorage.setItem('betty_settings', JSON.stringify(settings.value));
  savedMessage.value = true;
  setTimeout(() => { savedMessage.value = false; }, 2000);
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-2xl mx-auto px-6 py-8">
      <h1 class="text-2xl font-semibold text-slate-900 mb-6">Settings</h1>

      <!-- Model Settings -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-slate-900 mb-4">AI Model</h2>
        <div class="space-y-4 bg-white rounded-xl border border-slate-200 p-5">
          <!-- Model selector -->
          <div>
            <label for="model" class="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
            <select id="model" v-model="settings.model"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            </select>
          </div>

          <!-- Temperature -->
          <div>
            <label for="temperature" class="block text-sm font-medium text-slate-700 mb-1.5">Temperature: {{ settings.temperature }}</label>
            <input id="temperature" v-model.number="settings.temperature" type="range" min="0" max="2" step="0.1"
              class="w-full accent-indigo-600" />
          </div>

          <!-- Max Tokens -->
          <div>
            <label for="maxTokens" class="block text-sm font-medium text-slate-700 mb-1.5">Max Tokens</label>
            <input id="maxTokens" v-model.number="settings.maxTokens" type="number" min="1" max="128000"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>

          <!-- System Prompt -->
          <div>
            <label for="systemPrompt" class="block text-sm font-medium text-slate-700 mb-1.5">System Prompt</label>
            <textarea id="systemPrompt" v-model="settings.systemPrompt" rows="4"
              placeholder="You are a helpful assistant…"
              class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y" />
          </div>
        </div>
      </section>

      <!-- Appearance -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-slate-900 mb-4">Appearance</h2>
        <div class="space-y-3 bg-white rounded-xl border border-slate-200 p-5">
          <label for="theme" class="flex items-center justify-between cursor-pointer">
            <span class="text-sm font-medium text-slate-700">Theme</span>
            <select id="theme" v-model="settings.theme"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
      </section>

      <!-- Account -->
      <section class="mb-8">
        <h2 class="text-lg font-medium text-slate-900 mb-4">Account</h2>
        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <p class="text-sm text-slate-600"><span class="font-medium">Username:</span> {{ authStore.user?.username }}</p>
          <p class="text-sm text-slate-600"><span class="font-medium">Display Name:</span> {{ authStore.user?.displayName }}</p>
          <button @click="authStore.logout(); $router.push({ name: 'Login' })"
            class="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
            Sign Out
          </button>
        </div>
      </section>

      <!-- Save button -->
      <div class="flex justify-end gap-3">
        <span v-if="savedMessage" class="text-green-600 text-sm self-center">Saved!</span>
        <button @click="saveSettings"
          class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
          Save Settings
        </button>
      </div>
    </div>
  </div>
</template>
