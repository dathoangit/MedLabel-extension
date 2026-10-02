import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    minify: false,
    rollupOptions: {
      // Not referenced by the manifest; opened with chrome.windows.create.
      input: {
        print: 'src/print/index.html'
      }
    }
  }
});
