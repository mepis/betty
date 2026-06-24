import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Settings from '@/views/Settings.vue'
import Reports from '@/views/Reports.vue'
import Models from '@/views/Models.vue'
import Docs from '@/views/Docs.vue'
import Logs from '@/views/Logs.vue'
import PiChat from '@/views/PiChat.vue'
import SysInfo from '@/views/SysInfo.vue'
import Admin from '@/views/Admin.vue'

const routes = [
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
    meta: {
      title: 'Admin',
    },
  },
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
    },
  },
  {
    path: '/docs',
    name: 'docs',
    component: Docs,
    meta: {
      title: 'Docs',
    },
  },
  {
    path: '/logs',
    name: 'logs',
    component: Logs,
    meta: {
      title: 'Logs',
    },
  },
  {
    path: '/sys-info',
    name: 'sys-info',
    component: SysInfo,
    meta: {
      title: 'Sys Info',
    },
  },
  {
    path: '/',
    name: 'pi',
    component: PiChat,
    meta: {
      title: 'Chat',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
