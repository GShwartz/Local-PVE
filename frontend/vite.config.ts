import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase', // Optional: Converts kebab-case to camelCase for class names
      generateScopedName: '[name]__[local]--[hash:base64:5]', // Consistent naming for CSS modules
    },
    postcss: './postcss.config.js', // Ensure PostCSS config is used
  },
});