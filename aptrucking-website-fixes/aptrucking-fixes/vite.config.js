import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // ✅ Minify JS and CSS
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // remove console.log in production
        drop_debugger: true,
      },
    },
    cssMinify: true,

    // ✅ Code splitting - reduces initial bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['axios', 'socket.io-client'],
        },
        // ✅ Cache-friendly file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // ✅ Warn if any chunk exceeds 500kb
    chunkSizeWarningLimit: 500,

    // ✅ Generate source maps for debugging (set false for smaller build)
    sourcemap: false,
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

  // ✅ Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
  },
})
