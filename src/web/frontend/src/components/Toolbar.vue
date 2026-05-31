<template>
  <div class="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-900/60 border-b border-gray-800">
    <!-- Logo -->
    <h1 class="text-base sm:text-lg font-bold text-gray-100 mr-1 sm:mr-4 shrink-0">
      <span class="text-emerald-400">π</span>i
    </h1>

    <!-- Mobile: hamburger menu -->
    <div class="sm:hidden">
      <button
        @click="menuOpen = !menuOpen"
        class="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
      >
        <svg v-if="!menuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Mobile dropdown -->
      <div
        v-if="menuOpen"
        class="absolute left-2 right-2 sm:hidden top-12 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 mt-1"
      >
        <button @click="emit('new-session'); menuOpen = false"
          class="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-3">
          <span class="text-base">＋</span> New Session
        </button>
        <button @click="emit('compact'); menuOpen = false"
          class="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-3">
          <span class="text-base">⊡</span> Compact
        </button>
        <button @click="emit('cycle-model'); menuOpen = false"
          class="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-3">
          <span class="text-base">⇄</span> Cycle Model
        </button>
        <button @click="emit('clear'); menuOpen = false"
          class="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-3">
          <span class="text-base">🗑</span> Clear View
        </button>
        <div class="border-t border-gray-700 mt-1 pt-1 px-4 py-1.5 text-xs text-gray-500">
          {{ messages.length }} messages
        </div>
      </div>

      <!-- Overlay to close menu -->
      <div
        v-if="menuOpen"
        @click="menuOpen = false"
        class="fixed inset-0 z-40 sm:hidden"
      ></div>
    </div>

    <!-- Desktop: inline buttons -->
    <div class="hidden sm:flex items-center gap-1">
      <button
        @click="emit('new-session')"
        class="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300 transition-colors"
      >
        New Session
      </button>

      <button
        @click="emit('compact')"
        class="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300 transition-colors"
      >
        Compact
      </button>

      <button
        @click="emit('cycle-model')"
        class="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300 transition-colors"
      >
        Cycle Model
      </button>

      <button
        @click="emit('clear')"
        class="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300 transition-colors"
      >
        Clear View
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Desktop: message count -->
    <span class="hidden sm:inline text-xs text-gray-500">
      {{ messages.length }} messages
    </span>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  messages: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "new-session",
  "compact",
  "cycle-model",
  "clear",
]);

const menuOpen = ref(false);
</script>
