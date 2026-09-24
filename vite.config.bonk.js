import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds BONK! by itself into one file (bonk-build/bonk.html) that opens
// straight into the game, no arcade.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'bonk-build',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { input: 'bonk.html' },
  },
})
