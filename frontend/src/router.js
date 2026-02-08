import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import ChatView from './views/ChatView.vue'
import CompletionsView from './views/CompletionsView.vue'
import ModelsView from './views/ModelsView.vue'
import DocumentsView from './views/DocumentsView.vue'
import AdminView from './views/AdminView.vue'
import LoginView from './views/LoginView.vue'
import SetupView from './views/SetupView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/setup',
    name: 'setup',
    component: SetupView,
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'chat',
    component: ChatView,
    meta: { requiresAuth: true },
  },
  {
    path: '/completions',
    name: 'completions',
    component: CompletionsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/documents',
    name: 'documents',
    component: DocumentsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/models',
    name: 'models',
    component: ModelsView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()

  // Always verify current user status if we think we're authenticated
  // This prevents redirect loops with stale/expired sessions
  if (!auth.user) {
    await auth.fetchCurrentUser()
  }

  // Guest routes (login/setup) - redirect if already authenticated
  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return next('/')
  }

  // Check if first setup is needed
  if (!auth.isAuthenticated && to.path !== '/setup' && to.path !== '/login') {
    try {
      const needsSetup = await auth.checkFirstSetup()
      if (needsSetup) {
        return next('/setup')
      }
    } catch (err) {
      console.error('Failed to check setup status:', err)
    }
  }

  // Protected routes - require authentication
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next(`/login?redirect=${to.fullPath}`)
  }

  // Admin-only routes - require admin role
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next('/')
  }

  next()
})

export default router
