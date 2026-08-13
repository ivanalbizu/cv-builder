import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Auditoría de accesibilidad con axe, sobre la app en marcha.
 *
 * Es el hermano del checklist de contraste: en vez de opinar sobre si la app
 * es accesible, se mide. axe encontró 13 `<select>` sin nombre accesible —los
 * de icono, categoría y símbolo usaban un `<span>` de etiqueta, que no cuenta—
 * y este test existe para que no vuelvan.
 *
 * Lo que axe NO puede comprobar (orden de tabulación útil, textos que tengan
 * sentido, avisos que lleguen a tiempo) va en los tests de abajo, a mano.
 */

const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

async function abrirTodo(page: Page) {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
  // Auditar también el contenido plegado: los bloques arrancan cerrados.
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => {
      d.open = true;
    });
  });
  await page.waitForTimeout(200);
}

test('sin violaciones de WCAG 2.1 A/AA', async ({ page }) => {
  await abrirTodo(page);
  const { violations } = await new AxeBuilder({ page }).withTags([...REGLAS]).analyze();

  expect(
    violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
    'axe encontró problemas',
  ).toEqual([]);
});

test('sin violaciones de buenas prácticas (landmarks, regiones)', async ({ page }) => {
  await abrirTodo(page);
  const { violations } = await new AxeBuilder({ page }).withTags(['best-practice']).analyze();

  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test('el primer tabulador ofrece saltar al CV', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();
  await page.keyboard.press('Tab');

  // Sin el atajo, llegar al botón de imprimir son decenas de tabulaciones.
  const foco = page.locator(':focus');
  await expect(foco).toHaveText('Saltar al CV');
  await expect(foco).toBeVisible();
});

test('los bloques del panel se abren con el teclado', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();

  const bloque = page.locator('.control-panel details').first();
  await expect(bloque).not.toHaveAttribute('open', '');

  await bloque.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(bloque).toHaveAttribute('open', '');
});

test('el aviso de páginas se anuncia solo al cambiar', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();

  const aviso = page.locator('output[aria-live="polite"]');
  await expect(aviso).toContainText('1 página');

  // El recuento cambia solo mientras se escribe; quien no ve la pantalla
  // necesita que se anuncie, porque es el aviso más importante de la app.
  await page.evaluate(() => {
    window.cvBuilder!.setBasics({ summary: 'Texto de relleno. '.repeat(900) });
  });
  await expect(aviso).toContainText('se sale');
});

test('todos los controles del panel tienen nombre accesible', async ({ page }) => {
  await abrirTodo(page);

  const sinNombre = await page.evaluate(() => {
    const controles = document.querySelectorAll<HTMLElement>(
      '.control-panel select, .control-panel input, .control-panel button',
    );
    return [...controles]
      .filter((el) => {
        // Los `input type=file` van ocultos tras un botón: no están en el
        // árbol de accesibilidad, así que exigirles nombre no tiene sentido.
        if (el.hidden || el.offsetParent === null) return false;
        if (el.getAttribute('aria-label')?.trim()) return false;
        const id = el.getAttribute('id');
        if (id && document.querySelector(`label[for="${id}"]`)) return false;
        if (el.closest('label')) return false;
        return !el.textContent?.trim();
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
  });

  expect(sinNombre).toEqual([]);
});
