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
const templateCss = read('./templates/SingleColumn.module.css');
const canvasCss = read('./canvas/canvas.css');

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
  it('define la página A4 sin márgenes', () => {
    expect(printCss).toMatch(/@page\s*\{[^}]*size:\s*A4/);
    expect(printCss).toMatch(/@page\s*\{[^}]*margin:\s*0/);
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

describe('SingleColumn: reglas de paginación', () => {
  /**
   * Cuerpo de la primera regla cuyo selector use la clase `name`.
   * El lookahead evita que `.language` se coma la regla de `.languages`.
   */
  function ruleBody(css: string, name: string): string {
    const re = new RegExp(`\\${name}(?![\\w-])[^{}]*\\{([^}]*)\\}`);
    return re.exec(css)?.[1] ?? '';
  }

  it('aplica break-inside: avoid a los ITEMS', () => {
    for (const item of ['.jobItem', '.eduItem', '.language']) {
      expect(ruleBody(templateCss, item)).toMatch(/break-inside:\s*avoid/);
    }
  });

  it('NO lo aplica a la sección entera: empujaría la sección a la página siguiente', () => {
    expect(ruleBody(templateCss, '.section')).not.toMatch(/break-inside:\s*avoid/);
  });

  it('evita que un título de sección quede huérfano al final de la página', () => {
    expect(ruleBody(templateCss, '.sectionTitle')).toMatch(/break-after:\s*avoid/);
  });

  it('no hardcodea colores: todo sale de los tokens del tema', () => {
    // Se permiten el blanco/negro puros de los rellenos y las sombras rgba.
    const colors = templateCss.match(/#[0-9a-f]{3,6}\b/gi) ?? [];
    const notTokens = colors.filter((c) => !/^#(fff|ffffff|000|000000|22303a)$/i.test(c));
    expect(notTokens).toEqual([]);
  });
});
