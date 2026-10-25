import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds ANTE UP: HOUSE RULES into one self-contained HTML file.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'standalone-au',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: 'au.html' },
  },
})
