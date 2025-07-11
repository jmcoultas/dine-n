import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import checker from 'vite-plugin-checker';
import RuntimeErrorModalPlugin from '@replit/vite-plugin-runtime-error-modal';
import ShadcnThemeJSONPlugin from '@replit/vite-plugin-shadcn-theme-json';

export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: true }),
    RuntimeErrorModalPlugin(),
    ShadcnThemeJSONPlugin(),
  ],
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
  build: {
    outDir: path.resolve(__dirname, '../dist/public'),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
  },
});