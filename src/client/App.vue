<script setup lang="ts">
import { RouterView } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import AppHeader from './components/AppHeader.vue';
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-slate-50">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main content area -->
    <main class="flex-1 flex flex-col min-w-0">
      <AppHeader />
      <RouterView />
    </main>
  </div>
</template>
