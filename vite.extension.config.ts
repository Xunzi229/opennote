import { defineConfig } from 'vite'
import { existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    {
      name: 'remove-legacy-content-js',
      closeBundle() {
        const legacyContentScript = resolve(__dirname, 'dist/content.js');
        if (existsSync(legacyContentScript)) {
          unlinkSync(legacyContentScript);
        }
      },
    },
  ],
})
