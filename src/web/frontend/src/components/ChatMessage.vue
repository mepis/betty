<template>
  <div :class="['flex gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3', messageClass]">
    <!-- Avatar -->
    <div
      :class="[
        'flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold',
        avatarClass,
      ]"
    >
      {{ avatarText }}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div
        v-if="message.role === 'user'"
        class="text-sm sm:text-base text-gray-100 whitespace-pre-wrap break-words"
      >
        {{ message.content }}
      </div>

      <div
        v-else-if="message.role === 'system'"
        class="text-xs sm:text-sm text-gray-500 italic"
      >
        {{ message.content }}
      </div>

      <div
        v-else-if="message.role === 'tool_status'"
        :class="[
          'text-xs sm:text-sm font-mono rounded px-2 py-1',
          message.toolStatus === 'running'
            ? 'bg-yellow-900/30 text-yellow-300'
            : message.toolStatus === 'success'
              ? 'bg-green-900/30 text-green-300'
              : 'bg-red-900/30 text-red-300',
        ]"
      >
        {{ message.content }}
      </div>

      <div
        v-else
        class="markdown-body text-sm sm:text-base text-gray-200"
        v-html="renderedHtml"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { renderMarkdown } from "../composables/useRpc.js";

const props = defineProps({
  message: { type: Object, required: true },
});

const messageClass = computed(() => {
  if (props.message.role === "user") return "bg-gray-800/50";
  if (props.message.role === "system") return "bg-transparent";
  if (props.message.role === "tool_status") return "bg-transparent";
  return "bg-gray-900/30";
});

const avatarClass = computed(() => {
  if (props.message.role === "user") return "bg-blue-600 text-white";
  if (props.message.role === "system") return "bg-gray-700 text-gray-400";
  if (props.message.role === "tool_status") return "bg-gray-700 text-gray-400";
  return "bg-emerald-600 text-white";
});

const avatarText = computed(() => {
  if (props.message.role === "user") return "U";
  if (props.message.role === "system") return "⚙";
  if (props.message.role === "tool_status") return "🔧";
  return "π";
});

const renderedHtml = computed(() => renderMarkdown(props.message.content));
</script>
