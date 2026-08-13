import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONTS, fontIdFromStack, fontsByRole, getFont } from './fonts';

/**
 * Integridad del catálogo tipográfico.
 *
 * El riesgo real aquí es silencioso: alguien añade una familia a `FONTS` y se
 * olvida de ejecutar `scripts/descargar-fuentes.mjs`. La app no falla — cae al
 * stack de reserva y el CV se ve «casi igual», así que nadie se entera.
 */

// Vitest arranca en la raíz del proyecto.
const fuentesCss = readFileSync(resolve('src/assets/fuentes.css'), 'utf8');

describe('catálogo', () => {
  it('no repite ids', () => {
    const ids = FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo stack acaba en una familia genérica', () => {
    // Si la fuente no cargara, el CV debe componerse igual en vez de caer a
    // la de por defecto del navegador.
    for (const f of FONTS) {
      expect(f.stack, f.id).toMatch(/(sans-serif|serif)$/);
    }
  });

  it('cada papel ofrece primero la opción del sistema, que no descarga nada', () => {
    for (const role of ['sans', 'serif'] as const) {
      const primera = fontsByRole(role)[0]!;
      expect(primera.descarga, `${role} debería empezar por la del sistema`).toBe(false);
    }
  });

  it('toda fuente descargable tiene su @font-face generado', () => {
    for (const f of FONTS.filter((x) => x.descarga)) {
      // El nombre de familia del stack tiene que existir en el CSS generado.
      const familia = f.stack.split(',')[0]!.replace(/["']/g, '').trim();
      expect(fuentesCss, `falta @font-face de ${familia}: ¿ejecutaste el script?`).toContain(
        `font-family: '${familia}'`,
      );
    }
  });

  it('el CSS generado solo trae subconjuntos latinos', () => {
    // Griego y cirílico multiplicarían el peso sin usarse en un CV europeo.
    const rangos = fuentesCss.match(/unicode-range: ([^;]+);/g) ?? [];
    expect(rangos.length).toBeGreaterThan(0);
    expect(fuentesCss).not.toMatch(/U\+0400-045F/); // cirílico
    expect(fuentesCss).not.toMatch(/U\+0370-0377/); // griego
  });

  it('las fuentes se piden variables: un archivo cubre 400 y 700', () => {
    expect(fuentesCss).toMatch(/font-weight: 400 700;/);
  });
});

describe('resolución', () => {
  it('un id desconocido cae en la opción del sistema, no en undefined', () => {
    expect(getFont('inventada', 'sans').id).toBe('sistema-sans');
    expect(getFont('inventada', 'serif').id).toBe('sistema-serif');
  });

  it('no cruza papeles: una serif no se ofrece como cuerpo', () => {
    expect(getFont('lora', 'sans').id).toBe('sistema-sans');
  });

  it('fontIdFromStack reconoce el stack guardado en el tema', () => {
    const inter = getFont('inter', 'sans');
    expect(fontIdFromStack(inter.stack, 'sans')).toBe('inter');
  });

  it('un stack de un tema antiguo no rompe el selector', () => {
    expect(fontIdFromStack('Comic Sans MS, cursive', 'sans')).toBe('sistema-sans');
  });
});
