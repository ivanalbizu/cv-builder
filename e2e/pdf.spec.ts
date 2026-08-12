import { inflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/**
 * Checklist de impresión de CLAUDE.md §12, ejecutado sobre el PDF de verdad.
 *
 * Hasta ahora estas comprobaciones se hacían a mano con `google-chrome
 * --headless --print-to-pdf` y `pdfinfo`. Aquí quedan automatizadas: cada
 * plantilla y cada tema tienen que seguir cabiendo en una página, con sus
 * fondos y con el texto seleccionable.
 */

const TEMPLATES = ['single-column', 'sidebar'] as const;
const THEMES = ['clasico', 'boutique', 'corporativo', 'lujo'] as const;

/** Los mismos ajustes que el diálogo de Chrome con «márgenes: Ninguno». */
const PDF_OPTIONS = {
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
};

/**
 * A4 son 595,28 × 841,89 pt exactos, pero Chrome emite 595,92 × 841,92: redondea
 * al pasar por píxeles a 96 dpi. Se comprueba con ±2 pt (0,7 mm) — suficiente
 * para cazar un tamaño equivocado (Letter son 612 pt de ancho) sin romperse por
 * el redondeo del motor.
 */
function expectA4({ width, height }: { width: number; height: number }) {
  expect(width, `ancho ${width}pt no es A4`).toBeGreaterThan(593);
  expect(width, `ancho ${width}pt no es A4`).toBeLessThan(598);
  expect(height, `alto ${height}pt no es A4`).toBeGreaterThan(840);
  expect(height, `alto ${height}pt no es A4`).toBeLessThan(844);
}

async function openCV(page: Page, params: Record<string, string>) {
  await page.goto(`/?${new URLSearchParams(params)}`);
  await page.locator('.cv-page').waitFor();
  // Las fuentes cambian el alto del texto: medir antes de que carguen daría
  // un recuento de páginas optimista.
  await page.evaluate(() => document.fonts.ready);
}

test.describe('PDF: una página por plantilla y tema', () => {
  for (const template of TEMPLATES) {
    for (const theme of THEMES) {
      test(`${template} · ${theme} cabe en 1 página A4`, async ({ page }) => {
        await openCV(page, { template, theme });
        const pdf = await page.pdf(PDF_OPTIONS);
        const doc = await PDFDocument.load(pdf);

        // Cabe en el nº de páginas esperado + sin página en blanco final:
        // ambas cosas son lo mismo medidas desde el PDF.
        expect(doc.getPageCount()).toBe(1);
        expectA4(doc.getPage(0).getSize());
      });
    }
  }
});

test.describe('PDF: fidelidad', () => {
  test('el texto va como texto, no rasterizado', async ({ page }) => {
    await openCV(page, { template: 'single-column' });
    const pdf = await page.pdf(PDF_OPTIONS);
    // Un PDF con tipografías incrustadas declara recursos /Font. Si la hoja
    // se hubiera rasterizado a imagen, no habría ninguno.
    expect(Buffer.from(pdf).includes(Buffer.from('/Font'))).toBe(true);
  });

  test('el cromo de la app no aparece en el PDF', async ({ page }) => {
    await openCV(page, { template: 'single-column' });
    await page.emulateMedia({ media: 'print' });

    for (const selector of ['.control-panel', '.toolbar']) {
      await expect(page.locator(selector).first()).toBeHidden();
    }
  });

  test('los colores del tema llegan pintados al PDF', async ({ page }) => {
    await openCV(page, { template: 'single-column', theme: 'clasico' });
    const colors = await pdfFillColors(await page.pdf(PDF_OPTIONS));

    // Se leen las órdenes de relleno del PDF, no un screenshot: un screenshot
    // pinta los fondos SIEMPRE, así que pasaría aunque el PDF saliera en
    // blanco. Verificado por mutación: quitando el token `--surface` del tema,
    // esta comprobación falla con «falta el fondo arena del perfil».
    expect(paints(colors, '#123a51'), 'falta el azul de cabecera').toBe(true);
    expect(paints(colors, '#faf7f1'), 'falta el fondo arena del perfil').toBe(true);
  });

});

test.describe('vista previa', () => {
  test('avisa cuando el contenido se sale de una página', async ({ page }) => {
    await openCV(page, { template: 'single-column' });
    await expect(page.getByText(/^1 página/)).toBeVisible();

    // Se infla el perfil hasta forzar el desbordamiento, usando la capa de
    // comandos: la misma puerta que usará el agente (CLAUDE.md §5.3).
    await page.evaluate(() => {
      window.cvBuilder!.setBasics({ summary: 'Texto de relleno. '.repeat(900) });
    });

    await expect(page.getByText(/páginas · el contenido se sale/)).toBeVisible();
  });

  test('el zoom no altera la hoja impresa', async ({ page }) => {
    await openCV(page, { template: 'single-column' });
    await page.evaluate(() => window.cvBuilder!.setZoom(0.5));

    const pdf = await page.pdf(PDF_OPTIONS);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    expectA4(doc.getPage(0).getSize());
  });
});

/**
 * Colores de relleno que el PDF ordena pintar, leídos de su flujo de
 * contenido: `r g b rg` en el modelo de PDF (0..1, no 0..255).
 *
 * Es la única forma honesta de comprobar lo que acaba en el papel. Un
 * `page.screenshot()` pinta los fondos siempre, así que no distingue un PDF
 * correcto de uno que los ha perdido.
 */
async function pdfFillColors(pdf: Buffer): Promise<RGB[]> {
  const doc = await PDFDocument.load(pdf);
  const contents = doc.getPage(0).node.Contents();
  if (!contents) return [];
  // El flujo puede venir suelto o como array de referencias.
  const streams = 'asArray' in contents ? contents.asArray() : [contents];

  let ops = '';
  for (const ref of streams) {
    const stream = doc.context.lookup(ref) as { getContents?: () => Uint8Array };
    const raw = stream?.getContents?.();
    if (!raw) continue;
    // Chrome comprime los flujos con Flate; algunos quedan en claro.
    try {
      ops += inflateSync(Buffer.from(raw)).toString('latin1');
    } catch {
      ops += Buffer.from(raw).toString('latin1');
    }
  }

  return [...ops.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map(
    (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as RGB,
  );
}

type RGB = [number, number, number];

/**
 * ¿El PDF pinta este color?
 *
 * Se compara con tolerancia y no por cadena: Chrome escribe cuatro decimales
 * (`.2275`) y la conversión desde hex da `.227451`, así que redondear a tres
 * los separaba (0.228 vs 0.227). Media milésima por canal es bastante más fino
 * que 1/255, así que sigue distinguiendo colores contiguos de la paleta.
 */
function paints(colors: RGB[], hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const target: RGB = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  return colors.some((c) => c.every((v, i) => Math.abs(v - target[i]!) < 0.0005));
}
