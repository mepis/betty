<template>
  <div class="message" :class="message.role">
    <div class="message-content">
      <!-- User message -->
      <div v-if="message.role === 'user'" class="whitespace-pre-wrap">
        {{ message.content }}
      </div>

      <!-- Assistant message -->
      <template v-else>
        <!-- Thinking content -->
        <ThinkingBlock
          v-if="message.thinkingContent && showThinking"
          :content="message.thinkingContent"
          :collapsed="true"
        />

        <!-- Text content -->
        <MarkdownRenderer v-if="message.content" :content="message.content" />

        <!-- Streaming indicator -->
        <div v-if="message.streaming" class="flex items-center gap-1 mt-2">
          <span class="pulse-dot w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
          <span class="pulse-dot w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
          <span class="pulse-dot w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
        </div>

        <!-- Tool calls -->
        <ToolExecution
          v-for="toolCall in message.toolCalls"
          :key="toolCall.id"
          :tool-call="toolCall"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import MarkdownRenderer from './MarkdownRenderer.vue';
import ThinkingBlock from './ThinkingBlock.vue';
import ToolExecution from './ToolExecution.vue';
import type { Message } from '@/stores/chat';

const props = defineProps<{
  message: Message;
}>();

const settingsStore = useSettingsStore();

const showThinking = computed(() => settingsStore.showThinking);
</script>
