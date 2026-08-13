import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/**
 * Tipografías libres (CLAUDE.md §7).
 *
 * Dos riesgos, y los dos son silenciosos:
 *
 *  1. **Que la fuente no cargue.** El stack acaba en una genérica, así que el
 *     CV se compone igual y «se ve bien»: nadie se entera de que la elección
 *     no está surtiendo efecto. Por eso se comprueba la familia computada, no
 *     que la página tenga buena pinta.
 *  2. **Que mueva la paginación.** §2 avisa de ello. La fuente de cuerpo es el
 *     eje peligroso: afecta a cada línea del CV.
 */

const CUERPO = ['sistema-sans', 'inter', 'source-sans-3', 'manrope'] as const;
const TITULOS = ['sistema-serif', 'lora', 'playfair-display', 'eb-garamond'] as const;

const PDF_OPTIONS = {
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
};

async function abrir(page: Page, params: Record<string, string>) {
  await page.goto(`/?${new URLSearchParams(params)}`);
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

test.describe('la fuente elegida se aplica de verdad', () => {
  for (const cuerpo of CUERPO) {
    test(`cuerpo: ${cuerpo}`, async ({ page }) => {
      await abrir(page, { cuerpo });

      const familia = await page
        .locator('.cv-page')
        .evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0]!.replace(/["']/g, '').trim());

      const esperada = { 'sistema-sans': 'Segoe UI', inter: 'Inter', 'source-sans-3': 'Source Sans 3', manrope: 'Manrope' }[cuerpo];
      expect(familia).toBe(esperada);
    });
  }

  test('las descargables acaban realmente cargadas, no en el stack de reserva', async ({ page }) => {
    await abrir(page, { cuerpo: 'inter', titulos: 'playfair-display' });

    const cargadas = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
    );
    expect(cargadas).toContain('Inter');
    expect(cargadas).toContain('Playfair Display');
  });

  test('solo se descarga el subconjunto que el CV necesita', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('response', (r) => {
      if (r.url().endsWith('.woff2')) pedidos.push(r.url().split('/').pop()!);
    });

    await abrir(page, { cuerpo: 'inter', titulos: 'lora' });

    // La semilla no lleva caracteres de Europa del Este, así que `latin-ext`
    // no debe pedirse: es lo que hace que `unicode-range` valga la pena.
    expect(pedidos.some((p) => p.includes('latin-ext'))).toBe(false);
    expect(pedidos.length).toBeGreaterThan(0);
  });
});

test.describe('paginación con cada tipografía', () => {
  for (const cuerpo of CUERPO) {
    test(`el CV de ejemplo cabe en 1 página con ${cuerpo}`, async ({ page }) => {
      await abrir(page, { cuerpo, titulos: 'playfair-display' });
      const pdf = await page.pdf(PDF_OPTIONS);
      expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
    });
  }

  test('las fuentes de títulos no descuadran la hoja', async ({ page }) => {
    // Son líneas sueltas que no refluyen, así que deberían ser inocuas; se
    // comprueba porque §2 lo da por supuesto y conviene no fiarse.
    for (const titulos of TITULOS) {
      await abrir(page, { titulos });
      const pdf = await page.pdf(PDF_OPTIONS);
      expect((await PDFDocument.load(pdf)).getPageCount(), titulos).toBe(1);
    }
  });
});
