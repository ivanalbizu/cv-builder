import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/**
 * Numeración de página, comprobada sobre el PDF real.
 *
 * La regla es: se numera solo si el CV pasa de una hoja. En un CV de una
 * página, «Página 1 de 1» queda peor que no poner nada, y CSS no sabe
 * condicionar por el total — lo decide la app y lo publica en `<html
 * data-pages>`.
 */

const PDF_OPTIONS = {
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
};

async function abrir(page: Page, params: Record<string, string> = {}) {
  await page.goto(`/?${new URLSearchParams(params)}`);
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

/** Fuerza el desbordamiento a dos páginas por la capa de comandos. */
async function desbordar(page: Page) {
  await page.evaluate(() => {
    window.cvBuilder!.setBasics({ summary: 'Texto de relleno. '.repeat(900) });
  });
  await expect(page.getByText(/páginas · el contenido se sale/)).toBeVisible();
}

/**
 * Texto real del PDF, vía `pdftotext` (poppler).
 *
 * No vale buscar la cadena en los bytes: Chrome incrusta fuentes en subconjunto
 * y guarda el texto como índices de glifo, así que «Página» no aparece literal
 * en ningún flujo. `pdftotext` lo reconstruye con el CMap ToUnicode.
 *
 * Devuelve `null` si poppler no está instalado, y quien llama se salta el test:
 * es una herramienta del sistema y no queremos un CI rojo por eso.
 */
function pdfTexto(pdf: Buffer): string | null {
  const file = join(tmpdir(), `cv-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    writeFileSync(file, pdf);
    return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
  } catch {
    return null;
  } finally {
    rmSync(file, { force: true });
  }
}

test('un CV de una página NO se numera', async ({ page }) => {
  await abrir(page);
  const pdf = await page.pdf(PDF_OPTIONS);
  const doc = await PDFDocument.load(pdf);

  expect(doc.getPageCount()).toBe(1);
  await expect(page.locator('html')).toHaveAttribute('data-pages', '1');
});

test('la hoja de una página conserva el sangrado completo', async ({ page }) => {
  await abrir(page);
  // Sin pie no hay margen de página: la hoja ocupa el A4 entero, que es lo que
  // hace que la cabecera llegue al borde.
  const margen = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--cv-margen-pagina').trim(),
  );
  expect(margen).toBe('0');
});

test('al pasar a dos páginas aparece la numeración', async ({ page }) => {
  await abrir(page);
  await desbordar(page);

  await expect(page.locator('html')).not.toHaveAttribute('data-pages', '1');
  const pie = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--cv-pie').trim(),
  );
  expect(pie).toContain('Página');

  const pdf = await page.pdf(PDF_OPTIONS);
  expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);

  // Lo que de verdad importa: que el pie acaba impreso en el papel.
  const texto = pdfTexto(Buffer.from(pdf));
  test.skip(texto === null, 'sin pdftotext (poppler) instalado');

  const total = (await PDFDocument.load(pdf)).getPageCount();
  // El total del pie tiene que ser el recuento REAL, no un número cualquiera:
  // así se comprueba de paso que `counter(pages)` cuadra con el PDF.
  for (let n = 1; n <= total; n += 1) {
    expect(texto, `falta el pie de la página ${n}`).toContain(`Página ${n} de ${total}`);
  }
});

/**
 * Compara el MISMO contenido con y sin numeración.
 *
 * Contar páginas contra un número fijo sería frágil: depende de cuánto relleno
 * metas y de lo ancha que sea la columna de cada plantilla. Lo que de verdad
 * hay que garantizar es que reservar el margen del pie no empuje una hoja de
 * más, y eso es una comparación, no un número.
 */
async function paginasConYSinPie(page: Page) {
  const con = (await PDFDocument.load(await page.pdf(PDF_OPTIONS))).getPageCount();

  await page.evaluate(() => {
    document.documentElement.dataset.pages = '1';
  });
  const sin = (await PDFDocument.load(await page.pdf(PDF_OPTIONS))).getPageCount();

  return { con, sin };
}

test('reservar sitio para el pie no añade páginas', async ({ page }) => {
  await abrir(page);
  await desbordar(page);

  const { con, sin } = await paginasConYSinPie(page);
  expect(con).toBeGreaterThan(1);
  expect(con, 'el margen del pie empujó una hoja de más').toBe(sin);
});

test('la barra lateral tampoco gana páginas al numerarse', async ({ page }) => {
  await abrir(page, { template: 'sidebar' });
  await desbordar(page);

  const { con, sin } = await paginasConYSinPie(page);
  expect(con, 'el min-height de la barra desbordó la caja útil').toBe(sin);
});
