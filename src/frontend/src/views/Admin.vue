<script setup>
import { ref, defineAsyncComponent } from 'vue'

const tabs = [
  { name: 'Benchmark', key: 'benchmark' },
  { name: 'Models', key: 'models' },
  { name: 'Chat Templates', key: 'chatTemplates' },
  { name: 'Settings', key: 'settings' },
  { name: 'Reports', key: 'reports' },
  { name: 'Logs', key: 'logs' },
  { name: 'Sys Info', key: 'sysInfo' },
]

const activeTab = ref('benchmark')

const components = {
  benchmark: defineAsyncComponent(() => import('@/views/Dashboard.vue')),
  models: defineAsyncComponent(() => import('@/views/Models.vue')),
  chatTemplates: defineAsyncComponent(() => import('@/views/ChatTemplates.vue')),
  settings: defineAsyncComponent(() => import('@/views/Settings.vue')),
  reports: defineAsyncComponent(() => import('@/views/Reports.vue')),
  logs: defineAsyncComponent(() => import('@/views/Logs.vue')),
  sysInfo: defineAsyncComponent(() => import('@/views/SysInfo.vue')),
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Tab bar -->
    <div class="border-b border-border bg-bg-secondary px-4 pt-4">
      <div class="flex gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 flex-shrink-0"
          :class="
            activeTab === tab.key
              ? 'bg-bg-primary text-accent border-t-2 border-l border-r border-border'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          "
        >
          {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto bg-bg-primary">
      <component :is="components[activeTab]" />
    </div>
  </div>
</template>
