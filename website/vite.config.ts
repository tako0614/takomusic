import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  build: {
    target: 'esnext',
    rollupOptions: {
      // Ensure proper tree-shaking
      treeshake: {
        moduleSideEffects: false,
      },
    },
  },
  // Skip TypeScript type checking for parent package files
  // The browser compiler is loaded dynamically
  esbuild: {
    target: 'esnext',
  },
})
