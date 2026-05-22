/// <reference types="vitest/config" />
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
    // transformers.js source is served raw (it misbehaves when pre-bundled),
    // but its onnxruntime-web dependency MUST be pre-bundled: esbuild wraps the
    // UMD bundle with a proper CJS environment so it exports cleanly. Served
    // raw it falls into the global branch and crashes on `registerBackend`.
    exclude: ['@xenova/transformers'],
    include: ['onnxruntime-web'],
  },
  worker: {
    format: 'es',
  },
  // Unit tests target pure functions and data boundaries (Phase 12); no DOM
  // is needed, so the node environment keeps the runner fast.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
