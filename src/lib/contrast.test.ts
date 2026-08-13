import { describe, expect, it } from 'vitest';
import { bestInk, contrastRatio, isLargeText, relativeLuminance, wcagLevel } from './contrast';

/**
 * Los valores de referencia salen de la propia WCAG 2.1, no de ejecutar el
 * código y copiar lo que saliera: si la fórmula estuviera mal, un test hecho
 * así la bendeciría.
 */

describe('luminancia relativa', () => {
  it('ancla los extremos de la escala', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
  });

  it('corrige la gamma: el gris medio no está a media luz', () => {
    // #808080 es el 50% en valor de canal, pero solo el ~21,6% de luminancia.
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 3);
  });

  it('pondera el verde muy por encima del azul', () => {
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 4);
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 4);
  });
});

describe('ratio de contraste', () => {
  it('negro sobre blanco es el máximo posible: 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('un color consigo mismo es 1:1', () => {
    expect(contrastRatio('#123a51', '#123a51')).toBeCloseTo(1, 5);
  });

  it('es simétrico: da igual cuál sea el fondo', () => {
    expect(contrastRatio('#123a51', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#123a51'),
      10,
    );
  });
});

describe('umbrales WCAG', () => {
  it('4.5 es el mínimo de AA para texto normal', () => {
    expect(wcagLevel(4.49)).toBe('insuficiente');
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(6.99)).toBe('AA');
    expect(wcagLevel(7)).toBe('AAA');
  });

  it('el texto grande aprueba con menos contraste', () => {
    expect(wcagLevel(3.2, 'normal')).toBe('insuficiente');
    expect(wcagLevel(3.2, 'large')).toBe('AA');
  });

  it('«grande» es 18pt, o 14pt si va en negrita', () => {
    expect(isLargeText(16)).toBe(false);
    expect(isLargeText(18)).toBe(true);
    expect(isLargeText(14, true)).toBe(true);
    expect(isLargeText(13.9, true)).toBe(false);
  });
});

describe('bestInk', () => {
  it('sobre fondo oscuro elige tinta blanca', () => {
    const { variant, ink } = bestInk('#123a51');
    expect(variant).toBe('dark');
    expect(ink).toBe('#ffffff');
  });

  it('sobre fondo claro elige tinta oscura', () => {
    const { variant } = bestInk('#ffd400');
    expect(variant).toBe('light');
  });

  it('elige siempre la opción de MÁS contraste, sin puntos ciegos', () => {
    // Se recorre toda la escala de grises: en cada punto, la tinta escogida
    // tiene que ser la mejor de las dos. Un umbral de brillo fijo falla cerca
    // de su propia raya; comparar ratios no puede fallar por construcción.
    for (let v = 0; v <= 255; v += 5) {
      const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
      const { ink, ratio } = bestInk(hex);
      const otra = ink === '#ffffff' ? '#22303a' : '#ffffff';
      expect(ratio, `falla en ${hex}`).toBeGreaterThanOrEqual(contrastRatio(hex, otra) - 1e-9);
    }
  });

  it('devuelve el ratio de la combinación elegida', () => {
    const { ratio } = bestInk('#000000');
    expect(ratio).toBeCloseTo(21, 5);
  });
});
