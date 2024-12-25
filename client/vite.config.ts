import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import checker from 'vite-plugin-checker';
import RuntimeErrorModalPlugin from '@replit/vite-plugin-runtime-error-modal';
import ShadcnThemeJSONPlugin from '@replit/vite-plugin-shadcn-theme-json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: true }),
    RuntimeErrorModalPlugin(),
    ShadcnThemeJSONPlugin({
      themeFilePath: './theme.json'
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@db': path.resolve(__dirname, '../db'),
    },
  },
});