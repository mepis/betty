<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import ConfigSection from '@/components/ConfigSection.vue'
import Tooltip from '@/components/Tooltip.vue'

const store = useBenchmarkStore()
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')
const visualConfigs = ref({})
const modelOptions = ref([])
const newGpuIndex = ref(0)
const buildLogContainer = ref(null)
const buildLogAnchor = ref(null)
const showBuildLogs = ref(false)
const buildClicked = ref(false)
const activeTab = ref('build') // 'build' | 'other'
const toast = ref({ show: false, message: '', type: '' }) // type: 'success' | 'error'
const killingPort = ref(false)
const killPortSuccess = ref('')
const serviceLoading = ref(false)
const serviceSuccess = ref('')

// Service edit modal
const showServiceModal = ref(false)
const serviceConfig = ref(null)
const loadingServiceConfig = ref(false)
const savingService = ref(false)
const serviceSaveSuccess = ref('')
const serviceSaveError = ref('')
const serviceEditForm = ref({
  execStart: '',
  envVars: {},
  restart: 'on-failure',
  restartSec: 5,
})
const deletingBuild = ref(false)
const deleteBuildSuccess = ref('')
const deletingLlama = ref(false)
const deleteLlamaSuccess = ref('')
const updating = ref(false)
const updateSuccess = ref('')

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}

// Profile state
const profiles = ref([])
const showProfilePanel = ref(false)
const profileName = ref('')
const savingProfile = ref(false)
const profileAction = ref('') // 'save' | 'load' | 'delete'
const profileMessage = ref('')
const profileMessageError = ref(false)

// Service Profile state
const serviceProfiles = ref([])
const showServiceProfilePanel = ref(false)
const serviceProfileName = ref('')
const savingServiceProfile = ref(false)
const serviceProfileAction = ref('')
const serviceProfileMessage = ref('')
const serviceProfileMessageError = ref(false)

// Actions panel
const showActionsPanel = ref(true)

async function loadProfiles() {
  try {
    await store.fetchProfiles()
    profiles.value = store.profiles || []
  } catch (e) {
    console.error('Failed to load profiles:', e)
  }
}

