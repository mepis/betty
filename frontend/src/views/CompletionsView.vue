<script setup>
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { getCompletion } from '../api/llama'
import Sidebar from '../components/Sidebar.vue'

const settings = useSettingsStore()

const prompt = ref('')
const output = ref('')
const isLoading = ref(false)
const error = ref(null)
const usage = ref(null)

async function generate() {
  if (!prompt.value.trim() || isLoading.value) return

  isLoading.value = true
  error.value = null
  output.value = ''
  usage.value = null

  try {
    const response = await getCompletion(prompt.value, {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
    })

    output.value = response.choices?.[0]?.text || ''
    usage.value = response.usage
  } catch (e) {
    error.value = e.message || 'Failed to generate completion'
  } finally {
    isLoading.value = false
  }
}

function clear() {
  prompt.value = ''
  output.value = ''
  error.value = null
  usage.value = null
}
</script>

<template>
  <div class="flex h-screen bg-dark-950">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Area -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="flex items-center gap-3 px-4 py-3 border-b border-dark-700 bg-dark-900">
        <h2 class="font-semibold text-dark-100">Text Completions</h2>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-6">
          <!-- Prompt Input -->
          <div>
            <label class="block text-sm font-medium text-dark-200 mb-2">
              Prompt
            </label>
            <textarea
              v-model="prompt"
              :disabled="isLoading"
              rows="6"
              placeholder="Enter your prompt here..."
              class="w-full rounded-xl bg-dark-800 border border-dark-600 px-4 py-3 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <button
              @click="generate"
              :disabled="!prompt.trim() || isLoading"
              class="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg v-if="!isLoading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div v-else class="flex gap-1">
                <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
                <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
                <span class="loading-dot w-1.5 h-1.5 bg-white rounded-full"></span>
              </div>
              {{ isLoading ? 'Generating...' : 'Generate' }}
            </button>
            <button
              @click="clear"
              :disabled="isLoading"
              class="px-6 py-2.5 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-dark-100 disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
          </div>

          <!-- Error -->
          <div v-if="error" class="p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-200">
            {{ error }}
          </div>

          <!-- Output -->
          <div v-if="output">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-dark-200">Output</label>
              <div v-if="usage" class="text-xs text-dark-500">
                {{ usage.prompt_tokens }} prompt + {{ usage.completion_tokens }} completion = {{ usage.total_tokens }} tokens
              </div>
            </div>
            <div class="rounded-xl bg-dark-800 border border-dark-600 p-4">
              <pre class="text-dark-200 whitespace-pre-wrap font-mono text-sm">{{ output }}</pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
