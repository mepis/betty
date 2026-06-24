import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// Setup axios 401 interceptor before creating the app
import axios from 'axios'
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session and redirect to login
      import('./stores/auth.js').then(({ useAuthStore }) => {
        const auth = useAuthStore()
        if (auth.isLoggedIn) {
          auth.logout()
          const currentPath = window.location.pathname
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
        }
      })
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Restore auth session on app startup
import('./stores/auth.js').then(({ useAuthStore }) => {
  const auth = useAuthStore()
  if (auth.token && !auth.user) {
    auth.restoreSession()
  }
})

app.mount('#app')
