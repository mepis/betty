<script setup>
import { ref, onMounted, watch } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import ConfigSection from '@/components/ConfigSection.vue'

const store = useBenchmarkStore()
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')
const configsJson = ref('')
const editMode = ref('visual') // 'json' or 'visual'
const visualConfigs = ref({})
const modelOptions = ref([])
const newGpuIndex = ref(0)

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
    visualConfigs.value = JSON.parse(JSON.stringify(store.configs))
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

function toggleGpuEnabled() {
  if (!visualConfigs.value.gpu_selection) {
    visualConfigs.value.gpu_selection = { enabled: false, gpus: [] }
  }
  visualConfigs.value.gpu_selection.enabled = !visualConfigs.value.gpu_selection.enabled
}

function addGpuIndex() {
  if (!visualConfigs.value.gpu_selection) {
    visualConfigs.value.gpu_selection = { enabled: true, gpus: [] }
  }
  const gpus = visualConfigs.value.gpu_selection.gpus || []
  const idx = newGpuIndex.value
  if (!gpus.includes(idx)) {
    gpus.push(idx)
    gpus.sort((a, b) => a - b)
    visualConfigs.value.gpu_selection.gpus = gpus
  }
  newGpuIndex.value = idx + 1
}

function removeGpuIndex(index) {
  const gpus = [...(visualConfigs.value.gpu_selection.gpus || [])]
  gpus.splice(index, 1)
  visualConfigs.value.gpu_selection.gpus = gpus
}

function toggleSplitParam(key) {
  if (!visualConfigs.value.split_params) {
    visualConfigs.value.split_params = {}
  }
  if (!visualConfigs.value.split_params[key]) {
    visualConfigs.value.split_params[key] = { enabled: false, value: '' }
  }
  visualConfigs.value.split_params[key].enabled = !visualConfigs.value.split_params[key].enabled
}

function updateSplitParamValue(key, type, value) {
  if (!visualConfigs.value.split_params) {
    visualConfigs.value.split_params = {}
  }
  if (!visualConfigs.value.split_params[key]) {
    visualConfigs.value.split_params[key] = { enabled: true, value: '' }
  }
  visualConfigs.value.split_params[key].value = type === 'number' ? Number(value) : value
}

function toggleSpecParam(key) {
  if (!visualConfigs.value.spec_params) {
    visualConfigs.value.spec_params = {}
  }
  if (!visualConfigs.value.spec_params[key]) {
    visualConfigs.value.spec_params[key] = { enabled: false, value: '' }
  }
  visualConfigs.value.spec_params[key].enabled = !visualConfigs.value.spec_params[key].enabled
}

function updateSpecParamValue(key, type, value) {
  if (!visualConfigs.value.spec_params) {
    visualConfigs.value.spec_params = {}
  }
  if (!visualConfigs.value.spec_params[key]) {
    visualConfigs.value.spec_params[key] = { enabled: true, value: '' }
  }
  visualConfigs.value.spec_params[key].value = type === 'number' ? Number(value) : value
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
          @click="switchMode('visual')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="editMode === 'visual' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
        >
          Visual Editor
        </button>
        <button
          @click="switchMode('json')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="editMode === 'json' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
        >
          JSON Editor
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

        <!-- Spec Params -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Spec Params</h4>
          <div
            v-for="param in [
              { key: 'spec_type', label: 'Spec Type', type: 'text' },
              { key: 'spec_draft_n_max', label: 'Spec Draft N-Max', type: 'number' },
            ]"
            :key="param.key"
            class="space-y-2"
          >
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-text-secondary">{{ param.label }}</span>
              <button
                @click="toggleSpecParam(param.key)"
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="(visualConfigs.spec_params?.[param.key]?.enabled ?? false) ? 'bg-accent' : 'bg-bg-tertiary'"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="(visualConfigs.spec_params?.[param.key]?.enabled ?? false) ? 'translate-x-5' : ''"
                />
              </button>
            </div>
            <div v-if="visualConfigs.spec_params?.[param.key]?.enabled" class="ml-1">
              <input
                :type="param.type === 'number' ? 'number' : 'text'"
                :value="visualConfigs.spec_params[param.key]?.value ?? ''"
                @input="updateSpecParamValue(param.key, param.type, $event.target.value)"
                class="input w-40 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- GPU Selection -->

        <!-- Split Params -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Split Params</h4>
          <div
            v-for="param in [
              { key: 'layer_split', label: 'Layer Split', type: 'text' },
              { key: 'tensor_split', label: 'Tensor Split', type: 'text' },
              { key: 'primary_gpu', label: 'Primary GPU', type: 'number' },
            ]"
            :key="param.key"
            class="space-y-2"
          >
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-text-secondary">{{ param.label }}</span>
              <button
                @click="toggleSplitParam(param.key)"
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="(visualConfigs.split_params?.[param.key]?.enabled ?? false) ? 'bg-accent' : 'bg-bg-tertiary'"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="(visualConfigs.split_params?.[param.key]?.enabled ?? false) ? 'translate-x-5' : ''"
                />
              </button>
            </div>
            <div v-if="visualConfigs.split_params?.[param.key]?.enabled" class="ml-1">
              <input
                :type="param.type === 'number' ? 'number' : 'text'"
                :value="visualConfigs.split_params[param.key]?.value ?? ''"
                @input="updateSplitParamValue(param.key, param.type, $event.target.value)"
                class="input w-40 text-xs"
              />
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">GPU Selection</h4>
          <div class="flex items-center justify-between gap-4">
            <label class="text-sm text-text-secondary">Enable GPU Selection</label>
            <button
              @click="toggleGpuEnabled()"
              class="relative w-10 h-5 rounded-full transition-colors"
              :class="(visualConfigs.gpu_selection?.enabled ?? false) ? 'bg-accent' : 'bg-bg-tertiary'"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                :class="(visualConfigs.gpu_selection?.enabled ?? false) ? 'translate-x-5' : ''"
              />
            </button>
          </div>
          <div v-if="visualConfigs.gpu_selection?.enabled" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">GPU Indices</span>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  :value="newGpuIndex"
                  @input="newGpuIndex = Number($event.target.value)"
                  class="input w-20 text-xs"
                  placeholder="GPU #"
                />
                <button
                  @click="addGpuIndex()"
                  class="btn btn-ghost btn-xs"
                  :disabled="visualConfigs.gpu_selection?.gpus?.includes(newGpuIndex)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(gpu, idx) in visualConfigs.gpu_selection?.gpus"
                :key="gpu"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-xs font-medium"
              >
                GPU {{ gpu }}
                <button
                  @click="removeGpuIndex(idx)"
                  class="ml-0.5 text-accent/60 hover:text-accent transition-colors"
                >
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
              <span v-if="!visualConfigs.gpu_selection?.gpus?.length" class="text-xs text-text-muted italic">
                No GPUs selected
              </span>
            </div>
          </div>
        </div>
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
