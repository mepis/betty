import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Settings from '@/views/Settings.vue'
import Reports from '@/views/Reports.vue'
import Models from '@/views/Models.vue'
import Docs from '@/views/Docs.vue'
import Logs from '@/views/Logs.vue'
import PiChat from '@/views/PiChat.vue'

const routes = [
  {
    path: '/benchmark',
    name: 'dashboard',
    component: Dashboard,
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
  },
  {
    path: '/reports',
    name: 'reports',
    component: Reports,
  },
  {
    path: '/models',
    name: 'models',
    component: Models,
    meta: {
      title: 'Models',
      description: 'Search and download models from HuggingFace',
    },
  },
  {
    path: '/docs',
    name: 'docs',
    component: Docs,
    meta: {
      title: 'Docs',
      description: 'Project documentation and guides',
    },
  },
  {
    path: '/logs',
    name: 'logs',
    component: Logs,
    meta: {
      title: 'Logs',
      description: 'Systemd service logs from llama.service',
    },
  },
  {
    path: '/',
    name: 'pi',
    component: PiChat,
    meta: {
      title: 'Chat',
      description: 'Chat with an AI agent powered by Pi SDK',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
