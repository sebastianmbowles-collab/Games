import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds Alien Assault into one self-contained HTML file.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'standalone-aa',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { input: 'aa.html' },
  },
})
