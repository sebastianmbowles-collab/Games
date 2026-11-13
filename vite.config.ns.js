import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds THE NIGHT SHIFT into one self-contained HTML file (run: npm run build:ns).
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'standalone-ns',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: 'ns.html' },
  },
})
