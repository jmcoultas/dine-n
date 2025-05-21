import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import checker from 'vite-plugin-checker';
import RuntimeErrorModalPlugin from '@replit/vite-plugin-runtime-error-modal';
import ShadcnThemeJSONPlugin from '@replit/vite-plugin-shadcn-theme-json';

// Log environment info for debugging
console.log('Environment:', {
  REPL_SLUG: process.env.REPL_SLUG,
  REPL_OWNER: process.env.REPL_OWNER,
  NODE_ENV: process.env.NODE_ENV
});

export default defineConfig({
  plugins: [
    react(),
    // Only use checker in development
    process.env.NODE_ENV !== 'production' && checker({ typescript: true }),
    // Only use error modal in development
    process.env.NODE_ENV !== 'production' && RuntimeErrorModalPlugin(),
    ShadcnThemeJSONPlugin(),
  ].filter(Boolean),
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.dev`
          : 'http://0.0.0.0:3001',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@db': path.resolve(__dirname, '../db'),
    },
  },
  // Build configuration
  build: {
    // Disable source maps in production
    sourcemap: process.env.NODE_ENV !== 'production',
    // Improve minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    },
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'wouter'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            // Add other UI libraries here
          ]
        }
      }
    }
  }
});