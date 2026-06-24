<script setup>
defineProps({
  store: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-text-muted">Memory</span>
      <span class="text-xs font-mono text-text-secondary">
        {{ store.systemMemory.usedGB.toFixed(1) }} / {{ store.systemMemory.totalGB.toFixed(1) }} GB
      </span>
    </div>
    <div class="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="
          store.systemMemory.percentUsed > 90
            ? 'bg-error'
            : store.systemMemory.percentUsed > 70
              ? 'bg-warning'
              : 'bg-success'
        "
        :style="{ width: `${Math.min(store.systemMemory.percentUsed, 100)}%` }"
      />
    </div>
    <div class="text-right">
      <span class="text-[10px] text-text-muted">{{ store.systemMemory.percentUsed }}% used</span>
    </div>
  </div>
</template>
