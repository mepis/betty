import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Config from '@/views/Config.vue'
import Reports from '@/views/Reports.vue'
import Models from '@/views/Models.vue'

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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
