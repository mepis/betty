<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">Model Management</h1>
      <div class="flex gap-3">
        <button
          @click="showCustomDownloadDialog = true"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          From HuggingFace
        </button>
        <button
          @click="refreshCatalog"
          :disabled="modelsStore.isLoadingCatalog"
          class="px-4 py-2 bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors disabled:opacity-50"
        >
          <svg
            class="w-5 h-5"
            :class="{ 'animate-spin': modelsStore.isLoadingCatalog }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div class="mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search models..."
        class="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded text-white placeholder-dark-400 focus:outline-none focus:border-blue-500"
      >
    </div>

    <!-- Error message -->
    <div
      v-if="modelsStore.error"
      class="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded text-red-400 flex items-center justify-between"
    >
      <span>{{ modelsStore.error }}</span>
      <button
        @click="modelsStore.clearError"
        class="text-red-400 hover:text-red-300"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Model switching in progress -->
    <div
      v-if="modelsStore.isSwitchingModel"
      class="mb-4 p-4 bg-blue-900/20 border border-blue-900/50 rounded text-blue-400"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Switching model, please wait...</span>
      </div>
    </div>

    <!-- Active Downloads -->
    <div v-if="modelsStore.hasActiveDownloads" class="mb-6">
      <h2 class="text-lg font-semibold text-white mb-3">Active Downloads</h2>
      <div class="space-y-3">
        <DownloadProgress
          v-for="download in modelsStore.activeDownloads"
          :key="download.downloadId"
          :download="download"
          @cancel="handleCancelDownload(download.downloadId)"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Tabs -->
      <div class="flex gap-4 mb-4 border-b border-dark-700">
        <button
          @click="activeTab = 'all'"
          class="px-4 py-2 text-sm font-medium transition-colors border-b-2"
          :class="activeTab === 'all'
            ? 'text-blue-400 border-blue-400'
            : 'text-dark-400 border-transparent hover:text-dark-200'"
        >
          All Models
        </button>
        <button
          @click="activeTab = 'local'"
          class="px-4 py-2 text-sm font-medium transition-colors border-b-2"
          :class="activeTab === 'local'
            ? 'text-blue-400 border-blue-400'
            : 'text-dark-400 border-transparent hover:text-dark-200'"
        >
          Downloaded ({{ modelsStore.localModels.length }})
        </button>
        <button
          @click="activeTab = 'available'"
          class="px-4 py-2 text-sm font-medium transition-colors border-b-2"
          :class="activeTab === 'available'
            ? 'text-blue-400 border-blue-400'
            : 'text-dark-400 border-transparent hover:text-dark-200'"
        >
          Available ({{ modelsStore.availableModels.length }})
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="modelsStore.isLoadingCatalog" class="flex items-center justify-center py-12">
        <svg class="w-8 h-8 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>

      <!-- Model grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelCard
          v-for="model in filteredModels"
          :key="model.id"
          :model="model"
          @download="handleDownload"
          @load="handleLoadModel"
          @delete="handleDeleteModel"
        />
      </div>

      <!-- Empty state -->
      <div
        v-if="!modelsStore.isLoadingCatalog && filteredModels.length === 0"
        class="text-center py-12"
      >
        <svg class="w-16 h-16 text-dark-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p class="text-dark-400">No models found</p>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :is-open="confirmDialog.isOpen"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :confirm-class="confirmDialog.confirmClass"
      @confirm="confirmDialog.onConfirm"
      @cancel="closeConfirmDialog"
    />

    <!-- Custom Download Dialog -->
    <div
      v-if="showCustomDownloadDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="closeCustomDownloadDialog"
    >
      <div class="bg-dark-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
        <h3 class="text-xl font-semibold text-white mb-4">
          Download from HuggingFace
        </h3>

        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-300 mb-2">
            Model Name (optional)
          </label>
          <input
            v-model="customDownload.name"
            type="text"
            placeholder="e.g., Llama 2 7B Chat"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded text-white placeholder-dark-500 focus:outline-none focus:border-blue-500"
          >
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-300 mb-2">
            HuggingFace URL <span class="text-red-400">*</span>
          </label>
          <input
            v-model="customDownload.url"
            type="url"
            placeholder="https://huggingface.co/.../model.gguf"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded text-white placeholder-dark-500 focus:outline-none focus:border-blue-500"
          >
          <p class="text-xs text-dark-400 mt-2">
            Enter the direct download URL to a .gguf file from HuggingFace
          </p>
        </div>

        <!-- Example -->
        <div class="mb-6 p-3 bg-dark-900 rounded border border-dark-700">
          <p class="text-xs text-dark-400 mb-2">Example URL:</p>
          <code class="text-xs text-blue-400 break-all">
            https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
          </code>
        </div>

        <!-- Error message -->
        <div
          v-if="customDownload.error"
          class="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm"
        >
          {{ customDownload.error }}
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="closeCustomDownloadDialog"
            class="px-4 py-2 rounded bg-dark-700 text-dark-200 hover:bg-dark-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleCustomDownload"
            :disabled="!customDownload.url || customDownload.isDownloading"
            class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              v-if="customDownload.isDownloading"
              class="w-4 h-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ customDownload.isDownloading ? 'Starting...' : 'Download' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useModelsStore } from '../stores/models';
