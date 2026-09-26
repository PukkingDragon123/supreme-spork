import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode single` produces one self-contained HTML file (used for
// the shareable web preview). The default build is a normal PWA bundle.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [preact(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  define: {
    __SINGLE_FILE__: JSON.stringify(mode === 'single'),
  },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    target: 'es2020',
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
}))
