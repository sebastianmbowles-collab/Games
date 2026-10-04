import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds just Aliens VS Dinos into one self-contained HTML file.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'standalone-avd',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { input: 'avd.html' },
  },
})
