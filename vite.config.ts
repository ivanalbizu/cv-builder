import { readFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/**
 * `import foto from './x.png?inline'` → dataURL base64 de verdad.
 *
 * Vite, por su cuenta, emite un fichero aparte y devuelve su URL. Aquí eso no
 * vale: en el modelo, `photo` es un `DataURL` (CLAUDE.md §2), y una URL del
 * bundle rompería el JSON exportado y la copia guardada en localStorage en
 * cuanto cambiara el hash del asset.
 */
function inlineAssets(): Plugin {
  return {
    name: 'cv-inline-assets',
    enforce: 'pre',
    async load(id) {
      const [file, query] = id.split('?');
      const ext = file?.split('.').pop()?.toLowerCase() ?? '';
      if (query !== 'inline' || !file || !MIME[ext]) return null;
      const data = await readFile(file);
      return `export default "data:${MIME[ext]};base64,${data.toString('base64')}"`;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [inlineAssets(), react()],
  css: {
    modules: {
      // Nombres legibles en dev: facilita depurar el CSS de impresión.
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
