<template>
  <div
    class="flex items-center gap-x-2 sm:gap-x-3 px-2 sm:px-4 py-1.5 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 select-none overflow-x-auto"
  >
    <!-- Connection status -->
    <div class="flex items-center gap-1.5 shrink-0">
      <span
        :class="[
          'w-2 h-2 rounded-full',
          status === 'connected' ? 'bg-green-400' : 'bg-red-400',
        ]"
      ></span>
      <span class="hidden xs:inline">{{ status }}</span>
      <span class="xs:hidden">{{ shortStatus }}</span>
    </div>

    <!-- Idle / Busy -->
    <div class="flex items-center gap-1.5 shrink-0">
      <span
        :class="[
          'w-2 h-2 rounded-full',
          isIdle ? 'bg-gray-600' : 'bg-yellow-400 animate-pulse',
        ]"
      ></span>
      <span class="hidden xs:inline">{{ isIdle ? "idle" : "working" }}</span>
      <span class="xs:hidden">{{ isIdle ? "idle" : "busy" }}</span>
    </div>

    <!-- Session info (hidden on very small screens) -->
    <span v-if="session" class="hidden sm:inline text-gray-500 shrink-0">
      session: {{ session.id ? session.id.slice(0, 8) : "default" }}
    </span>

    <!-- Queue (hidden on very small screens) -->
    <span v-if="queueLength > 0" class="hidden sm:inline text-amber-400 shrink-0">
      queue: {{ queueLength }}
    </span>

    <!-- Spacer -->
    <div class="flex-1 min-w-0"></div>

    <!-- Error (truncates on small screens) -->
    <span v-if="error" class="text-red-400 truncate max-w-[120px] sm:max-w-xs shrink-0">
      {{ error }}
    </span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, default: "disconnected" },
  isIdle: { type: Boolean, default: true },
  session: { type: Object, default: null },
  queueLength: { type: Number, default: 0 },
  error: { type: String, default: "" },
});

const shortStatus = computed(() => {
  if (props.status === "connected") return "●";
  if (props.status === "error") return "✕";
  return "○";
});
</script>