async function loadServiceProfiles() {
  await store.fetchServiceProfiles()
  serviceProfiles.value = store.serviceProfiles
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
        await fetchModelsForDirectory(store.configs.model_directory || store.modelsDir || '')
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

async function handleSaveServiceProfile() {
  if (savingServiceProfile.value) return
  if (!serviceProfileName.value.trim()) {
    serviceProfileMessage.value = 'Please enter a profile name'
    serviceProfileMessageError.value = true
    return
  }
  savingServiceProfile.value = true
  serviceProfileMessage.value = ''
  serviceProfileMessageError.value = false
  try {
    // Fetch current service config
    const config = await store.fetchServiceConfig()
    if (!config || !config.exists) {
      serviceProfileMessage.value = 'No service configuration found. Install a service first.'
      serviceProfileMessageError.value = true
      return
    }
    const data = {
      description: config.description || '',
      execStart: config.execStart || '',
      envVars: config.envVars || {},
      restart: config.restart || 'on-failure',
      restartSec: String(config.restartSec || '5'),
    }
    const success = await store.saveServiceProfile(serviceProfileName.value.trim(), data)
    if (success) {
      serviceProfileMessage.value = `Service profile "${serviceProfileName.value.trim()}" saved`
      serviceProfileMessageError.value = false
      serviceProfileName.value = ''
      await loadServiceProfiles()
    } else {
      serviceProfileMessage.value = 'Failed to save service profile'
      serviceProfileMessageError.value = true
    }
  } catch (e) {
    serviceProfileMessage.value = 'Failed to save service profile: ' + (e.message || e)
    serviceProfileMessageError.value = true
  } finally {
    savingServiceProfile.value = false
  }
}

async function handleLoadServiceProfile(name) {
  if (serviceProfileAction.value) return
  if (!confirm(`Load service profile "${name}"? This will update the service files and restart the service.`)) return
  serviceProfileAction.value = 'load'
  serviceProfileMessage.value = ''
  try {
    const success = await store.loadServiceProfile(name, true)
    if (success) {
      serviceProfileMessage.value = `Service profile "${name}" loaded and service restarted`
      serviceProfileMessageError.value = false
      await store.fetchServiceConfig()
    } else {
      serviceProfileMessage.value = `Failed to load service profile "${name}"`
      serviceProfileMessageError.value = true
    }
  } catch (e) {
    serviceProfileMessage.value = 'Failed to load service profile: ' + (e.message || e)
    serviceProfileMessageError.value = true
  } finally {
    serviceProfileAction.value = ''
  }
}

async function handleDeleteServiceProfile(name) {
  if (serviceProfileAction.value) return
  if (!confirm(`Delete service profile "${name}"?`)) return
  serviceProfileAction.value = 'delete'
  try {
    const success = await store.deleteServiceProfile(name)
    if (success) {
      serviceProfileMessage.value = `Service profile "${name}" deleted`
      serviceProfileMessageError.value = false
      await loadServiceProfiles()
    } else {
      serviceProfileMessage.value = `Failed to delete service profile "${name}"`
      serviceProfileMessageError.value = true
    }
  } catch (e) {
    serviceProfileMessage.value = 'Failed to delete service profile: ' + (e.message || e)
    serviceProfileMessageError.value = true
  } finally {
    serviceProfileAction.value = ''
  }
}

async function fetchModelsForDirectory(dir) {
  const modelsDir = dir || store.modelsDir
  if (!modelsDir) {
    modelOptions.value = []
    return
  }
  await store.fetchModels(modelsDir)
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
  await store.fetchModelsDir()
  if (store.configs) {
    visualConfigs.value = normalizeBuildParams(
      JSON.parse(JSON.stringify(store.configs))
    )
    await fetchModelsForDirectory(store.configs.model_directory || store.modelsDir || '')
  }
  await loadProfiles()
  await loadServiceProfiles()
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
    fetchModelsForDirectory(store.configs.model_directory || store.modelsDir || '')
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
  buildClicked.value = true
  const ok = await store.buildLlamaCpp()
  if (ok) {
    showToast('Build successful', 'success')
  } else {
    showToast('Build failed', 'error')
  }
}

function handleBuildReset() {
  store.buildLogs = []
  store.buildProgress = 0
  store.buildStatus = 'idle'
  buildClicked.value = false
}

async function handleKillPort() {
  if (killingPort.value) return
  killingPort.value = true
  killPortSuccess.value = ''
  const result = await store.killPort()
  if (result.success) {
    killPortSuccess.value = result.message
    setTimeout(() => (killPortSuccess.value = ''), 4000)
  } else {
    killPortSuccess.value = result.message || 'Failed to kill processes'
    setTimeout(() => (killPortSuccess.value = ''), 4000)
  }
  killingPort.value = false
}

async function handleServiceStart() {
  if (serviceLoading.value) return
  serviceLoading.value = true
  serviceSuccess.value = ''
  const ok = await store.startService()
  if (ok) {
    serviceSuccess.value = 'llama.service started'
    setTimeout(() => (serviceSuccess.value = ''), 3000)
  } else {
    serviceSuccess.value = 'Failed to start service'
    setTimeout(() => (serviceSuccess.value = ''), 3000)
  }
  serviceLoading.value = false
}

async function handleServiceStop() {
  if (serviceLoading.value) return
  serviceLoading.value = true
  serviceSuccess.value = ''
  const ok = await store.stopService()
  if (ok) {
    serviceSuccess.value = 'llama.service stopped'
    setTimeout(() => (serviceSuccess.value = ''), 3000)
  } else {
    serviceSuccess.value = 'Failed to stop service'
    setTimeout(() => (serviceSuccess.value = ''), 3000)
  }
  serviceLoading.value = false
}

async function handleDeleteBuild() {
  if (deletingBuild.value) return
  if (!confirm('Delete the llama.cpp build directory? This will remove all compiled binaries and intermediate files.')) return
  deletingBuild.value = true
  deleteBuildSuccess.value = ''
  const result = await store.deleteBuildDir()
  if (result.success) {
    deleteBuildSuccess.value = result.message
    setTimeout(() => (deleteBuildSuccess.value = ''), 4000)
  } else {
    deleteBuildSuccess.value = result.message || 'Failed to delete build directory'
    setTimeout(() => (deleteBuildSuccess.value = ''), 4000)
  }
  deletingBuild.value = false
}

async function openServiceModal() {
  showServiceModal.value = true
  loadingServiceConfig.value = true
  serviceSaveSuccess.value = ''
  serviceSaveError.value = ''
  try {
    const config = await store.fetchServiceConfig()
    if (config.exists) {
      serviceEditForm.value = {
        execStart: config.execStart || '',
        envVars: { ...config.envVars },
        restart: config.restart || 'on-failure',
        restartSec: config.restartSec || 5,
      }
    }
    serviceConfig.value = config
  } catch (e) {
    console.error('Failed to load service config:', e)
  }
  loadingServiceConfig.value = false
}

function closeServiceModal() {
  showServiceModal.value = false
  serviceConfig.value = null
  serviceSaveSuccess.value = ''
  serviceSaveError.value = ''
}

async function handleSaveService() {
  if (savingService.value) return
  savingService.value = true
  serviceSaveSuccess.value = ''
  serviceSaveError.value = ''
  try {
    const result = await store.updateServiceConfig(serviceEditForm.value)
    if (result.success) {
      serviceSaveSuccess.value = result.message || 'Service updated successfully'
      setTimeout(() => { serviceSaveSuccess.value = '' }, 4000)
    } else {
      serviceSaveError.value = result.error || 'Failed to update service'
    }
  } catch (e) {
    serviceSaveError.value = e.message || 'Failed to update service'
  }
  savingService.value = false
}

function addEnvVar() {
  serviceEditForm.value.envVars[''] = ''
}

function removeEnvVar(key) {
  const newEnv = { ...serviceEditForm.value.envVars }
  delete newEnv[key]
  serviceEditForm.value.envVars = newEnv
}

function updateEnvVarKey(oldKey, newKey) {
  if (oldKey === newKey) return
  const newEnv = { ...serviceEditForm.value.envVars }
  const value = newEnv[oldKey]
  delete newEnv[oldKey]
  newEnv[newKey] = value
  serviceEditForm.value.envVars = newEnv
}

function updateEnvVarValue(key, value) {
  const newEnv = { ...serviceEditForm.value.envVars }
  newEnv[key] = value
  serviceEditForm.value.envVars = newEnv
}

async function handleDeleteLlama() {
  if (deletingLlama.value) return
  if (!confirm('Delete the entire llama.cpp repository? This will remove the cloned repository, all builds, and all intermediate files. This action cannot be undone.')) return
  deletingLlama.value = true
  deleteLlamaSuccess.value = ''
  const result = await store.deleteLlamaDir()
  if (result.success) {
    deleteLlamaSuccess.value = result.message
    setTimeout(() => (deleteLlamaSuccess.value = ''), 4000)
  } else {
    deleteLlamaSuccess.value = result.message || 'Failed to delete llama.cpp repository'
    setTimeout(() => (deleteLlamaSuccess.value = ''), 4000)
  }
  deletingLlama.value = false
}

async function handleUpdate() {
  if (updating.value) return
  if (!confirm('Pull latest changes and restart llama-benchmark.service?')) return
  updating.value = true
  updateSuccess.value = ''
  const result = await store.runUpdate()
  if (result.success) {
    updateSuccess.value = result.message || 'Update complete'
    setTimeout(() => (updateSuccess.value = ''), 4000)
  } else {
    updateSuccess.value = result.error || 'Update failed'
    setTimeout(() => (updateSuccess.value = ''), 4000)
  }
  updating.value = false
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

  // Normalize export_configs: convert string LLAMA_ARG_FIT to boolean
  const ec = configs.export_configs || {}
  if (typeof ec.LLAMA_ARG_FIT === 'string') {
    ec.LLAMA_ARG_FIT = ec.LLAMA_ARG_FIT === 'on'
  }
  configs.export_configs = ec

  return configs
}
</script>

<template>
  <div class="m-2 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
    <!-- Left column -->
    <div class="space-y-4">
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
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <button
          v-if="!buildClicked"
          @click="handleBuild"
          class="btn btn-primary"
        >
          Build
        </button>

        <button
          v-if="buildClicked"
          @click="handleBuildReset"
          class="btn btn-ghost btn-sm"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>

        <button
          v-if="buildClicked && store.buildLogs.length > 0"
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
      <div v-if="buildClicked" class="space-y-1 mt-4">
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

    <!-- Actions Panel -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 class="text-sm font-semibold text-text-primary">Actions</h3>
        </div>
        <button
          @click="showActionsPanel = !showActionsPanel"
          class="btn btn-ghost btn-xs"
        >
          <svg class="w-4 h-4 transition-transform" :class="showActionsPanel ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div v-if="showActionsPanel" class="space-y-3">
        <!-- Kill Port -->
        <button
          v-if="!store.isRunning"
          @click="handleKillPort"
          class="btn btn-ghost btn-xs w-full"
          :disabled="killingPort"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          {{ killingPort ? 'Killing...' : 'Kill Port' }}
        </button>

        <!-- Start Service -->
        <button
          v-if="!store.isRunning && !store.serviceActive"
          @click="handleServiceStart"
          class="btn btn-ghost btn-xs w-full"
          :disabled="serviceLoading"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ serviceLoading ? 'Starting...' : 'Start llama.service' }}
        </button>

        <!-- Stop Service -->
        <button
          v-if="!store.isRunning && store.serviceActive"
          @click="handleServiceStop"
          class="btn btn-ghost btn-xs w-full"
          :disabled="serviceLoading"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          {{ serviceLoading ? 'Stopping...' : 'Stop llama.service' }}
        </button>

        <!-- Edit Service -->
        <button
          @click="openServiceModal"
          class="btn btn-ghost btn-xs w-full"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Edit Service
        </button>

        <!-- Update -->
        <button
          @click="handleUpdate"
          class="btn btn-ghost btn-xs w-full"
          :disabled="updating"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ updating ? 'Updating...' : 'Update' }}
        </button>

        <!-- Delete Build -->
        <button
          @click="handleDeleteBuild"
          class="btn btn-ghost btn-xs w-full"
          :disabled="deletingBuild"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {{ deletingBuild ? 'Deleting...' : 'Delete Build' }}
        </button>

        <!-- Delete Llama -->
        <button
          @click="handleDeleteLlama"
          class="btn btn-ghost btn-xs w-full"
          :disabled="deletingLlama"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {{ deletingLlama ? 'Deleting...' : 'Delete Llama' }}
        </button>

        <!-- Status messages -->
        <span v-if="killPortSuccess" class="text-xs text-success">{{ killPortSuccess }}</span>
        <span v-if="serviceSuccess" class="text-xs text-success">{{ serviceSuccess }}</span>
        <span v-if="deleteBuildSuccess" class="text-xs text-success">{{ deleteBuildSuccess }}</span>
        <span v-if="deleteLlamaSuccess" class="text-xs text-success">{{ deleteLlamaSuccess }}</span>
        <span v-if="updateSuccess" class="text-xs text-success">{{ updateSuccess }}</span>
      </div>
    </div>
    </div>

    <!-- Middle column -->
    <div class="space-y-4">
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
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-card-hover transition-all"
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

    <!-- Service Profile Panel -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          <h3 class="text-sm font-semibold text-text-primary">Service Profiles</h3>
          <span class="badge bg-bg-tertiary text-text-muted">{{ serviceProfiles.length }}</span>
        </div>
        <button
          @click="showServiceProfilePanel = !showServiceProfilePanel"
          class="btn btn-ghost btn-xs"
        >
          <svg class="w-4 h-4 transition-transform" :class="showServiceProfilePanel ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div v-if="showServiceProfilePanel" class="space-y-4">
        <!-- Save new service profile -->
        <div class="flex items-center gap-3">
          <input
            v-model="serviceProfileName"
            @keydown.enter="handleSaveServiceProfile"
            placeholder="Profile name..."
            class="input flex-1 text-xs"
          />
          <button
            @click="handleSaveServiceProfile"
            class="btn btn-primary btn-sm"
            :disabled="savingServiceProfile"
          >
            <svg v-if="!savingServiceProfile" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {{ savingServiceProfile ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <!-- Service profile message -->
        <div v-if="serviceProfileMessage" :class="serviceProfileMessageError ? 'text-error' : 'text-success'" class="text-xs">
          {{ serviceProfileMessage }}
        </div>

        <!-- Service profile list -->
        <div v-if="serviceProfiles.length > 0" class="space-y-1">
          <div
            v-for="profile in serviceProfiles"
            :key="profile.name"
            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-card-hover transition-all"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ profile.name }}</div>
              <div class="text-xs text-text-muted">{{ formatDate(profile.modified) }}</div>
            </div>
            <button
              @click="handleLoadServiceProfile(profile.name)"
              class="btn btn-ghost btn-xs"
              :disabled="serviceProfileAction === 'load'"
              title="Load this profile"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Load
            </button>
            <button
              @click="handleDeleteServiceProfile(profile.name)"
              class="p-1 rounded-md text-text-muted hover:text-error hover:bg-error-subtle transition-all"
              :disabled="serviceProfileAction === 'delete'"
              title="Delete this profile"
            >
              <svg v-if="serviceProfileAction !== 'delete'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
          No service profiles saved.
        </div>
      </div>
    </div>
    </div>

    <!-- Right column -->
    <div class="space-y-4">
    <!-- Editor -->
    <div class="card">
      <!-- Tab navigation (fixed, does not scroll) -->
      <div class="flex items-center gap-2 mb-2">
        <button
          @click="activeTab = 'build'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="activeTab === 'build' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-card-hover'"
        >
          Build Options
        </button>
        <button
          @click="activeTab = 'other'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="activeTab === 'other' ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-card-hover'"
        >
          Run Options
        </button>
      </div>

      <!-- Tab content (scrollable) -->
      <div class="space-y-4 max-h-[600px] overflow-auto pr-2">
        <!-- Build Options Tab -->
        <div v-show="activeTab === 'build'" class="space-y-4">

        <!-- Build Settings -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-text-primary">Build Settings</h3>

          <!-- Build Execution -->
          <div class="space-y-2">
            <h5 class="text-base font-medium text-text-muted">Build Execution</h5>
            <div
              v-for="param in [
                { key: 'build_cores', label: 'Build Cores', type: 'number' },
                { key: 'skip_build', label: 'Skip Build', type: 'boolean', tooltip: 'Skips rebuilding llama.cpp between each test run' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover"
            >
              <Tooltip :text="param.tooltip">
                <label class="text-sm text-text-secondary">{{ param.label }}</label>
              </Tooltip>
              <input
                v-if="param.type === 'number'"
                type="number"
                :value="visualConfigs[param.key] ?? ''"
                @input="visualConfigs = { ...visualConfigs, [param.key]: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
              <button
                v-else
                @click="visualConfigs = { ...visualConfigs, [param.key]: !visualConfigs[param.key] }"
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="visualConfigs[param.key] ? 'bg-accent' : 'bg-bg-tertiary'"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="visualConfigs[param.key] ? 'translate-x-5' : ''"
                />
              </button>
            </div>
          </div>

          <!-- Basic Build Options -->
          <div class="space-y-2">
            <h5 class="text-base font-medium text-text-muted">Basic Options</h5>
            <div
              v-for="param in [
                { key: 'enable_ccache', label: 'Enable ccache', type: 'boolean', tooltip: 'Improves llama.cpp rebuilding speed' },
                { key: 'enable_lto', label: 'Enable LTO', type: 'boolean' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover"
            >
              <Tooltip :text="param.tooltip">
                <label class="text-sm text-text-secondary">{{ param.label }}</label>
              </Tooltip>
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
            <h5 class="text-base font-medium text-text-muted">CUDA Options</h5>
            <div
              v-for="param in [
                { key: 'enable_cuda', label: 'Enable CUDA', type: 'boolean' },
                { key: 'enable_cuda_fa', label: 'Enable Flash Attention', type: 'boolean' },
                { key: 'enable_cuda_graphs', label: 'Enable CUDA Graphs', type: 'boolean' },
                { key: 'enable_cuda_nccl', label: 'Enable NCCL', type: 'boolean' },
                { key: 'enable_cuda_per_max_batch_size', label: 'Enable Per-Max Batch Size', type: 'boolean' },
                { key: 'enable_cuda_peer_copy', label: 'Enable Peer Copy', type: 'boolean' },
                { key: 'enable_cuda_custom_arch', label: 'Enable Custom CUDA Architecture', type: 'boolean' },
                { key: 'enable_cuda_fp16', label: 'Enable FP16', type: 'boolean' },
                { key: 'enable_cuda_scheduled_max_copies', label: 'Enable Scheduled Max Copies', type: 'boolean' },
                { key: 'enable_cuda_compression_level', label: 'Enable Compression Level', type: 'boolean' },
                { key: 'enable_ggml_cuda_force_mmq', label: 'Enable Force MMQ', type: 'boolean' },
                { key: 'enable_ggml_native', label: 'Enable GGML Native', type: 'boolean' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover"
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

          <!-- Custom CUDA Architecture Value -->
          <div v-if="visualConfigs.build_make_params?.enable_cuda_custom_arch?.enabled" class="space-y-2">
            <h5 class="text-base font-medium text-text-muted">Custom CUDA Architecture</h5>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
              <label class="text-sm text-text-secondary">CUDA Architectures</label>
              <input
                type="text"
                :value="visualConfigs.build_make_params?.cuda_custom_architectures?.value ?? ''"
                @input="updateBuildParamValue('cuda_custom_architectures', 'text', $event.target.value)"
                class="input w-40 text-xs"
                placeholder="e.g. 86-real;120-real"
              />
            </div>
          </div>

          <!-- Build Parameter Values -->
          <div class="space-y-2">
            <h5 class="text-base font-medium text-text-muted">Build Parameters</h5>
            <div
              v-for="param in [
                { key: 'peer_batch_size', label: 'Peer Batch Size', type: 'text' },
                { key: 'cuda_max_scheduled_copies', label: 'Max Scheduled Copies', type: 'number' },
                { key: 'cuda_compression_level', label: 'Compression Level', type: 'number' },
              ]"
              :key="param.key"
              class="space-y-1"
            >
              <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
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
            <h5 class="text-base font-medium text-text-muted">Quantization &amp; Precision</h5>
            <div
              v-for="param in [
                { key: 'enable_cuda_fa_all_quants', label: 'Enable FA All Quants', type: 'boolean' },
                { key: 'cuda_all_quants', label: 'Enable CUDA All Quants', type: 'boolean' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover"
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
            <h5 class="text-base font-medium text-text-muted">CUDA Configuration</h5>
            <div
              v-for="param in [
                { key: 'cuda_version', label: 'CUDA Version', type: 'text' },
                { key: 'cudacxx', label: 'NVCC Path', type: 'text' },
              ]"
              :key="param.key"
              class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover"
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
          ]"
          :model-options="modelOptions"
          v-model="visualConfigs"
        />

        <!-- Environment Export Configs -->
        <config-section
          title="Environment Exports"
          :items="[
            { key: 'GGML_CUDA_ENABLE_UNIFIED_MEMORY', label: 'GGML_CUDA_ENABLE_UNIFIED_MEMORY', type: 'text' },
            { key: 'CUDA_SCALE_LAUNCH_QUEUES', label: 'CUDA_SCALE_LAUNCH_QUEUES', type: 'select' },
            { key: 'GGML_CUDA_P2P', label: 'GGML_CUDA_P2P', type: 'select' },
          ]"
          :queue-options="['1x', '4x', '8x']"
          :p2p-options="['off', 'on']"
          v-model="visualConfigs.export_configs"
        />

        <!-- LLAMA_ARG_FIT Toggle -->
        <div class="space-y-2">
          <h5 class="text-base font-medium text-text-muted">LLAMA ARG FIT</h5>
          <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
            <label class="text-sm text-text-secondary">Enable LLAMA_ARG_FIT</label>
            <button
              @click="visualConfigs.export_configs = { ...visualConfigs.export_configs, LLAMA_ARG_FIT: !visualConfigs.export_configs?.LLAMA_ARG_FIT }"
              class="relative w-10 h-5 rounded-full transition-colors"
              :class="visualConfigs.export_configs?.LLAMA_ARG_FIT ? 'bg-accent' : 'bg-bg-tertiary'"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                :class="visualConfigs.export_configs?.LLAMA_ARG_FIT ? 'translate-x-5' : ''"
              />
            </button>
          </div>
          <div v-if="visualConfigs.export_configs?.LLAMA_ARG_FIT" class="space-y-2 ml-1">
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
              <label class="text-sm text-text-secondary">LLAMA_ARG_FIT_TARGET</label>
              <input
                type="number"
                :value="visualConfigs.export_configs?.LLAMA_ARG_FIT_TARGET ?? 256"
                @input="visualConfigs.export_configs = { ...visualConfigs.export_configs, LLAMA_ARG_FIT_TARGET: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
              <label class="text-sm text-text-secondary">LLAMA_ARG_FIT_CTX</label>
              <input
                type="number"
                :value="visualConfigs.export_configs?.LLAMA_ARG_FIT_CTX ?? 131072"
                @input="visualConfigs.export_configs = { ...visualConfigs.export_configs, LLAMA_ARG_FIT_CTX: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- Benchmark Messages -->
        <div class="space-y-3">
          <h4 class="text-base font-semibold text-text-muted uppercase tracking-wider">Benchmark Messages</h4>
          <p class="text-xs text-text-muted">
            Messages used to fill context during benchmarking. Each message is sent sequentially with accumulated history.
          </p>
          <div class="space-y-2">
            <div
              v-for="(msg, idx) in visualConfigs.benchmark_messages"
              :key="idx"
              class="space-y-1 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover"
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

        <!-- Spec Params -->
        <div class="space-y-3">
          <h4 class="text-base font-semibold text-text-muted uppercase tracking-wider">Spec Params</h4>
          <div
            v-for="param in [
              { key: 'spec_type', label: 'Spec Type', type: 'text' },
              { key: 'spec_draft_n_max', label: 'Spec Draft N-Max', type: 'number' },
            ]"
            :key="param.key"
            class="space-y-2"
          >
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
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
          <h4 class="text-base font-semibold text-text-muted uppercase tracking-wider">Split Params</h4>
          <div
            v-for="param in [
              { key: 'layer_split', label: 'Layer Split', type: 'text' },
              { key: 'tensor_split', label: 'Tensor Split', type: 'text' },
              { key: 'primary_gpu', label: 'Primary GPU', type: 'number' },
            ]"
            :key="param.key"
            class="space-y-2"
          >
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
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
          <h4 class="text-base font-semibold text-text-muted uppercase tracking-wider">GPU Selection</h4>
          <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-card-hover">
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

        <!-- Test Parameters -->
        <div class="space-y-3">
          <h4 class="text-base font-semibold text-text-muted uppercase tracking-wider">Test Parameters</h4>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Context Length</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.context_length ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, context_length: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Context Length Multiplier</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.context_length_multiplier ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, context_length_multiplier: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Context Length Max</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.context_length_max ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, context_length_max: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
          </div>

          <div class="border-t border-border"></div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Batch Size</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.batch_size ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, batch_size: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Batch Size Step</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.batch_size_step ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, batch_size_step: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Batch Size Max</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.batch_size_max ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, batch_size_max: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
          </div>

          <div class="border-t border-border"></div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">U Batch Size</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.u_batch_size ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, u_batch_size: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">U Batch Size Step</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.u_batch_size_step ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, u_batch_size_step: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">U Batch Size Max</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.u_batch_size_max ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, u_batch_size_max: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
          </div>

          <div class="border-t border-border"></div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">GPU Layer Offload</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.gpu_layer_offload ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, gpu_layer_offload: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">GPU Layer Offload Step</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.gpu_layer_offload_step ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, gpu_layer_offload_step: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">GPU Layer Offload Max</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.gpu_layer_offload_max ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, gpu_layer_offload_max: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
          </div>

          <div class="border-t border-border"></div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Cache RAM (GB)</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.cache_ram ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, cache_ram: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Cache RAM Step</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.cache_ram_step ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, cache_ram_step: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
            <div class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
              <label class="text-sm text-text-secondary min-w-[180px]">Cache RAM Max</label>
              <input
                type="number"
                :value="visualConfigs.test_params?.cache_ram_max ?? ''"
                @input="visualConfigs.test_params = { ...visualConfigs.test_params, cache_ram_max: Number($event.target.value) }"
                class="input w-40 text-xs"
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Actions (fixed, does not scroll) -->
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

      <!-- Toast Notification -->
      <Transition name="toast">
        <div v-if="toast.show" class="fixed bottom-6 right-6 z-[100] max-w-sm">
          <div
            class="rounded-lg p-4 shadow-lg border flex items-center gap-3"
            :class="toast.type === 'success' ? 'bg-success-subtle border-success/30 text-success' : 'bg-error-subtle border-error/30 text-error'"
          >
            <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm">{{ toast.message }}</span>
          </div>
        </div>
      </Transition>
    </div>
    </div>
  </div>

    <!-- Service Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showServiceModal" class="fixed inset-0 z-50 flex items-center justify-center" @keydown="(e) => { if (e.key === 'Escape') closeServiceModal() }">
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeServiceModal"
          />

          <!-- Modal -->
          <div class="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] mx-4 flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <div>
                  <h3 class="text-lg font-semibold text-text-primary">Edit Systemd Service</h3>
                  <p class="text-xs text-text-muted mt-0.5">Configure the llama.service systemd user service</p>
                </div>
              </div>
              <button
                @click="closeServiceModal"
                class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="overflow-auto flex-1 p-6">
              <!-- Loading state -->
              <div v-if="loadingServiceConfig" class="flex items-center justify-center py-12">
                <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>

              <!-- No service installed -->
              <div v-else-if="serviceConfig && !serviceConfig.exists" class="text-center py-12">
                <svg class="w-12 h-12 mx-auto mb-4 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <h4 class="text-base font-medium text-text-primary mb-2">No Systemd Service Installed</h4>
                <p class="text-sm text-text-muted mb-4 max-w-md mx-auto">
                  To install a systemd service, go to the Reports page, select a report, click on a test run row to view its configuration, and use the "Install" button to install the launch command as a service.
                </p>
                <button
                  @click="closeServiceModal"
                  class="btn btn-primary btn-sm"
                >
                  Go to Reports
                </button>
              </div>

              <!-- Edit form -->
              <div v-else-if="serviceConfig && serviceConfig.exists" class="space-y-6">
                <!-- ExecStart command -->
                <div>
                  <label class="text-xs font-semibold text-text-muted uppercase tracking-wider">ExecStart Command</label>
                  <textarea
                    v-model="serviceEditForm.execStart"
                    class="textarea font-mono text-xs mt-2 h-20"
                    placeholder="/path/to/llama-server --port 11434 ..."
                  />
                  <p class="text-xs text-text-muted mt-1">Full command to execute, without the leading path to the binary</p>
                </div>

                <!-- Environment Variables -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-semibold text-text-muted uppercase tracking-wider">Environment Variables</label>
                    <button
                      @click="addEnvVar"
                      class="btn btn-ghost btn-xs flex items-center gap-1"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Variable
                    </button>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(value, key) in serviceEditForm.envVars"
                      :key="key"
                      class="flex items-center gap-2"
                    >
                      <input
                        :value="key"
                        @input="updateEnvVarKey(key, $event.target.value)"
                        class="input flex-1 font-mono text-xs"
                        placeholder="KEY"
                      />
                      <span class="text-text-muted text-xs">=</span>
                      <input
                        :value="value"
                        @input="updateEnvVarValue(key, $event.target.value)"
                        class="input flex-1 font-mono text-xs"
                        placeholder="value"
                      />
                      <button
                        @click="removeEnvVar(key)"
                        class="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error-subtle transition-all"
                        title="Remove variable"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Restart Policy -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs font-semibold text-text-muted uppercase tracking-wider">Restart Policy</label>
                    <select
                      v-model="serviceEditForm.restart"
                      class="input mt-2"
                    >
                      <option value="no">No</option>
                      <option value="on-success">On Success</option>
                      <option value="on-failure">On Failure</option>
                      <option value="always">Always</option>
                      <option value="on-abnormal">On Abnormal</option>
                      <option value="on-watchdog">On Watchdog</option>
                      <option value="on-abort">On Abort</option>
                      <option value="on-failure-proc-sigterm">On Failure (SigTerm)</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-text-muted uppercase tracking-wider">Restart Sec (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      v-model.number="serviceEditForm.restartSec"
                      class="input mt-2"
                    />
                  </div>
                </div>

                <!-- Save success/error messages -->
                <div v-if="serviceSaveSuccess" class="bg-success-subtle border border-success/30 rounded-lg p-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-xs font-medium text-success">{{ serviceSaveSuccess }}</span>
                </div>
                <div v-if="serviceSaveError" class="bg-error-subtle border border-error/30 rounded-lg p-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-xs font-medium text-error">{{ serviceSaveError }}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end px-6 py-3 border-t border-border flex-shrink-0 gap-2">
              <button
                @click="closeServiceModal"
                class="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                v-if="serviceConfig && serviceConfig.exists"
                @click="handleSaveService"
                class="btn btn-primary btn-sm"
                :disabled="savingService || !serviceEditForm.execStart"
              >
                {{ savingService ? 'Saving...' : 'Save & Restart' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
