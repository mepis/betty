import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const rootPkg = JSON.parse(readFileSync(join(process.cwd(), '../..', 'package.json'), 'utf-8'))
const API_URL = process.env.VITE_API_URL || 'http://localhost:3456'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': join(process.cwd(), 'src')
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
    __API_URL__: JSON.stringify(API_URL),
    __APP_VERSION__: JSON.stringify(rootPkg.version)
  }
})
