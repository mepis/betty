import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Settings from '@/views/Settings.vue'
import Reports from '@/views/Reports.vue'
import Models from '@/views/Models.vue'
import Docs from '@/views/Docs.vue'
import Library from '@/views/Library.vue'
import Logs from '@/views/Logs.vue'
import PiChat from '@/views/PiChat.vue'
import SysInfo from '@/views/SysInfo.vue'
import Admin from '@/views/Admin.vue'
import Account from '@/views/Account.vue'
import Login from '@/views/Login.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: 'Sign In',
      guest: true, // Only accessible when not logged in
    },
  },
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
    meta: {
      title: 'LLM Server Configs',
      requiresAuth: true,
    },
  },
  {
    path: '/benchmark',
    name: 'dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/reports',
    name: 'reports',
    component: Reports,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/models',
    name: 'models',
    component: Models,
    meta: {
      title: 'Models',
      requiresAuth: true,
    },
  },
  {
    path: '/docs',
    name: 'docs',
    component: Docs,
    meta: {
      title: 'Docs',
      requiresAuth: true,
    },
  },
  {
    path: '/library',
    name: 'library',
    component: Library,
    meta: {
      title: 'Library',
      requiresAuth: true,
    },
  },
  {
    path: '/logs',
    name: 'logs',
    component: Logs,
    meta: {
      title: 'Logs',
      requiresAuth: true,
    },
  },
  {
    path: '/sys-info',
    name: 'sys-info',
    component: SysInfo,
    meta: {
      title: 'Sys Info',
      requiresAuth: true,
    },
  },
  {
    path: '/account',
    name: 'account',
    component: Account,
    meta: {
      title: 'Account',
      requiresAuth: true,
    },
  },
  {
    path: '/',
    name: 'pi',
    component: PiChat,
    meta: {
      title: 'Chat',
      requiresAuth: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard for authentication and role-based access
router.beforeEach(async (to, from, next) => {
  const { useAuthStore } = await import('@/stores/auth')
  const auth = useAuthStore()

  // Restore session if token exists but user is null
  if (auth.token && !auth.user && !auth.loading) {
    await auth.restoreSession()
  }

  // Guest-only routes (login/register) — redirect to admin if already logged in
  if (to.meta.guest) {
    if (auth.isLoggedIn) {
      next('/admin')
    } else {
      next()
    }
    return
  }

  // Auth-required routes — redirect to login if not authenticated
  if (to.meta.requiresAuth) {
    if (!auth.isLoggedIn) {
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      // Check role-based access
      const { requiredRole } = to.meta
      if (requiredRole) {
        const roleHierarchy = { admin: 3, operator: 2, viewer: 1 }
        if ((roleHierarchy[auth.user.role] || 0) < (roleHierarchy[requiredRole] || 0)) {
          next('/admin') // Redirect to admin (or a 403 page)
          return
        }
      }
      next()
    }
  } else {
    next()
  }
})

export default router
