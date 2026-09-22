import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds the whole arcade into one self-contained HTML file (no separate
// JS/CSS assets), so it can be opened directly via file:// with no server.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'standalone-build',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
