<template>
  <div class="flex h-screen bg-dark-900">
    <Sidebar />

    <main class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-6xl mx-auto">
          <ModelManager />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue';
import ModelManager from '../components/ModelManager.vue';
</script>
