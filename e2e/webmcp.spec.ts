import { expect, test, type Page } from '@playwright/test';

/**
 * El adaptador WebMCP contra la API REAL de Chrome.
 *
 * `src/agent/webmcp.test.ts` prueba el mapeo con un doble; esto comprueba lo
 * que un doble no puede: que Chrome acepta nuestros esquemas y que las
 * herramientas se ejecutan de verdad a través de su `executeTool`.
 *
 * Requiere el origin trial, que en Chrome 151 se abre con
 * `--enable-features=WebMCP`. Sin el flag la suite se salta sola en vez de
 * fallar: la spec sigue en incubación (Draft Community Group Report, solo
 * Chrome, trial 149–156) y no queremos un CI rojo por eso.
 */

test.use({
  launchOptions: { args: ['--enable-features=WebMCP'] },
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.cv-page').waitFor();

  const disponible = await page.evaluate(
    () => typeof (document as { modelContext?: unknown }).modelContext !== 'undefined',
  );
  test.skip(!disponible, 'Este Chrome no expone WebMCP (origin trial 149–156)');
});

test('Chrome acepta el catálogo entero', async ({ page }) => {
  const nombres = await page.evaluate(async () => {
    const mc = (document as unknown as { modelContext: { getTools(): Promise<{ name: string }[]> } })
      .modelContext;
    return (await mc.getTools()).map((t) => t.name);
  });

  // Si Chrome rechazara un esquema, la herramienta no aparecería aquí.
  expect(nombres).toContain('getCV');
  expect(nombres).toContain('addExperience');
  expect(nombres).toContain('setBrandColors');
  expect(nombres.length).toBeGreaterThan(10);
});

/**
 * Dos detalles de la firma real de `executeTool`, medidos contra Chrome 151 y
 * que no están en la documentación que encontramos:
 *
 *  1. El primer argumento es el objeto `RegisteredTool` que devuelve
 *     `getTools()`, NO su nombre («The provided value is not of type
 *     'RegisteredTool'»).
 *  2. El segundo son los argumentos serializados como **cadena JSON**. Con un
 *     objeto plano da «Failed to parse input arguments».
 *
 * Del otro lado, nuestro `execute` sí recibe el objeto ya parseado, así que el
 * adaptador no tiene que deshacer nada.
 */
async function ejecutar(page: Page, nombre: string, args: unknown) {
  return page.evaluate(
    async ([n, a]) => {
      const mc = (
        document as unknown as {
          modelContext: {
            getTools(): Promise<{ name: string }[]>;
            executeTool(tool: unknown, argsJson: string): Promise<unknown>;
          };
        }
      ).modelContext;
      const tool = (await mc.getTools()).find((t) => t.name === n);
      if (!tool) throw new Error(`no registrada: ${n as string}`);
      return JSON.stringify(await mc.executeTool(tool, JSON.stringify(a)));
    },
    [nombre, args] as const,
  );
}

test('una herramienta ejecutada por Chrome modifica el CV', async ({ page }) => {
  await ejecutar(page, 'setBasics', { title: 'Jefe de recepción' });
  await expect(page.locator('.cv-page')).toContainText('Jefe de recepción');
});

test('un argumento inválido vuelve como texto y no rompe la página', async ({ page }) => {
  const salida = await ejecutar(page, 'setTheme', { themeId: 'neon' });

  expect(salida).toMatch(/debe ser uno de/);
  await expect(page.locator('.cv-page')).toBeVisible();
});
