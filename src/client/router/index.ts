import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes: RouteRecordRaw[] = [
  // Auth routes (no sidebar/header)
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { layout: 'auth' } },
  { path: '/register', name: 'Register', component: () => import('../views/RegisterView.vue'), meta: { layout: 'auth' } },

  // App routes (sidebar + header)
  { path: '/', name: 'Sessions', component: () => import('../views/SessionsView.vue') },
  { path: '/chat/:id', name: 'Chat', component: () => import('../views/ChatView.vue'), props: true },

  // Redirects
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard — require auth for app routes
router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.layout !== 'auth' && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }
});

export default router;
