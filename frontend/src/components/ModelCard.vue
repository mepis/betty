<template>
  <div class="bg-dark-800 rounded-lg p-4 border border-dark-700 hover:border-dark-600 transition-colors">
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1">
        <h3 class="text-white font-medium mb-1">{{ model.name }}</h3>
        <p class="text-dark-400 text-sm mb-2">{{ model.description }}</p>
        <div class="flex flex-wrap gap-2 mb-2">
          <span class="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded">
            {{ model.quantization || 'Unknown' }}
          </span>
          <span class="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded">
            {{ formatBytes(model.size) }}
          </span>
          <span v-if="model.parameters" class="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded">
            {{ model.parameters }}
          </span>
          <span v-if="model.isActive" class="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
            Active
          </span>
        </div>
        <div v-if="model.tags && model.tags.length" class="flex flex-wrap gap-1">
          <span
            v-for="tag in model.tags"
            :key="tag"
            class="px-2 py-0.5 bg-blue-900/20 text-blue-400 text-xs rounded"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <!-- Local model actions -->
      <template v-if="model.isLocal">
        <button
          v-if="!model.isActive"
          @click="$emit('load', model)"
          class="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Load Model
        </button>
        <button
          v-else
          disabled
          class="flex-1 px-3 py-2 bg-green-900/30 text-green-400 rounded text-sm font-medium cursor-not-allowed"
        >
          Currently Active
        </button>
        <button
          v-if="!model.isActive"
          @click="$emit('delete', model)"
          class="px-3 py-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/30 transition-colors text-sm"
          title="Delete model"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </template>

      <!-- Available model actions -->
      <template v-else>
        <button
          @click="$emit('download', model)"
          class="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  model: {
    type: Object,
    required: true,
  },
});

defineEmits(['download', 'load', 'delete']);

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
</script>
