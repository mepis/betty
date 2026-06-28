<script setup>
defineProps({
  store: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="space-y-4">
    <!-- Memory -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-sm text-text-muted">Memory</span>
        <span class="text-sm font-mono font-medium">
          {{ store.systemMemory.usedGB.toFixed(1) }} / {{ store.systemMemory.totalGB.toFixed(1) }} GB
        </span>
      </div>
      <div class="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
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
      <div class="text-right mt-1">
        <span class="text-xs text-text-muted">{{ store.systemMemory.percentUsed }}% used</span>
      </div>
    </div>

    <!-- CPU -->
    <div class="pt-3 border-t border-border">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-sm text-text-muted">CPU</span>
        <span class="text-sm font-mono font-medium">{{ store.systemMemory.cpuUsage }}%</span>
      </div>
      <div class="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="
            store.systemMemory.cpuUsage > 90
              ? 'bg-error'
              : store.systemMemory.cpuUsage > 70
                ? 'bg-warning'
                : 'bg-success'
          "
          :style="{ width: `${Math.min(store.systemMemory.cpuUsage, 100)}%` }"
        />
      </div>
      <div class="text-right mt-1">
        <span class="text-xs text-text-muted">{{ store.systemMemory.cpuUsage }}% used</span>
      </div>

      <!-- Per-core breakdown -->
      <div v-if="store.systemMemory.cpuCores.length > 0" class="mt-3 grid grid-cols-5 gap-3">
        <div
          v-for="core in store.systemMemory.cpuCores"
          :key="core.name"
          class="flex items-center gap-3"
        >
          <span class="text-xs font-mono font-medium text-text-muted w-16 flex-shrink-0">{{ core.name }}</span>
          <div class="flex-1 h-4 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1.5"
              :class="
                core.usage > 90
                  ? 'bg-error'
                  : core.usage > 70
                    ? 'bg-warning'
                    : 'bg-success'
              "
              :style="{ width: `${Math.min(core.usage, 100)}%` }"
            >
              <span v-if="core.usage > 15" class="text-[10px] font-mono font-medium text-bg-primary">
                {{ core.usage }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- GPU Stats -->
    <div v-if="store.systemMemory.gpuStats && store.systemMemory.gpuStats.length > 0" class="pt-3 border-t border-border">
      <div v-for="gpu in store.systemMemory.gpuStats" :key="gpu.index" class="space-y-3">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-sm font-medium text-text-primary">{{ gpu.name }}</span>
          <span class="text-sm font-mono font-medium">{{ gpu.temperature }}°C</span>
        </div>

        <!-- Core utilization -->
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-text-muted">Core</span>
          <span class="text-xs font-mono">{{ gpu.utilization }}%</span>
        </div>
        <div class="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="
              gpu.utilization > 90 ? 'bg-error' : gpu.utilization > 70 ? 'bg-warning' : 'bg-success'
            "
            :style="{ width: `${Math.min(gpu.utilization, 100)}%` }"
          />
        </div>

        <!-- VRAM -->
        <div class="flex items-center justify-between mb-1 mt-2">
          <span class="text-xs text-text-muted">VRAM</span>
          <span class="text-xs font-mono">{{ gpu.memoryUsedMB }} / {{ gpu.memoryTotalMB }} MB</span>
        </div>
        <div class="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="
              gpu.memoryUsedPercent > 90 ? 'bg-error' : gpu.memoryUsedPercent > 70 ? 'bg-warning' : 'bg-success'
            "
            :style="{ width: `${Math.min(gpu.memoryUsedPercent, 100)}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
