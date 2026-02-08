<script setup>
import { useSettingsStore } from '../stores/settings'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import ModelSelector from './ModelSelector.vue'
import UserMenu from './UserMenu.vue'

const settings = useSettingsStore()
const chat = useChatStore()
const auth = useAuthStore()
</script>

<template>
  <aside
    class="flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300 relative"
    :class="settings.sidebarOpen ? 'w-72' : 'w-16'"
  >
    <!-- Hamburger menu button - always visible -->
    <div class="p-4 border-b border-dark-700">
      <button
        @click="settings.toggleSidebar"
        class="p-2 rounded hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
        :title="settings.sidebarOpen ? 'Close sidebar' : 'Open sidebar'"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="!settings.sidebarOpen"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6" v-show="settings.sidebarOpen">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-dark-100">Betty</h1>
      </div>

      <!-- New Chat Button -->
      <button
        @click="chat.clearChat"
        class="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Chat
      </button>

      <!-- Navigation -->
      <nav class="space-y-2">
        <router-link
          to="/"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
          :class="$route.path === '/' ? 'bg-dark-800 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </router-link>
        <router-link
          to="/completions"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
          :class="$route.path === '/completions' ? 'bg-dark-800 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Completions
        </router-link>
        <router-link
          to="/documents"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
          :class="$route.path === '/documents' ? 'bg-dark-800 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Documents
        </router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/models"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
          :class="$route.path === '/models' ? 'bg-dark-800 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Models
        </router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/admin"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
          :class="$route.path === '/admin' ? 'bg-dark-800 text-white' : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin Settings
        </router-link>
        <a
          href="/docs"
          target="_blank"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-dark-400 hover:bg-dark-800 hover:text-dark-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Documentation
          <svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </nav>

      <!-- Divider -->
      <div class="border-t border-dark-700"></div>

      <!-- Model Selector -->
      <ModelSelector />

    </div>

    <!-- User Menu & Footer -->
    <div class="p-4 border-t border-dark-700 space-y-3" v-show="settings.sidebarOpen">
      <!-- User Menu -->
      <UserMenu />

      <p class="text-xs text-dark-500">
        Powered by llama.cpp
      </p>
    </div>
  </aside>
</template>
