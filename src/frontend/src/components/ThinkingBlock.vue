<template>
  <div class="thinking-block">
    <div class="thinking-header" @click="collapsed = !collapsed">
      <span>💭 Thinking</span>
      <span>{{ collapsed ? '▶' : '▼' }}</span>
    </div>
    <div v-if="!collapsed" class="thinking-body">
      <div class="thinking-content-scroll">
        <MarkdownRenderer :content="content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MarkdownRenderer from './MarkdownRenderer.vue';

const props = defineProps<{
  content: string;
  collapsed?: boolean;
}>();

const collapsed = ref(props.collapsed !== false);
</script>
