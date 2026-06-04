<template>
  <div class="settings-overlay" @click="$emit('close')" />
  <div class="settings-panel">
    <div class="p-4 border-b border-gray-800 flex items-center justify-between">
      <h2 class="text-lg font-bold">Settings</h2>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-200 text-xl">×</button>
    </div>

    <!-- Connection -->
    <div class="settings-section">
      <h3>Connection</h3>
      <div class="connection-status mb-3">
        <span class="status-dot" :class="connectionState" />
        <span>{{ connectionLabel }}</span>
      </div>
    </div>

    <!-- Model -->
    <div class="settings-section">
      <h3>Model</h3>
      <select v-model="selectedModel" @change="changeModel" class="settings-select">
        <option v-if="availableModels.length === 0" disabled>No models available</option>
        <option v-for="model in availableModels" :key="model.id" :value="model.id">
          {{ model.name || `${model.provider}/${model.id}` }} ({{ model.provider }})
        </option>
      </select>
      <p v-if="availableModels.length === 0" class="text-xs text-yellow-400 mt-2">
        No models available. Configure API keys.
      </p>
    </div>

    <!-- Thinking Level -->
    <div class="settings-section">
      <h3>Thinking Level</h3>
      <select v-model="selectedThinkingLevel" @change="changeThinkingLevel" class="settings-select">
        <option v-for="level in availableThinkingLevels" :key="level" :value="level">
          {{ level }}
        </option>
      </select>
      <p class="text-xs text-gray-500 mt-2">
        Only levels available for the current model are shown.
      </p>
    </div>

    <!-- Session Stats -->
    <div class="settings-section">
      <h3>Session Stats</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Tokens</span>
          <span class="stat-value">{{ stats.tokensUsed?.toLocaleString() || '—' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Cost</span>
          <span class="stat-value">${{ stats.cost?.toFixed(4) || '—' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Context</span>
          <span class="stat-value">{{ stats.contextPercentage?.toFixed(1) || '—' }}%</span>
        </div>
      </div>
      <div class="context-bar">
        <div class="context-fill" :style="{ width: stats.contextPercentage + '%' }" />
      </div>
    </div>

    <!-- Shared Secret -->
    <div class="settings-section">
      <h3>Shared Secret</h3>
      <input
        type="password"
        v-model="sharedSecret"
        placeholder="Enter shared secret"
        class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        @change="saveSharedSecret"
      />
      <p class="text-xs text-gray-500 mt-2">
        Used for WebSocket authentication.
      </p>
    </div>

    <!-- API Keys -->
    <div class="settings-section">
      <h3>API Keys</h3>
      <div class="api-key-input" v-for="provider in apiProviders" :key="provider">
        <label>{{ provider }}</label>
        <input
          type="password"
          v-model="apiKeys[provider]"
          placeholder="Enter API key"
          class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button @click="saveApiKey(provider)" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useSettingsStore } from '@/stores/settings';
import { useWebSocket } from '@/composables/useWebSocket';
import { useToast } from '@/composables/useToast';

defineEmits<{
  close: [];
}>();

const chatStore = useChatStore();
const settingsStore = useSettingsStore();
const { sendCommand } = useWebSocket();
const { showToast } = useToast();

const connectionState = computed(() => chatStore.connectionState);
const connectionLabel = computed(() => {
  switch (chatStore.connectionState) {
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting...';
    case 'error': return 'Error';
    default: return 'Disconnected';
  }
});

// Models
const availableModels = ref<any[]>([]);
const selectedModel = ref(chatStore.currentModel || '');

async function loadModels() {
  try {
    const response = await fetch('/api/models', {
      headers: { 'X-Shared-Secret': settingsStore.sharedSecret || 'dev-secret' },
    });
    if (response.ok) {
      const data = await response.json();
      availableModels.value = data.models || [];
      if (availableModels.value.length > 0 && !chatStore.currentModel) {
        selectedModel.value = availableModels.value[0].id;
      }
    }
  } catch (err) {
    console.error('Failed to load models:', err);
  }
}

async function changeModel() {
  const model = availableModels.value.find((m) => m.id === selectedModel.value);
  if (model) {
    try {
      await sendCommand('set_model', {
        provider: model.provider,
        modelId: model.id,
      });
    } catch (err: any) {
      showToast('error', `Failed to change model: ${err.message}`);
    }
  }
}

// Thinking levels
const thinkingLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
const availableThinkingLevels = ref<string[]>(['off']);
const selectedThinkingLevel = ref(chatStore.currentThinkingLevel || 'off');

// Filter thinking levels based on model type
function filterThinkingLevels() {
  const model = availableModels.value.find((m) => m.id === selectedModel.value);
  if (model?.reasoning) {
    // Reasoning models support all levels
    availableThinkingLevels.value = thinkingLevels;
  } else {
    // Non-reasoning models only support 'off'
    availableThinkingLevels.value = ['off'];
    if (selectedThinkingLevel.value !== 'off') {
      selectedThinkingLevel.value = 'off';
    }
  }
}

async function changeThinkingLevel() {
  try {
    await sendCommand('set_thinking_level', { level: selectedThinkingLevel.value });
  } catch (err: any) {
    showToast('error', `Failed to change thinking level: ${err.message}`);
  }
}

// Session stats
const stats = computed(() => chatStore.sessionStats || { tokensUsed: 0, cost: 0, contextPercentage: 0 });

// Shared secret
const sharedSecret = ref(settingsStore.sharedSecret);
function saveSharedSecret() {
  settingsStore.setSharedSecret(sharedSecret.value);
  showToast('info', 'Shared secret saved. Reconnecting...');
  // Reconnect would be handled by the WebSocket service
}

// API keys
const apiProviders = ['OpenAI', 'Anthropic', 'Google'];
const apiKeys = ref(settingsStore.apiKeys);

function saveApiKey(provider: string) {
  settingsStore.setApiKey(provider, apiKeys.value[provider] || '');
  showToast('success', `API key saved for ${provider}`);
}

onMounted(() => {
  loadModels();
  filterThinkingLevels();
  settingsStore.loadFromLocalStorage();
  sharedSecret.value = settingsStore.sharedSecret;
  apiKeys.value = { ...settingsStore.apiKeys };
});
</script>
