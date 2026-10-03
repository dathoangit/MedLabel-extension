import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import pkg from './package.json';
import { versionJsonContents } from './scripts/version';

/** Writes version.json into the build output for shared-folder auto-reload. */
function versionJsonPlugin(version: string): Plugin {
  const contents = versionJsonContents(version);

  async function writeToOutDir(outDir: string): Promise<void> {
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, 'version.json'), contents);
  }

  return {
    name: 'medlabel-version-json',
    async configureServer() {
      await writeToOutDir(resolve('dist'));
    },
    async writeBundle(options) {
      await writeToOutDir(resolve(options.dir ?? 'dist'));
    }
  };
}

export default defineConfig({
  plugins: [crx({ manifest }), versionJsonPlugin(pkg.version)],
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
