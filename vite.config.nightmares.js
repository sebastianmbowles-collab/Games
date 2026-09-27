import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds Nightmares by itself into one file (nightmares-build/nightmares.html)
// that opens straight into the game, no arcade.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'nightmares-build',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { input: 'nightmares.html' },
  },
})
