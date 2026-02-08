<script setup>
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <div class="space-y-6">
    <!-- Temperature -->
    <div>
      <label class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-dark-200">Temperature</span>
        <span class="text-sm text-dark-400">{{ settings.temperature.toFixed(2) }}</span>
      </label>
      <input
        type="range"
        v-model.number="settings.temperature"
        min="0"
        max="2"
        step="0.05"
        class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <p class="mt-1 text-xs text-dark-500">Higher = more creative, lower = more focused</p>
    </div>

    <!-- Max Tokens -->
    <div>
      <label class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-dark-200">Max Tokens</span>
        <span class="text-sm text-dark-400">{{ settings.maxTokens }}</span>
      </label>
      <input
        type="range"
        v-model.number="settings.maxTokens"
        min="64"
        max="4096"
        step="64"
        class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <p class="mt-1 text-xs text-dark-500">Maximum response length</p>
    </div>

    <!-- Top P -->
    <div>
      <label class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-dark-200">Top P</span>
        <span class="text-sm text-dark-400">{{ settings.topP.toFixed(2) }}</span>
      </label>
      <input
        type="range"
        v-model.number="settings.topP"
        min="0"
        max="1"
        step="0.05"
        class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <p class="mt-1 text-xs text-dark-500">Nucleus sampling threshold</p>
    </div>

    <!-- System Prompt -->
    <div>
      <label class="block text-sm font-medium text-dark-200 mb-2">
        System Prompt
      </label>
      <textarea
        v-model="settings.systemPrompt"
        rows="4"
        class="w-full rounded-lg bg-dark-800 border border-dark-600 px-3 py-2 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
        placeholder="Instructions for the AI assistant..."
      />
    </div>

    <!-- Reset Button -->
    <button
      @click="settings.resetToDefaults"
      class="w-full py-2 px-4 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors text-sm"
    >
      Reset to Defaults
    </button>
  </div>
</template>
