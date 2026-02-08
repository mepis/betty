<script setup>
import { ref, onMounted } from 'vue'
import { getModels } from '../api/llama'

const models = ref([])
const selectedModel = ref('llama')
const loading = ref(false)
const error = ref(null)

async function fetchModels() {
  loading.value = true
  error.value = null
  try {
    const response = await getModels()
    models.value = response.data || []
    if (models.value.length > 0) {
      selectedModel.value = models.value[0].id
    }
  } catch (e) {
    error.value = e.message
    console.error('Failed to fetch models:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchModels)
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-dark-200 mb-2">
      Model
    </label>
    <div v-if="loading" class="text-sm text-dark-400">Loading models...</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>
    <select
      v-else
      v-model="selectedModel"
      class="w-full rounded-lg bg-dark-800 border border-dark-600 px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      <option v-for="model in models" :key="model.id" :value="model.id">
        {{ model.id }}
      </option>
      <option v-if="models.length === 0" value="llama">llama (default)</option>
    </select>
  </div>
</template>
