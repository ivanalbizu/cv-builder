import { expect, test, type Page } from '@playwright/test';

/**
 * Versiones del CV.
 *
 * El caso que las motiva: adaptar el currículum a una oferta sin destruir el
 * general. Lo que se mide aquí es el aislamiento y que sobrevivan a recargar —
 * de nada sirve una versión que se pierde al cerrar la pestaña.
 */

const nombre = (page: Page) => page.locator('.cv-page h1');

async function abrirVersiones(page: Page) {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => {
    const bloque = [...document.querySelectorAll('.control-panel details')].find((d) =>
      d.textContent?.trim().startsWith('Versiones'),
    );
    if (bloque) (bloque as HTMLDetailsElement).open = true;
  });
}

test('duplicar y editar deja intacta la original', async ({ page }) => {
  await abrirVersiones(page);
  await page.evaluate(() => window.cvBuilder!.setBasics({ name: 'CV general' }));

  await page.getByRole('button', { name: 'Duplicar esta' }).click();
  await page.evaluate(() => window.cvBuilder!.setBasics({ name: 'CV adaptado' }));
  await expect(nombre(page)).toHaveText('CV adaptado');

  const original = await page.evaluate(
    () => window.cvBuilder!.variantes().find((v) => !v.activa)!.id,
  );
  await page.evaluate((id) => window.cvBuilder!.activarVariante(id), original);
  await expect(nombre(page), 'la original no debe haberse tocado').toHaveText('CV general');
});

test('las versiones sobreviven a recargar', async ({ page }) => {
  await abrirVersiones(page);
  await page.evaluate(() => window.cvBuilder!.setBasics({ name: 'CV general' }));
  await page.getByRole('button', { name: 'Duplicar esta' }).click();
  await page.evaluate(() => window.cvBuilder!.setBasics({ name: 'CV adaptado' }));

  await page.reload();
  await page.locator('.cv-page').waitFor();

  expect(await page.evaluate(() => window.cvBuilder!.variantes().length)).toBe(2);
  await expect(nombre(page), 'sigue en la versión que se editaba').toHaveText('CV adaptado');
});

test('cada versión guarda su propio aspecto', async ({ page }) => {
  await abrirVersiones(page);
  await page.evaluate(() => window.cvBuilder!.setTheme('lujo'));
  const primera = await page.evaluate(() => window.cvBuilder!.variantes().find((v) => v.activa)!.id);

  await page.getByRole('button', { name: 'Duplicar esta' }).click();
  await page.evaluate(() => window.cvBuilder!.setTheme('botanico'));

  await page.evaluate((id) => window.cvBuilder!.activarVariante(id), primera);
  const primary = await page
    .locator('.cv-page')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--primary').trim());
  expect(primary, 'debería volver al tema Lujo').toBe('#262626');
});

test('no se puede quedar sin ninguna versión', async ({ page }) => {
  await abrirVersiones(page);
  await expect(page.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
});

test('un agente duplica antes de adaptar el CV a una oferta', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();

  const resultado = await page.evaluate(() => {
    const cv = window.cvBuilder!;
    cv.callTool('duplicarVariante', { nombre: 'Recepción — Hotel Aurora' });
    cv.callTool('setBasics', { title: 'Jefe de recepción' });
    return cv.callTool('listarVariantes');
  });

  expect(resultado.ok).toBe(true);
  const lista = (resultado as { result: { nombre: string; activa: boolean }[] }).result;
  expect(lista).toHaveLength(2);
  expect(lista.find((v) => v.activa)!.nombre).toBe('Recepción — Hotel Aurora');
});
