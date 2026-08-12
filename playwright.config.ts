import { defineConfig } from '@playwright/test';

/**
 * Configuración de e2e / PDF (CLAUDE.md fase 3).
 *
 * Se usa el **Chrome del sistema** (`channel: 'chrome'`), no el Chromium que
 * Playwright descarga. No es por ahorrar los 170 MB: el camino de exportación
 * de esta app ES el motor de impresión de Chrome, así que el test tiene que
 * medir ese motor y no un primo suyo. Para usar el Chromium empaquetado
 * (p. ej. donde no haya Chrome instalado):
 *
 *   pnpm exec playwright install chromium
 *   PW_CHANNEL=chromium pnpm e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    channel: process.env.PW_CHANNEL ?? 'chrome',
  },

  /**
   * Se prueba sobre el BUILD (`vite preview`), no sobre el dev server: es lo
   * que acaba en manos del usuario, con el CSS ya minificado y las clases de
   * CSS Modules con su hash definitivo — justo donde se rompería el `@media
   * print` si algún selector global se colara en un módulo.
   */
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    url: 'http://localhost:4173',
    /**
     * Nunca se reutiliza un servidor ya en marcha. Con `reuseExistingServer`
     * un `vite preview` olvidado sirve el build ANTERIOR y la suite entera
     * pasa a verde contra código viejo: me pasó al validar estos tests y el
     * fallo era invisible. El build tarda menos de un segundo.
     */
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
