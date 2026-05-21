import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// base must match the GitHub repo name for GitHub Pages project-page hosting:
// https://<user>.github.io/Graph-of-Thought-GOT/
export default defineConfig({
  base: '/Graph-of-Thought-GOT/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // ONNX/WASM transformer model is loaded at runtime; do not pre-bundle.
    exclude: ['@xenova/transformers'],
  },
  worker: {
    format: 'es',
  },
});
