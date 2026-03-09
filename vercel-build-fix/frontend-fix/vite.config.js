import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],

  // ✅ Tell Vite where index.html is
  root: '.',

  build: {
    // ✅ Output folder
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      // ✅ Explicitly set entry point
      input: resolve(__dirname, 'index.html'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://speedytrucks-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
