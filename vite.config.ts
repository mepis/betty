import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  root: 'src/client',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3579',
        changeOrigin: true,
      },
      '/sse': {
        target: 'http://localhost:3579',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, 'web/'),
    emptyOutDir: true,
  },
});
