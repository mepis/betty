<template>
  <div class="tool-execution">
    <div class="tool-header" @click="collapsed = !collapsed">
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="{
            'bg-yellow-400': toolCall.status === 'running',
            'bg-green-400': toolCall.status === 'completed',
            'bg-red-400': toolCall.status === 'error',
          }"
        />
        <span class="text-sm font-mono">{{ toolCall.name }}</span>
      </div>
      <span class="text-xs text-gray-500">{{ collapsed ? '▶' : '▼' }}</span>
    </div>
    <div v-if="!collapsed" class="tool-body p-3">
      <!-- Arguments -->
      <div v-if="Object.keys(toolCall.args).length > 0" class="mb-2">
        <span class="text-xs text-gray-500 font-semibold">Args:</span>
        <pre class="text-xs text-gray-400 mt-1 overflow-x-auto">{{ formatArgs }}</pre>
      </div>
      <!-- Result -->
      <div v-if="toolCall.result">
        <span class="text-xs text-gray-500 font-semibold">Result:</span>
        <pre
          class="text-xs text-gray-400 mt-1 overflow-x-auto"
          :class="{ 'text-red-400': toolCall.status === 'error' }"
        >{{ toolCall.result }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ToolCall } from '@/stores/chat';

const props = defineProps<{
  toolCall: ToolCall;
}>();

const collapsed = ref(true);

const formatArgs = computed(() => {
  try {
    return JSON.stringify(props.toolCall.args, null, 2);
  } catch {
    return String(props.toolCall.args);
  }
});
</script>
