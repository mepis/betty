<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import SystemStats from '@/components/SystemStats.vue'

const store = useBenchmarkStore()
let timer = null

onMounted(async () => {
  await store.fetchSystemStatus()
  timer = setInterval(async () => {
    await store.fetchSystemStatus()
  }, 5000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="m-2">
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">System</h2>
      </div>
      <SystemStats :store="store" />
    </div>
  </div>
</template>
