import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]--[hash:base64:5]',
    },
    postcss: './postcss.config.js',
  },
  build: {
    target: 'es2022', // Support for top-level await
    rollupOptions: {
      output: {
        format: 'es' // Use ES modules format
      }
    }
  },
  esbuild: {
    target: 'es2022' // Ensure esbuild also uses es2022
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022' // Ensure dependency pre-bundling uses es2022
    }
  }
});