import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/**
 * La app, pilotada de punta a punta por el catálogo de herramientas.
 *
 * Es la prueba de que el diseño de CLAUDE.md §5.3 se sostiene: un agente que
 * solo conozca `tools()` y `callTool()` puede leer el CV, editarlo, cambiarle
 * el aspecto y ver el resultado en la hoja — sin tocar el store, sin conocer el
 * modelo de datos y sin pasar por la interfaz.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
});

test('el catálogo se anuncia con esquemas utilizables', async ({ page }) => {
  const tools = await page.evaluate(() => window.cvBuilder!.tools());

  expect(tools.length).toBeGreaterThan(10);
  const getCV = tools.find((t) => t.name === 'getCV')!;
  expect(getCV.inputSchema).toMatchObject({ type: 'object', additionalProperties: false });

  const addExperience = tools.find((t) => t.name === 'addExperience')!;
  expect(addExperience.inputSchema.required).toContain('org');
  expect(addExperience.description).toMatch(/titulares/i);
});

test('un agente puede leer el CV, añadir un puesto y verlo en la hoja', async ({ page }) => {
  const sectionId = await page.evaluate(() => {
    const cv = window.cvBuilder!.callTool('getCV');
    if (!cv.ok) throw new Error(cv.error);
    const sections = (cv.result as { sections: { id: string; type: string }[] }).sections;
    return sections.find((s) => s.type === 'experience')!.id;
  });

  const res = await page.evaluate(
    (id) =>
      window.cvBuilder!.callTool('addExperience', {
        sectionId: id,
        org: 'Parador de Ronda',
        role: 'Jefe de recepción',
        start: 'Ene 2027',
        current: true,
        bullets: ['Dirección del equipo de recepción'],
      }),
    sectionId,
  );

  expect(res.ok).toBe(true);
  // Lo que importa: el cambio llega a la hoja imprimible, no solo al store.
  await expect(page.locator('.cv-page')).toContainText('Parador de Ronda');
  await expect(page.locator('.cv-page')).toContainText('Ene 2027 — Actualidad');
});

test('un agente puede aplicar los colores de una marca', async ({ page }) => {
  const res = await page.evaluate(() =>
    window.cvBuilder!.callTool('setBrandColors', { primary: '#004b8d', accent: '#c8102e' }),
  );
  expect(res.ok).toBe(true);

  const primary = await page
    .locator('.cv-page')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--primary').trim());
  expect(primary).toBe('#004b8d');
});

test('el auto-contraste protege al agente de elegir un color ilegible', async ({ page }) => {
  // Amarillo de marca: sobre él, el texto blanco de cabecera no se leería.
  await page.evaluate(() => window.cvBuilder!.callTool('setBrandColors', { primary: '#ffd400' }));

  await expect(page.locator('.cv-page')).toHaveAttribute('data-header', 'light');
});

test('un argumento inválido devuelve un error legible y no rompe la página', async ({ page }) => {
  const res = await page.evaluate(() =>
    window.cvBuilder!.callTool('setTheme', { themeId: 'neon' }),
  );

  expect(res.ok).toBe(false);
  expect(res.ok === false && res.error).toMatch(/debe ser uno de/);
  await expect(page.locator('.cv-page')).toBeVisible();
});

test('el CV editado por el agente sigue saliendo en 1 página A4', async ({ page }) => {
  await page.evaluate(() => {
    const cv = window.cvBuilder!.callTool('getCV');
    const sections = (cv as { result: { sections: { id: string; type: string }[] } }).result
      .sections;
    const experience = sections.find((s) => s.type === 'experience')!.id;

    window.cvBuilder!.callTool('setTemplate', { templateId: 'sidebar' });
    window.cvBuilder!.callTool('setTheme', { themeId: 'lujo' });
    window.cvBuilder!.callTool('setBullets', {
      sectionId: experience,
      itemId: (cv as { result: { sections: { id: string; items: { id: string }[] }[] } }).result
        .sections[0]!.items[0]!.id,
      bullets: ['Gestión integral de recepción y equipo', 'Cierre diario y auditoría'],
    });
  });

  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
});
