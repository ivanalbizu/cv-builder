import { expect, test, type Page } from '@playwright/test';

/**
 * Deshacer/rehacer desde la interfaz.
 *
 * Los tests unitarios ya cubren la granularidad del historial; aquí se mide lo
 * que ellos no pueden: que teclear DE VERDAD en un campo —con sus eventos de
 * React y su ritmo— produzca un solo paso, y que los atajos y los botones
 * lleguen al mismo sitio.
 */

/**
 * El puesto en la hoja. Se compara con el texto REAL del DOM: el mayúsculas de
 * la plantilla es `text-transform`, puro CSS, y `toHaveText` mira `textContent`.
 */
const puesto = (page: Page) => page.locator('.cv-page p').first();

async function abrirDatos(page: Page) {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => {
    const bloque = [...document.querySelectorAll('.control-panel details')].find((d) =>
      d.textContent?.trim().startsWith('Datos'),
    );
    if (bloque) (bloque as HTMLDetailsElement).open = true;
  });
}

test('teclear una palabra entera se deshace de una vez', async ({ page }) => {
  await abrirDatos(page);
  const campo = page.getByLabel('Puesto', { exact: true }).first();

  await campo.fill('');
  await campo.pressSequentially('Jefe de recepción', { delay: 25 });
  await expect(puesto(page)).toHaveText('Jefe de recepción');

  // 17 pulsaciones, un solo paso: si no se fusionaran, deshacer sería inútil.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(puesto(page)).toHaveText('Recepcionista de Hotel');
});

test('los atajos de teclado hacen lo mismo que los botones', async ({ page }) => {
  await abrirDatos(page);
  const campo = page.getByLabel('Puesto', { exact: true }).first();
  await campo.fill('Auditor');
  await expect(puesto(page)).toHaveText('Auditor');

  await page.keyboard.press('Control+z');
  await expect(puesto(page)).toHaveText('Recepcionista de Hotel');

  await page.keyboard.press('Control+Shift+z');
  await expect(puesto(page)).toHaveText('Auditor');
});

test('los botones se desactivan cuando no hay a dónde ir', async ({ page }) => {
  await abrirDatos(page);
  const deshacer = page.getByRole('button', { name: 'Deshacer' });
  const rehacer = page.getByRole('button', { name: 'Rehacer' });

  await expect(deshacer).toBeDisabled();
  await expect(rehacer).toBeDisabled();

  await page.getByLabel('Puesto', { exact: true }).first().fill('Auditor');
  await expect(deshacer).toBeEnabled();

  await deshacer.click();
  await expect(deshacer).toBeDisabled();
  await expect(rehacer).toBeEnabled();
});

test('un agente puede deshacer lo que acaba de escribir', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();

  // Es el motivo de existir de esta función: que editar por agente deje de ser
  // una apuesta sin vuelta atrás.
  const resultado = await page.evaluate(() => {
    window.cvBuilder!.callTool('setBasics', { title: 'Jefe de recepción' });
    return window.cvBuilder!.callTool('undo');
  });

  expect(resultado.ok).toBe(true);
  await expect(puesto(page)).toHaveText('Recepcionista de Hotel');
});

test('deshacer devuelve el CV a una página si un cambio lo desbordó', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
  await expect(page.getByText(/^1 página/)).toBeVisible();

  await page.evaluate(() => {
    window.cvBuilder!.setBasics({ summary: 'Texto de relleno. '.repeat(900) });
  });
  await expect(page.getByText(/páginas · el contenido se sale/)).toBeVisible();

  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText(/^1 página/)).toBeVisible();
});
