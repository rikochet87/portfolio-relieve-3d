import { defineConfig } from 'vite';

// base relativa: el build funciona en GitHub Pages (subcarpeta), Vercel o cualquier hosting estático.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
});
