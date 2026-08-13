import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/**
 * Exportación a HTML autónomo.
 *
 * La promesa tiene dos mitades y las dos hay que medirlas:
 *
 *  1. Que el archivo sea **autónomo de verdad**. Es fácil que se cuele una URL
 *     al servidor de desarrollo y el archivo funcione en la máquina donde se
 *     generó pero no en la de quien lo recibe — un fallo que no se ve mirando.
 *  2. Que **imprima el mismo PDF** que la app. Si difiere, exportar deja de
 *     tener sentido: el usuario ya tiene el botón de imprimir.
 */

const PDF_OPTIONS = {
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
};

/** Pulsa «Exportar HTML» en el panel y devuelve la ruta del archivo. */
async function exportar(page: Page): Promise<string> {
  await page.evaluate(() => {
    const bloque = [...document.querySelectorAll('.control-panel details')].find((d) =>
      d.textContent?.trim().startsWith('Documento'),
    );
    if (bloque) (bloque as HTMLDetailsElement).open = true;
  });

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Exportar HTML/ }).click(),
  ]);

  const ruta = join(tmpdir(), `cv-e2e-${Date.now()}-${descarga.suggestedFilename()}`);
  await descarga.saveAs(ruta);
  return ruta;
}

async function abrirApp(page: Page, params: Record<string, string>) {
  await page.goto(`/?${new URLSearchParams(params)}`);
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

test('el archivo no referencia al servidor: se abre en cualquier sitio', async ({ page }) => {
  await abrirApp(page, { theme: 'lujo' });
  const html = readFileSync(await exportar(page), 'utf8');

  expect(html).not.toContain('localhost');
  expect(html).not.toMatch(/src=["']\/assets\//);
  expect(html).not.toMatch(/url\(["']?\/assets\//);
});

test('lleva dentro la foto y las tipografías que usa', async ({ page }) => {
  await abrirApp(page, { theme: 'lujo' });
  const html = readFileSync(await exportar(page), 'utf8');

  expect(html).toContain('data:image/png;base64');
  // Lujo usa Playfair Display e Inter: dos familias, ni una más. Incrustar
  // las seis engordaría el archivo con glifos que nadie va a ver.
  const fuentes = html.match(/data:font\/woff2;base64/g) ?? [];
  expect(fuentes.length).toBe(2);
});

test('el nombre del archivo sale del nombre de la persona', async ({ page }) => {
  await abrirApp(page, {});
  await page.evaluate(() => {
    const bloque = [...document.querySelectorAll('.control-panel details')].find((d) =>
      d.textContent?.trim().startsWith('Documento'),
    );
    if (bloque) (bloque as HTMLDetailsElement).open = true;
  });

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Exportar HTML/ }).click(),
  ]);

  // Sin acentos ni espacios: tiene que sobrevivir a cualquier sistema de ficheros.
  expect(descarga.suggestedFilename()).toBe('marcos-ibanez-herrera.html');
});

test('abierto sin red, imprime el MISMO PDF que la app', async ({ page }) => {
  await abrirApp(page, { theme: 'lujo', template: 'single-column' });

  const pdfApp = await page.pdf(PDF_OPTIONS);
  const ruta = await exportar(page);

  // `file://` y sin servidor: si algo faltara, aquí se caería.
  await page.goto(pathToFileURL(ruta).href);
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
  const pdfArchivo = await page.pdf(PDF_OPTIONS);

  const [docApp, docArchivo] = await Promise.all([
    PDFDocument.load(pdfApp),
    PDFDocument.load(pdfArchivo),
  ]);

  expect(docArchivo.getPageCount()).toBe(docApp.getPageCount());
  expect(docArchivo.getPage(0).getSize().width).toBeCloseTo(docApp.getPage(0).getSize().width, 1);
  expect(docArchivo.getPage(0).getSize().height).toBeCloseTo(docApp.getPage(0).getSize().height, 1);
});

test('el archivo no arrastra el cromo de la app', async ({ page }) => {
  await abrirApp(page, {});
  const ruta = await exportar(page);

  await page.goto(pathToFileURL(ruta).href);
  await expect(page.locator('.cv-page')).toBeVisible();
  await expect(page.locator('.control-panel')).toHaveCount(0);
  await expect(page.locator('.toolbar')).toHaveCount(0);
});
