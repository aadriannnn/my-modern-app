import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from backend directory
  const backendEnv = loadEnv(mode, path.resolve(__dirname, '../backend'), '')

  return {
    plugins: [react()],
    define: {
      // Expose backend env vars to frontend code
      '__AUTH_USER__': JSON.stringify(backendEnv.USER_SETARI || 'admin'),
      '__AUTH_PASS__': JSON.stringify(backendEnv.PASS_SETARI || 'admin'),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          timeout: 1200000,
          proxyTimeout: 1200000,
        },
      },
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['@headlessui/react', '@radix-ui/react-slot', 'lucide-react', 'framer-motion'],
            'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
            'vendor-charts': ['recharts'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
