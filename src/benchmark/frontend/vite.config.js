import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const API_URL = process.env.VITE_API_URL || 'http://localhost:3456'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: process.env.VITE_HOST || '0.0.0.0',
    port: parseInt(process.env.VITE_PORT, 10) || 5173,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      }
    }
  },
  define: {
    __API_URL__: JSON.stringify(API_URL)
  }
})
