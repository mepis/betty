<script setup>
import { ref, onMounted, watch } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import ConfigSection from '@/components/ConfigSection.vue'

const store = useBenchmarkStore()
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')
const configsJson = ref('')
const editMode = ref('json') // 'json' or 'visual'
const visualConfigs = ref({})
const modelOptions = ref([])

async function fetchModelsForDirectory(dir) {
  if (!dir) {
    modelOptions.value = []
    return
  }
  await store.fetchModels(dir)
  modelOptions.value = store.models || []
}

watch(
  () => visualConfigs.value?.model_directory,
  async (newDir, oldDir) => {
    if (newDir !== oldDir) {
      await fetchModelsForDirectory(newDir)
    }
  }
)

onMounted(async () => {
  await store.fetchConfigs()
  if (store.configs) {
    configsJson.value = JSON.stringify(store.configs, null, 2)
    await fetchModelsForDirectory(store.configs.model_directory || '')
  }
})

function switchMode(mode) {
  editMode.value = mode
  if (mode === 'json' && store.configs) {
    configsJson.value = JSON.stringify(store.configs, null, 2)
  }
  if (mode === 'visual' && store.configs) {
    visualConfigs.value = JSON.parse(JSON.stringify(store.configs))
    fetchModelsForDirectory(store.configs.model_directory || '')
  }
}

async function handleSave() {
  if (saving.value) return
  saveError.value = ''
  saving.value = true

  try {
    let configs
    if (editMode.value === 'json') {
      configs = JSON.parse(configsJson.value)
    } else {
      configs = visualConfigs.value
    }
    const ok = await store.saveConfigs(configs)
    if (ok) {
      saveSuccess.value = true
      setTimeout(() => (saveSuccess.value = false), 3000)
    } else {
      saveError.value = 'Failed to save configs'
    }
  } catch (e) {
    saveError.value = e.message || 'Invalid JSON'
  }
  saving.value = false
}

function handleReset() {
  if (store.configs) {
    if (editMode.value === 'json') {
      configsJson.value = JSON.stringify(store.configs, null, 2)
    } else {
      visualConfigs.value = JSON.parse(JSON.stringify(store.configs))
      fetchModelsForDirectory(store.configs.model_directory || '')
    }
  }
  saveError.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- Info -->
    <div class="card">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-sm font-medium text-text-primary">Configuration</h3>
          <p class="text-xs text-text-muted mt-1">
            Edit benchmark configuration. Changes are saved to <code class="text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">configs.json</code>.
            Restart the benchmark to apply changes.
          </p>
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="card">
      <!-- Mode tabs -->
      <div class="flex items-center gap-2 mb-4">
        <button
          @click="switchMode('json')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="editMode === 'json' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
        >
          JSON Editor
        </button>
        <button
          @click="switchMode('visual')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="editMode === 'visual' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
        >
          Visual Editor
        </button>
      </div>

      <!-- JSON Editor -->
      <div v-if="editMode === 'json'">
        <textarea
          v-model="configsJson"
          class="textarea font-mono text-xs h-[600px]"
          spellcheck="false"
        />
      </div>

      <!-- Visual Editor -->
      <div v-else class="space-y-4 max-h-[600px] overflow-auto pr-2">
        <config-section
          title="General"
          :items="[
            { key: 'max_sys_mem', label: 'Max System Memory (%)', type: 'number' },
            { key: 'llama_port', label: 'Llama Port', type: 'number' },
            { key: 'llama_host', label: 'Llama Host', type: 'text' },
            { key: 'model', label: 'Model', type: 'select' },
            { key: 'model_directory', label: 'Model Directory', type: 'text' },
            { key: 'llama_cache', label: 'Llama Cache', type: 'text' },
            { key: 'build_cores', label: 'Build Cores', type: 'number' },
            { key: 'skip_build', label: 'Skip Build', type: 'boolean' },
          ]"
          :model-options="modelOptions"
          v-model="visualConfigs"
        />
        <config-section
          title="Model Configs"
          :items="[
            { key: 'temp', label: 'Temperature', type: 'number' },
            { key: 'top_p', label: 'Top P', type: 'number' },
            { key: 'min_p', label: 'Min P', type: 'number' },
            { key: 'top_k', label: 'Top K', type: 'number' },
          ]"
          v-model="visualConfigs.model_configs"
        />
        <config-section
          title="Test Parameters"
          :items="[
            { key: 'context_length', label: 'Context Length', type: 'number' },
            { key: 'context_length_multiplier', label: 'Context Length Multiplier', type: 'number' },
            { key: 'context_length_max', label: 'Context Length Max', type: 'number' },
            { key: 'gpu_layer_offload', label: 'GPU Layer Offload', type: 'number' },
            { key: 'batch_size', label: 'Batch Size', type: 'number' },
            { key: 'batch_size_step', label: 'Batch Size Step', type: 'number' },
            { key: 'batch_size_max', label: 'Batch Size Max', type: 'number' },
            { key: 'u_batch_size', label: 'U Batch Size', type: 'number' },
            { key: 'u_batch_size_step', label: 'U Batch Size Step', type: 'number' },
            { key: 'u_batch_size_max', label: 'U Batch Size Max', type: 'number' },
            { key: 'cache_ram', label: 'Cache RAM (GB)', type: 'number' },
            { key: 'cache_ram_step', label: 'Cache RAM Step', type: 'number' },
            { key: 'cache_ram_max', label: 'Cache RAM Max', type: 'number' },
          ]"
          v-model="visualConfigs.test_params"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <span class="text-xs text-text-muted">
          {{ saveSuccess ? '✓ Saved successfully' : saveError }}
        </span>
        <div class="flex items-center gap-2">
          <button @click="handleReset" class="btn btn-ghost btn-sm">Reset</button>
          <button
            @click="handleSave"
            class="btn btn-primary btn-sm"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save Config' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
