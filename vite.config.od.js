import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds OVERDUE into one self-contained HTML file.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'standalone-od',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: 'od.html' },
  },
})