import ModelCard from './ModelCard.vue';
import DownloadProgress from './DownloadProgress.vue';
import ConfirmDialog from './ConfirmDialog.vue';

const modelsStore = useModelsStore();

const activeTab = ref('all');
const searchQuery = ref('');

const confirmDialog = ref({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  confirmClass: 'bg-blue-600 text-white hover:bg-blue-700',
  onConfirm: () => {},
});

const showCustomDownloadDialog = ref(false);
const customDownload = ref({
  url: '',
  name: '',
  error: null,
  isDownloading: false,
});

const filteredModels = computed(() => {
  let models = [];

  if (activeTab.value === 'all') {
    models = modelsStore.allModels;
  } else if (activeTab.value === 'local') {
    models = modelsStore.localOnly;
  } else if (activeTab.value === 'available') {
    models = modelsStore.availableOnly;
  }

  return models;
});

watch(searchQuery, (newQuery) => {
  modelsStore.setSearchQuery(newQuery);
});

const refreshCatalog = async () => {
  await modelsStore.fetchCatalog();
};

const handleDownload = async (model) => {
  try {
    await modelsStore.downloadModel(model.id);
  } catch (error) {
    console.error('Download failed:', error);
  }
};

const handleCancelDownload = async (downloadId) => {
  try {
    await modelsStore.cancelDownload(downloadId);
  } catch (error) {
    console.error('Cancel failed:', error);
  }
};

const handleLoadModel = (model) => {
  confirmDialog.value = {
    isOpen: true,
    title: 'Switch Model',
    message: `Are you sure you want to switch to "${model.name}"? The llama.cpp server will restart and any ongoing chat will be interrupted.`,
    confirmText: 'Switch Model',
    confirmClass: 'bg-blue-600 text-white hover:bg-blue-700',
    onConfirm: async () => {
      try {
        await modelsStore.switchModel(model.filename);
        closeConfirmDialog();
      } catch (error) {
        console.error('Switch failed:', error);
        closeConfirmDialog();
      }
    },
  };
};

const handleDeleteModel = (model) => {
  confirmDialog.value = {
    isOpen: true,
    title: 'Delete Model',
    message: `Are you sure you want to delete "${model.name}"? This will permanently remove the model file (${formatBytes(model.size)}) from disk.`,
    confirmText: 'Delete',
    confirmClass: 'bg-red-600 text-white hover:bg-red-700',
    onConfirm: async () => {
      try {
        await modelsStore.deleteModel(model.filename);
        closeConfirmDialog();
      } catch (error) {
        console.error('Delete failed:', error);
        closeConfirmDialog();
      }
    },
  };
};

const closeConfirmDialog = () => {
  confirmDialog.value.isOpen = false;
};

const handleCustomDownload = async () => {
  customDownload.value.error = null;
  customDownload.value.isDownloading = true;

  // Basic validation
  if (!customDownload.value.url) {
    customDownload.value.error = 'URL is required';
    customDownload.value.isDownloading = false;
    return;
  }

  if (!customDownload.value.url.includes('huggingface.co')) {
    customDownload.value.error = 'URL must be from HuggingFace';
    customDownload.value.isDownloading = false;
    return;
  }

  if (!customDownload.value.url.endsWith('.gguf')) {
    customDownload.value.error = 'URL must point to a .gguf file';
    customDownload.value.isDownloading = false;
    return;
  }

  try {
    await modelsStore.downloadCustomModel(
      customDownload.value.url,
      customDownload.value.name
    );
    closeCustomDownloadDialog();
  } catch (error) {
    customDownload.value.error = error.message || 'Failed to start download';
  } finally {
    customDownload.value.isDownloading = false;
  }
};

const closeCustomDownloadDialog = () => {
  showCustomDownloadDialog.value = false;
  customDownload.value = {
    url: '',
    name: '',
    error: null,
    isDownloading: false,
  };
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

onMounted(() => {
  modelsStore.initialize();
});
</script>
