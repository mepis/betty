import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Config from '@/views/Config.vue'
import Reports from '@/views/Reports.vue'

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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
