<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import ConfigSection from '@/components/ConfigSection.vue'

const store = useBenchmarkStore()
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')
const visualConfigs = ref({})
const modelOptions = ref([])
const newGpuIndex = ref(0)
const showBuildLogs = ref(false)
const buildLogContainer = ref(null)
const buildLogAnchor = ref(null)
const activeTab = ref('build') // 'build' | 'other'

// Profile state
const profiles = ref([])
const showProfilePanel = ref(false)
const profileName = ref('')
const savingProfile = ref(false)
const profileAction = ref('') // 'save' | 'load' | 'delete'
const profileMessage = ref('')
const profileMessageError = ref(false)

async function loadProfiles() {
  try {
    await store.fetchProfiles()
    profiles.value = store.profiles || []
  } catch (e) {
    console.error('Failed to load profiles:', e)
  }
}

async function handleSaveProfile() {
  if (savingProfile.value) return
  if (!profileName.value.trim()) {
    profileMessage.value = 'Profile name is required'
    profileMessageError.value = true
    return
  }

  savingProfile.value = true
  profileMessage.value = ''
  profileMessageError.value = false

  try {
    const configs = flattenBuildParams(JSON.parse(JSON.stringify(visualConfigs.value)))
    const ok = await store.saveProfile(profileName.value.trim(), configs)
    if (ok) {
      profileMessage.value = `Profile "${profileName.value}" saved successfully`
      profileMessageError.value = false
      profileName.value = ''
      await loadProfiles()
    } else {
      profileMessage.value = 'Failed to save profile'
      profileMessageError.value = true
    }
  } catch (e) {
    profileMessage.value = e.message || 'Invalid JSON'
    profileMessageError.value = true
  }
  savingProfile.value = false
}

async function handleLoadProfile(name) {
  if (profileAction.value) return
  if (!confirm(`Load profile "${name}"? This will overwrite your current configs.`)) return

  profileAction.value = 'load'
  try {
    const ok = await store.loadProfile(name)
    if (ok) {
      profileMessage.value = `Profile "${name}" loaded successfully`
      profileMessageError.value = false
      // Refresh visual configs
      if (store.configs) {
        visualConfigs.value = normalizeBuildParams(JSON.parse(JSON.stringify(store.configs)))
        await fetchModelsForDirectory(store.configs.model_directory || '')
      }
    } else {
      profileMessage.value = 'Failed to load profile'
      profileMessageError.value = true
    }
  } catch (e) {
    profileMessage.value = e.message
    profileMessageError.value = true
  }
  profileAction.value = ''
}

async function handleDeleteProfile(name) {
  if (profileAction.value) return
  if (!confirm(`Delete profile "${name}"?`)) return

  profileAction.value = 'delete'
  try {
    const ok = await store.deleteProfile(name)
    if (ok) {
      profileMessage.value = `Profile "${name}" deleted`
      profileMessageError.value = false
      await loadProfiles()
    } else {
      profileMessage.value = 'Failed to delete profile'
      profileMessageError.value = true
    }
  } catch (e) {
    profileMessage.value = e.message
    profileMessageError.value = true
  }
  profileAction.value = ''
}

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

// Auto-scroll build logs
watch(
  () => store.buildLogs.length,
  async () => {
    await nextTick()
    if (buildLogContainer.value) {
      buildLogContainer.value.scrollTop = buildLogContainer.value.scrollHeight
    }
  },
)

onMounted(async () => {
  await store.fetchConfigs()
  if (store.configs) {
    visualConfigs.value = normalizeBuildParams(
      JSON.parse(JSON.stringify(store.configs))
    )
    await fetchModelsForDirectory(store.configs.model_directory || '')
  }
  await loadProfiles()
})

function flattenBuildParams(configs) {
  const params = configs.build_make_params || {}
  const flat = {}
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'object' && val !== null && 'enabled' in val) {
      flat[key] = val.enabled ? (val.value || true) : false
    } else {
      flat[key] = val
    }
  }
  configs.build_make_params = flat

  const cuda = configs.cuda_configs || {}
  const cudaFlat = {}
  for (const [key, val] of Object.entries(cuda)) {
    if (typeof val === 'object' && val !== null && 'enabled' in val) {
      cudaFlat[key] = val.enabled ? (val.value || true) : false
    } else {
      cudaFlat[key] = val
    }
  }
  configs.cuda_configs = cudaFlat
  return configs
}

