import { toRgb } from './color';

/**
 * Contraste según WCAG 2.1.
 *
 * Ojo con no confundirlo con `perceivedBrightness` de `color.ts`: aquel usa la
 * fórmula YIQ, que es un apaño rápido heredado del CV de referencia y sirve
 * para decidir «claro u oscuro». Esto es otra cosa — mide si dos colores se
 * distinguen lo bastante para poder LEER uno sobre el otro, que es un criterio
 * con umbrales normativos y comprobable.
 *
 * Referencia: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

/**
 * Luminancia relativa de un color (0 = negro, 1 = blanco).
 *
 * La curva no es lineal a propósito: corrige la gamma sRGB, porque el ojo no
 * percibe el doble de luz como el doble de brillo.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio de contraste entre dos colores: de 1:1 (idénticos) a 21:1 (negro/blanco). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/**
 * Umbrales de WCAG. «Grande» es ≥18pt, o ≥14pt en negrita: el texto grande
 * necesita menos contraste porque sus trazos son más gruesos.
 */
export const WCAG = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
} as const;

export type TextSize = 'normal' | 'large';
export type WcagLevel = 'AAA' | 'AA' | 'insuficiente';

export function wcagLevel(ratio: number, size: TextSize = 'normal'): WcagLevel {
  if (ratio >= WCAG.AAA[size]) return 'AAA';
  if (ratio >= WCAG.AA[size]) return 'AA';
  return 'insuficiente';
}

/** ¿Es un tamaño «grande» a efectos de WCAG? `pt`, y si va en negrita. */
export function isLargeText(pt: number, bold = false): boolean {
  return bold ? pt >= 14 : pt >= 18;
}

/**
 * Elige entre tinta clara y oscura la que MÁS contraste da sobre el fondo.
 *
 * Sustituye a decidir por un umbral de brillo fijo: con un umbral, un color
 * justo al otro lado de la raya se lleva la tinta equivocada aunque la otra
 * contraste mucho mejor. Comparar los dos ratios no tiene ese punto ciego.
 */
export function bestInk(
  background: string,
  inks: { light: string; dark: string } = { light: '#ffffff', dark: '#22303a' },
  minRatio: number = WCAG.AA.normal,
): { ink: string; variant: 'light' | 'dark'; ratio: number } {
  // `variant` nombra el color de la HOJA, no el de la tinta: `light` significa
  // «fondo claro, por tanto tinta oscura». Es la convención que ya usaba
  // `[data-header]` en las plantillas.
  const candidatos = [
    { ink: inks.light, variant: 'dark' as const },
    { ink: inks.dark, variant: 'light' as const },
    // Extremos de reserva. Sobre un gris medio, ni el blanco ni la tinta
    // oscura del tema llegan a 4.5:1 —se quedan en ~4—, pero el negro puro sí.
    // Sin este escalón, un principal gris dejaba la cabecera por debajo de AA.
    { ink: '#ffffff', variant: 'dark' as const },
    { ink: '#000000', variant: 'light' as const },
  ].map((c) => ({ ...c, ratio: contrastRatio(background, c.ink) }));

  // El primero que cumpla, respetando el orden de preferencia; si ninguno
  // llega, el de más contraste, que es lo mejor disponible.
  return (
    candidatos.find((c) => c.ratio >= minRatio) ??
    candidatos.reduce((mejor, c) => (c.ratio > mejor.ratio ? c : mejor))
  );
}

/**
 * Oscurece (o aclara) un color hasta que contrasta lo suficiente con el fondo.
 *
 * Sirve para el caso del acento: un dorado de marca funciona como filete o como
 * punto de un timeline, pero como texto de 9pt sobre blanco se queda en 3:1 y
 * no se lee. En vez de retocar la paleta a mano —que cambiaría también los
 * adornos— se deriva una variante SOLO para texto, conservando el tono.
 *
 * Devuelve el color original si ya cumple, y el extremo (negro o blanco) si ni
 * siquiera así se llega, que es lo más legible que se puede ofrecer.
 */
export function ensureContrast(color: string, background: string, minRatio = WCAG.AA.normal): string {
  if (contrastRatio(color, background) >= minRatio) return color;

  const { r, g, b } = toRgb(color);
  const hacia = (objetivo: number, t: number) => {
    const mezcla = (c: number) => Math.round(c + (objetivo - c) * t);
    return `#${[mezcla(r), mezcla(g), mezcla(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')}`;
  };

  // Sobre fondo claro lo natural es oscurecer, y al revés; pero ese criterio
  // solo mira la luminancia del fondo y falla en los tonos medios: sobre un
  // gris, aclarar tope en ~4:1 mientras que oscurecer llega a 5.3:1. Se
  // prueban los dos sentidos y gana el que alcance el objetivo antes.
  const preferido = relativeLuminance(background) > 0.5 ? 0 : 255;
  const alternativo = preferido === 0 ? 255 : 0;

  // Pasos de 2%: el error de color es imperceptible frente a la legibilidad.
  for (const objetivo of [preferido, alternativo]) {
    for (let paso = 1; paso <= 50; paso += 1) {
      const candidato = hacia(objetivo, paso / 50);
      if (contrastRatio(candidato, background) >= minRatio) return candidato;
    }
  }

  // Ni en blanco ni en negro se llega: se devuelve el extremo más legible.
  return contrastRatio('#000000', background) > contrastRatio('#ffffff', background)
    ? '#000000'
    : '#ffffff';
}

export interface ContrastCheck {
  /** Qué par se está midiendo, en lenguaje de usuario. */
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  size: TextSize;
  level: WcagLevel;
}

export function check(
  label: string,
  foreground: string,
  background: string,
  size: TextSize = 'normal',
): ContrastCheck {
  const ratio = contrastRatio(foreground, background);
  return { label, foreground, background, ratio, size, level: wcagLevel(ratio, size) };
}
