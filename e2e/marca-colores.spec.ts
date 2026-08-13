import { expect, test, type Page } from '@playwright/test';

/**
 * Ayudante de colores de marca.
 *
 * La app no llama a ninguna IA ni descarga ninguna web: prepara la pregunta y
 * el usuario decide a quién se la hace. Lo que hay que comprobar, entonces, no
 * es ninguna integración sino que el bucle se cierra —pregunta → respuesta
 * pegada → colores aplicados— y que una respuesta disparatada no rompe nada.
 */

async function abrirTema(page: Page) {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
  await page.evaluate(() => {
    const bloque = [...document.querySelectorAll('.control-panel details')].find((d) =>
      d.textContent?.trim().startsWith('Tema'),
    );
    if (bloque) (bloque as HTMLDetailsElement).open = true;
  });
}

const vars = (page: Page) =>
  page.locator('.cv-page').evaluate((el) => ({
    primary: getComputedStyle(el).getPropertyValue('--primary').trim(),
    accent: getComputedStyle(el).getPropertyValue('--accent').trim(),
  }));

test('la pregunta incluye la URL que se escribe', async ({ page }) => {
  await abrirTema(page);
  await page.getByLabel('Web de la empresa').fill('https://www.melia.com/es');

  const pregunta = page.getByLabel('Pregunta para el asistente');
  await expect(pregunta).toContainText('https://www.melia.com/es');
  // Sin esto, un modelo sin navegación devuelve colores plausibles e inventados.
  await expect(pregunta).toContainText('en vez de adivinar');
});

test('pegar la respuesta aplica los colores a la hoja', async ({ page }) => {
  await abrirTema(page);
  await page.getByLabel('Web de la empresa').fill('https://ejemplo.com');
  await page
    .getByLabel('Respuesta del asistente')
    .fill('Sus colores son:\n- principal: #7a1f2b\n- acento: #c9a227');
  await page.getByRole('button', { name: 'Aplicar los colores' }).click();

  await expect.poll(() => vars(page)).toEqual({ primary: '#7a1f2b', accent: '#c9a227' });
});

test('aunque el asistente elija mal, el CV no queda ilegible', async ({ page }) => {
  await abrirTema(page);
  await page.getByLabel('Web de la empresa').fill('https://ejemplo.com');
  // Amarillo casi blanco: sin los tokens derivados, los títulos desaparecerían.
  await page.getByLabel('Respuesta del asistente').fill('principal: #ffe600\nacento: #fff100');
  await page.getByRole('button', { name: 'Aplicar los colores' }).click();

  await expect(page.locator('.cv-page')).toHaveAttribute('data-header', 'light');
  const ratio = await page.locator('.cv-page').evaluate((el) => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const ch = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
    };
    const texto = getComputedStyle(el).getPropertyValue('--primary-text').trim();
    const [a, b] = [lum(texto), lum('#ffffff')].sort((x, y) => y - x);
    return (a! + 0.05) / (b! + 0.05);
  });
  expect(ratio, 'los títulos deben seguir cumpliendo AA').toBeGreaterThanOrEqual(4.5);
});

test('una respuesta sin colores avisa en vez de romper', async ({ page }) => {
  await abrirTema(page);
  const antes = await vars(page);

  await page.getByLabel('Web de la empresa').fill('https://ejemplo.com');
  await page.getByLabel('Respuesta del asistente').fill('Lo siento, no puedo navegar por internet.');
  await page.getByRole('button', { name: 'Aplicar los colores' }).click();

  await expect(page.getByText(/No encontré ningún color/)).toBeVisible();
  expect(await vars(page)).toEqual(antes);
});

test('el aspecto vive en dos bloques, no en cuatro', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();

  const titulos = await page.evaluate(() =>
    [...document.querySelectorAll('.control-panel summary')].map(
      (s) => s.textContent?.trim().split('\n')[0] ?? '',
    ),
  );

  // `Theme` es { colors, fonts, density }: los tres iban en bloques separados.
  expect(titulos).toContain('Plantilla');
  expect(titulos).toContain('Tema');
  expect(titulos).not.toContain('Tipografía');
  expect(titulos).not.toContain('Densidad');
});
