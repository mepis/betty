<script setup>
import { watch, onUnmounted } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark'
import SystemStats from '@/components/SystemStats.vue'

const store = useBenchmarkStore()
let timer = null

watch(
  () => store.showSysInfo,
  async (val) => {
    if (val) {
      await store.fetchSystemStatus()
      timer = setInterval(async () => {
        await store.fetchSystemStatus()
      }, 1500)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="store.showSysInfo" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="store.showSysInfo = false"
        />

        <!-- Modal -->
        <div class="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h3 class="text-lg font-semibold text-text-primary">System Info</h3>
              <p class="text-xs text-text-muted mt-0.5">Real-time system statistics</p>
            </div>
            <button
              @click="store.showSysInfo = false"
              class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <SystemStats :store="store" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
