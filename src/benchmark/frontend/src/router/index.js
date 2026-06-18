import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Config from '@/views/Config.vue'
import Reports from '@/views/Reports.vue'
import Models from '@/views/Models.vue'
import Docs from '@/views/Docs.vue'
import Logs from '@/views/Logs.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
  },
  {
    path: '/config',
    name: 'config',
    component: Config,
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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
