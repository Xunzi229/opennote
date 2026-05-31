import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor-tiptap';
          if (id.includes('@codemirror') || id.includes('@lezer')) return 'editor-codemirror';
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'react';
          if (id.includes('lucide-react') || id.includes('sonner') || id.includes('zustand')) return 'ui-vendor';
          return 'vendor';
        },
      },
    },
  },
})