async function handleSave() {
  if (saving.value) return
  saveError.value = ''
  saving.value = true

  try {
    const configs = flattenBuildParams(JSON.parse(JSON.stringify(visualConfigs.value)))
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
    visualConfigs.value = normalizeBuildParams(
      JSON.parse(JSON.stringify(store.configs))
    )
    fetchModelsForDirectory(store.configs.model_directory || '')
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

function toggleBuildParam(key) {
  if (!visualConfigs.value.build_make_params) {
    visualConfigs.value.build_make_params = {}
  }
  if (!visualConfigs.value.build_make_params[key]) {
    visualConfigs.value.build_make_params[key] = { enabled: false, value: '' }
  }
  visualConfigs.value.build_make_params[key].enabled =
    !visualConfigs.value.build_make_params[key].enabled

  // Mutual exclusion: GGML Native vs Custom CUDA Architecture
  if (key === 'enable_ggml_native' && visualConfigs.value.build_make_params[key].enabled) {
    if (!visualConfigs.value.build_make_params.enable_cuda_custom_arch) {
      visualConfigs.value.build_make_params.enable_cuda_custom_arch = { enabled: false, value: '' }
    }
    visualConfigs.value.build_make_params.enable_cuda_custom_arch.enabled = false
  }
  if (key === 'enable_cuda_custom_arch' && visualConfigs.value.build_make_params[key].enabled) {
    if (!visualConfigs.value.build_make_params.enable_ggml_native) {
      visualConfigs.value.build_make_params.enable_ggml_native = { enabled: false, value: '' }
    }
    visualConfigs.value.build_make_params.enable_ggml_native.enabled = false
  }
}

function updateBuildParamValue(key, type, value) {
  if (!visualConfigs.value.build_make_params) {
    visualConfigs.value.build_make_params = {}
  }
  if (!visualConfigs.value.build_make_params[key]) {
    visualConfigs.value.build_make_params[key] = { enabled: true, value: '' }
  }
  visualConfigs.value.build_make_params[key].value =
    type === 'number' ? Number(value) : value
}

function toggleCudaConfig(key) {
  if (!visualConfigs.value.cuda_configs) {
    visualConfigs.value.cuda_configs = {}
  }
  if (!visualConfigs.value.cuda_configs[key]) {
    visualConfigs.value.cuda_configs[key] = { enabled: false, value: '' }
  }
  visualConfigs.value.cuda_configs[key].enabled =
    !visualConfigs.value.cuda_configs[key].enabled
}

function updateCudaConfigValue(key, type, value) {
  if (!visualConfigs.value.cuda_configs) {
    visualConfigs.value.cuda_configs = {}
  }
  if (!visualConfigs.value.cuda_configs[key]) {
    visualConfigs.value.cuda_configs[key] = { enabled: true, value: '' }
  }
  visualConfigs.value.cuda_configs[key].value =
    type === 'number' ? Number(value) : value
}

function updateBenchmarkMessage(idx, value) {
  if (!visualConfigs.value.benchmark_messages) {
    visualConfigs.value.benchmark_messages = []
  }
  visualConfigs.value.benchmark_messages[idx] = value
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleBuild() {
  if (store.isBuilding) return
  showBuildLogs.value = true
  await store.buildLlamaCpp()
}

function normalizeBuildParams(configs) {
  const params = configs.build_make_params || {}
  const normalized = {}
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'boolean') {
      normalized[key] = { enabled: val, value: val ? '1' : '' }
    } else {
      normalized[key] = { enabled: true, value: val }
    }
  }
  configs.build_make_params = normalized

  const cuda = configs.cuda_configs || {}
  const cudaNormalized = {}
  for (const [key, val] of Object.entries(cuda)) {
    cudaNormalized[key] = { enabled: true, value: val }
  }
  configs.cuda_configs = cudaNormalized
  return configs
}
</script>

<template>
  <div class="space-y-6">
    <!-- Profile Panel -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 class="text-sm font-semibold text-text-primary">Config Profiles</h3>
          <span class="badge bg-bg-tertiary text-text-muted">{{ profiles.length }}</span>
        </div>
        <button
          @click="showProfilePanel = !showProfilePanel"
          class="btn btn-ghost btn-xs"
        >
          <svg class="w-4 h-4 transition-transform" :class="showProfilePanel ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div v-if="showProfilePanel" class="space-y-4">
        <!-- Save new profile -->
        <div class="flex items-center gap-3">
          <input
            v-model="profileName"
            @keydown.enter="handleSaveProfile"
            placeholder="Profile name..."
            class="input flex-1 text-xs"
          />
          <button
            @click="handleSaveProfile"
            class="btn btn-primary btn-sm"
            :disabled="savingProfile"
          >
            <svg v-if="!savingProfile" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {{ savingProfile ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <!-- Profile message -->
        <div v-if="profileMessage" :class="profileMessageError ? 'text-error' : 'text-success'" class="text-xs">
          {{ profileMessage }}
        </div>

        <!-- Profile list -->
        <div v-if="profiles.length > 0" class="space-y-1">
          <div
            v-for="profile in profiles"
            :key="profile.name"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary transition-all"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ profile.name }}</div>
              <div class="text-xs text-text-muted">{{ formatDate(profile.modified) }}</div>
            </div>
            <button
              @click="handleLoadProfile(profile.name)"
              class="btn btn-ghost btn-xs"
              :disabled="profileAction === 'load'"
              title="Load this profile"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Load
            </button>
            <button
              @click="handleDeleteProfile(profile.name)"
              class="p-1 rounded-md text-text-muted hover:text-error hover:bg-error-subtle transition-all"
              :disabled="profileAction === 'delete'"
              title="Delete this profile"
            >
              <svg v-if="profileAction !== 'delete'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </button>
          </div>
        </div>
        <div v-else class="text-xs text-text-muted text-center py-4">
          No profiles yet. Save your current config as a profile.
        </div>
      </div>
    </div>

    <!-- Build llama.cpp -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <div>
            <h3 class="text-sm font-semibold text-text-primary">Build llama.cpp</h3>
            <p class="text-xs text-text-muted mt-1">
              Build llama.cpp using the configured build settings. Clones/pulls the repository and runs cmake with your configured options.
            </p>
          </div>
        </div>
        <span v-if="store.buildSuccess" class="badge bg-success-subtle text-success">✓ Built</span>
        <span v-if="store.buildError" class="badge bg-error-subtle text-error">✗ Failed</span>
      </div>

      <!-- Build button -->
      <div class="flex items-center gap-3">
        <button
          @click="handleBuild"
          class="btn btn-primary"
          :disabled="store.isBuilding"
        >
          <svg v-if="!store.isBuilding" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ store.isBuilding ? 'Building...' : store.buildSuccess ? 'Build Successful' : store.buildError ? 'Build Failed — Retry' : 'Build llama.cpp' }}
        </button>

        <button
          v-if="store.buildLogs.length > 0"
          @click="showBuildLogs = !showBuildLogs"
          class="btn btn-ghost btn-sm"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Logs ({{ store.buildLogs.length }})
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="store.buildProgress > 0" class="space-y-1 mt-4">
        <div class="flex items-center justify-between text-xs">
          <span class="text-text-muted">Progress</span>
          <span class="font-mono text-text-secondary">{{ store.buildProgress }}%</span>
        </div>
        <div class="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="store.buildSuccess ? 'bg-success' : store.buildError ? 'bg-error' : 'bg-accent'"
            :style="{ width: store.buildProgress + '%' }"
          />
        </div>
      </div>

      <!-- Build logs -->
      <div v-if="showBuildLogs && store.buildLogs.length > 0" class="space-y-2 mt-4">
        <div class="flex items-center justify-between">
          <h5 class="text-xs font-medium text-text-muted">Build Output</h5>
          <button
            @click="store.clearBuildLogs()"
            class="btn btn-ghost btn-xs"
          >
            Clear
          </button>
        </div>
        <div
          ref="buildLogContainer"
          class="bg-bg-primary rounded-lg p-3 font-mono text-xs max-h-64 overflow-auto border border-border"
        >
          <div
            v-for="(log, i) in store.buildLogs"
            :key="i"
            class="leading-relaxed"
            :class="log.type === 'error' ? 'text-error' : 'text-text-secondary'"
          >
            <span class="text-text-muted select-none">{{ String(i + 1).padStart(4, ' ') }} </span>
            {{ log.text }}
          </div>
          <div ref="buildLogAnchor" />
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="card">
      <div class="space-y-4 max-h-[600px] overflow-auto pr-2">
        <!-- Tab navigation -->
        <div class="flex items-center gap-2 mb-2">
          <button
            @click="activeTab = 'build'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="activeTab === 'build' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
          >
            Build Options
          </button>
          <button
            @click="activeTab = 'other'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="activeTab === 'other' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'"
          >
            Run Options
          </button>
        </div>

        <!-- Build Options Tab -->
        <div v-show="activeTab === 'build'" class="space-y-4">

        <!-- Build Settings -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-text-primary">Build Settings</h3>

          <!-- Basic Build Options -->
          <div class="space-y-2">
            <h5 class="text-xs font-medium text-text-muted">Basic Options</h5>
            <div
              v-for="param in [
                { key: 'enable_ccache', label: 'Enable ccache', type: 'boolean' },
                { key: 'enable_lto', label: 'Enable LTO', type: 'boolean' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4"
            >
              <label class="text-sm text-text-secondary">{{ param.label }}</label>
              <button
                @click="toggleBuildParam(param.key)"
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="
                  (visualConfigs.build_make_params?.[param.key]?.enabled ?? false)
                    ? 'bg-accent'
                    : 'bg-bg-tertiary'
                "
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="
                    (visualConfigs.build_make_params?.[param.key]?.enabled ?? false)
                      ? 'translate-x-5'
                      : ''
                  "
                />
              </button>
            </div>
          </div>

          <!-- CUDA Build Options -->
          <div class="space-y-2">
            <h5 class="text-xs font-medium text-text-muted">CUDA Options</h5>
            <div
              v-for="param in [
                { key: 'enable_cuda', label: 'Enable CUDA', type: 'boolean' },
                { key: 'enable_cuda_fa', label: 'Enable Flash Attention', type: 'boolean' },
                { key: 'enable_cuda_graphs', label: 'Enable CUDA Graphs', type: 'boolean' },
                { key: 'enable_cuda_nccl', label: 'Enable NCCL', type: 'boolean' },
                { key: 'enable_cuda_per_max_batch_size', label: 'Per-Max Batch Size', type: 'boolean' },
                { key: 'enable_cuda_peer_copy', label: 'Enable Peer Copy', type: 'boolean' },
                { key: 'enable_cuda_custom_arch', label: 'Custom CUDA Architecture', type: 'boolean' },
                { key: 'enable_cuda_fp16', label: 'Enable FP16', type: 'boolean' },
                { key: 'enable_cuda_scheduled_max_copies', label: 'Scheduled Max Copies', type: 'boolean' },
                { key: 'enable_cuda_compression_level', label: 'Compression Level', type: 'boolean' },
                { key: 'enable_ggml_cuda_force_mmq', label: 'Force MMQ', type: 'boolean' },
                { key: 'enable_ggml_native', label: 'GGML Native', type: 'boolean' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4"
            >
              <label class="text-sm text-text-secondary">{{ param.label }}</label>
              <button
                @click="toggleBuildParam(param.key)"
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="
                  (visualConfigs.build_make_params?.[param.key]?.enabled ?? false)
                    ? 'bg-accent'
                    : 'bg-bg-tertiary'
                "
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="
                    (visualConfigs.build_make_params?.[param.key]?.enabled ?? false)
                      ? 'translate-x-5'
                      : ''
                  "
                />
              </button>
            </div>
          </div>

          <!-- Build Parameter Values -->
          <div class="space-y-2">
            <h5 class="text-xs font-medium text-text-muted">Build Parameters</h5>
            <div
              v-for="param in [
                { key: 'peer_batch_size', label: 'Peer Batch Size', type: 'text' },
                { key: 'cuda_max_scheduled_copies', label: 'Max Scheduled Copies', type: 'number' },
                { key: 'cuda_compression_level', label: 'Compression Level', type: 'number' },
              ]"
              :key="param.key"
              class="space-y-1"
            >
              <div class="flex items-center justify-between gap-4">
                <label class="text-sm text-text-secondary">{{ param.label }}</label>
                <input
                  :type="param.type === 'number' ? 'number' : 'text'"
                  :value="visualConfigs.build_make_params?.[param.key]?.value ?? ''"
                  @input="updateBuildParamValue(param.key, param.type, $event.target.value)"
                  class="input w-40 text-xs"
                />
              </div>
            </div>
          </div>

          <!-- CUDA Quantization Options -->
          <div class="space-y-2">
            <h5 class="text-xs font-medium text-text-muted">Quantization &amp; Precision</h5>
            <div
              v-for="param in [
                { key: 'enable_cuda_fa_all_quants', label: 'Enable FA All Quants', type: 'boolean' },
                { key: 'cuda_all_quants', label: 'CUDA All Quants', type: 'boolean' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4"
            >
              <label class="text-sm text-text-secondary">{{ param.label }}</label>
              <button
                @click="toggleBuildParam(param.key)"
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="
                  (visualConfigs.build_make_params?.[param.key]?.enabled ?? false)
                    ? 'bg-accent'
                    : 'bg-bg-tertiary'
                "
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="
                    (visualConfigs.build_make_params?.[param.key]?.enabled ?? false)
                      ? 'translate-x-5'
                      : ''
                  "
                />
              </button>
            </div>
          </div>

          <!-- CUDA Config -->
          <div class="space-y-2">
            <h5 class="text-xs font-medium text-text-muted">CUDA Configuration</h5>
            <div
              v-for="param in [
                { key: 'cuda_version', label: 'CUDA Version', type: 'text' },
                { key: 'cudacxx', label: 'NVCC Path', type: 'text' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4"
            >
              <label class="text-sm text-text-secondary">{{ param.label }}</label>
              <input
                :type="param.type === 'number' ? 'number' : 'text'"
                :value="visualConfigs.cuda_configs?.[param.key]?.value ?? ''"
                @input="updateCudaConfigValue(param.key, param.type, $event.target.value)"
                class="input w-40 text-xs"
              />
            </div>
          </div>
        </div>
        </div>

        <!-- Run Options Tab -->
        <div v-show="activeTab === 'other'" class="space-y-4">

        <config-section
          title="General"
          :items="[
            { key: 'max_sys_mem', label: 'Max System Memory (%)', type: 'number' },
            { key: 'llama_port', label: 'Llama Port', type: 'number' },
            { key: 'llama_host', label: 'Llama Host', type: 'text' },
            { key: 'model', label: 'Model (auto-populated from model_directory)', type: 'select' },
            { key: 'build_cores', label: 'Build Cores', type: 'number' },
            { key: 'skip_build', label: 'Skip Build', type: 'boolean' },
          ]"
          :model-options="modelOptions"
          v-model="visualConfigs"
        />

        <!-- Environment Export Configs -->
        <config-section
          title="Environment Exports"
          :items="[
            { key: 'GGML_CUDA_ENABLE_UNIFIED_MEMORY', label: 'GGML_CUDA_ENABLE_UNIFIED_MEMORY', type: 'text' },
            { key: 'CUDA_SCALE_LAUNCH_QUEUES', label: 'CUDA_SCALE_LAUNCH_QUEUES', type: 'text' },
            { key: 'GGML_CUDA_P2P', label: 'GGML_CUDA_P2P', type: 'text' },
            { key: 'LLAMA_ARG_FIT', label: 'LLAMA_ARG_FIT', type: 'text' },
            { key: 'LLAMA_ARG_FIT_TARGET', label: 'LLAMA_ARG_FIT_TARGET', type: 'text' },
            { key: 'LLAMA_ARG_FIT_CTX', label: 'LLAMA_ARG_FIT_CTX', type: 'text' },
          ]"
          v-model="visualConfigs.export_configs"
        />

        <!-- Benchmark Messages -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Benchmark Messages</h4>
          <p class="text-xs text-text-muted">
            Messages used to fill context during benchmarking. Each message is sent sequentially with accumulated history.
          </p>
          <div class="space-y-2">
            <div
              v-for="(msg, idx) in visualConfigs.benchmark_messages"
              :key="idx"
              class="space-y-1"
            >
              <label class="text-xs text-text-muted">Message {{ idx + 1 }}</label>
              <textarea
                :value="msg"
                @input="updateBenchmarkMessage(idx, $event.target.value)"
                class="textarea font-mono text-xs h-16"
                placeholder="Enter benchmark message..."
              />
            </div>
          </div>
        </div>



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
