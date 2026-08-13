import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Checklist de impresión (CLAUDE.md §12) como test.
 *
 * Se comprueba sobre el TEXTO del CSS a propósito: jsdom no implementa
 * `break-inside` ni `print-color-adjust`, así que un `getComputedStyle` daría
 * verde sin comprobar nada. Estas reglas nos costaron tiempo en el proyecto de
 * referencia y no deben desaparecer en un refactor.
 */

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const printCss = read('./print.css');
const canvasCss = read('./canvas/canvas.css');

/**
 * Toda plantilla nueva entra aquí: el checklist de impresión se aplica a
 * TODAS, no solo a la primera que escribimos. Los selectores son los que cada
 * plantilla usa para sus items repetibles.
 */
const TEMPLATES = [
  {
    name: 'SingleColumn',
    css: read('./templates/SingleColumn.module.css'),
    items: ['.jobItem', '.eduItem', '.language'],
  },
  {
    name: 'Sidebar',
    css: read('./templates/Sidebar.module.css'),
    items: ['.jobItem', '.eduItem', '.language'],
  },
  {
    name: 'Minimal',
    css: read('./templates/Minimal.module.css'),
    items: ['.jobItem', '.eduItem'],
  },
];

/** Extrae el cuerpo del bloque `@media print { ... }`. */
function printBlock(css: string): string {
  const start = css.indexOf('@media print');
  if (start === -1) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return css.slice(start);
}

describe('print.css', () => {
  it('define la página A4', () => {
    expect(printCss).toMatch(/@page\s*\{[\s\S]*?size:\s*A4/);
  });

  it('por defecto la hoja no lleva márgenes: es lo que da el sangrado completo', () => {
    // El margen dejó de ser literal al añadir la numeración; ahora sale de una
    // variable cuyo valor por defecto sigue siendo 0.
    expect(printCss).toMatch(/@page\s*\{[\s\S]*?margin:\s*var\(--cv-margen-pagina\)/);
    expect(printCss).toMatch(/:root\s*\{[^}]*--cv-margen-pagina:\s*0\s*;/);
  });

  it('solo numera cuando el recuento de páginas se ha medido y pasa de una', () => {
    // `[data-pages]` tiene que estar presente en el selector: un
    // `:not([data-pages='1'])` a secas casaría también con el atributo ausente
    // y sacaría el pie en el primer render, antes de contar nada.
    expect(printCss).toMatch(/:root\[data-pages\]:not\(\[data-pages='1'\]\)/);
    expect(printCss).toMatch(/--cv-pie:\s*'Página '\s*counter\(page\)/);
  });

  it('conserva fondos y colores en el PDF', () => {
    expect(printBlock(printCss)).toMatch(/print-color-adjust:\s*exact/);
    expect(printBlock(printCss)).toMatch(/-webkit-print-color-adjust:\s*exact/);
  });

  it('oculta todo el cromo de la app', () => {
    const block = printBlock(printCss);
    for (const selector of ['.app-chrome', '.control-panel', '.toolbar']) {
      expect(block).toContain(selector);
    }
    expect(block).toMatch(/display:\s*none\s*!important/);
  });

  it('anula el min-height de la hoja para no dejar una página en blanco final', () => {
    expect(printBlock(printCss)).toMatch(/min-height:\s*0\s*!important/);
  });

  it('anula el zoom de pantalla', () => {
    expect(printBlock(printCss)).toMatch(/transform:\s*none\s*!important/);
  });

  it('esconde las guías de corte de página', () => {
    expect(printBlock(printCss)).toContain('.cv-page-guide');
  });
});

describe('canvas.css', () => {
  it('la hoja mide exactamente A4', () => {
    expect(canvasCss).toMatch(/\.cv-page\s*\{[^}]*width:\s*210mm/);
    expect(canvasCss).toMatch(/\.cv-page\s*\{[^}]*min-height:\s*297mm/);
  });
});

/**
 * Guardián del paso manual que documenta CLAUDE.md: registrar una plantilla y
 * olvidarse de añadirla arriba la dejaría fuera del checklist de impresión sin
 * que nada avisara — justo el fallo que este archivo existe para evitar.
 */
describe('cobertura del checklist', () => {
  it('toda plantilla registrada pasa por el checklist', async () => {
    const { TEMPLATES: REGISTRADAS } = await import('./templates');
    const cubiertas = TEMPLATES.map((t) => t.name.toLowerCase());

    for (const entrada of REGISTRADAS) {
      const esperada = entrada.id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      expect(
        cubiertas.some((c) => c === esperada.toLowerCase()),
        `«${entrada.id}» no está en el array TEMPLATES de este test`,
      ).toBe(true);
    }
  });
});

/**
 * Cuerpo de la primera regla cuyo selector use la clase `name`.
 * El lookahead evita que `.language` se coma la regla de `.languages`.
 */
function ruleBody(css: string, name: string): string {
  const re = new RegExp(`\\${name}(?![\\w-])[^{}]*\\{([^}]*)\\}`);
  return re.exec(css)?.[1] ?? '';
}

describe.each(TEMPLATES)('$name: reglas de paginación', ({ css, items }) => {
  it('aplica break-inside: avoid a los ITEMS', () => {
    for (const item of items) {
      expect(ruleBody(css, item), `falta en ${item}`).toMatch(/break-inside:\s*avoid/);
    }
  });

  it('NO lo aplica a la sección entera: empujaría la sección a la página siguiente', () => {
    expect(ruleBody(css, '.section')).not.toMatch(/break-inside:\s*avoid/);
  });

  it('evita que un título de sección quede huérfano al final de la página', () => {
    expect(ruleBody(css, '.sectionTitle')).toMatch(/break-after:\s*avoid/);
  });

  it('no hardcodea colores: todo sale de los tokens del tema', () => {
    // Se permiten el blanco/negro puros de los rellenos y las sombras rgba.
    const colors = css.match(/#[0-9a-f]{3,6}\b/gi) ?? [];
    const notTokens = colors.filter((c) => !/^#(fff|ffffff|000|000000|22303a)$/i.test(c));
    expect(notTokens).toEqual([]);
  });
});
