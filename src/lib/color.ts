/**
 * Utilidades de color portadas del CV de una página que inspiró el proyecto.
 * El auto-contraste de cabecera y el `tint` de los tonos «soft» son exactamente
 * los que ya funcionaban allí; no cambiar los umbrales sin re-validar los temas.
 */

const HEX6 = /^#[0-9a-f]{6}$/i;

export function isHex(value: string): boolean {
  return HEX6.test(value.trim());
}

/** Normaliza `#abc` → `#aabbcc`; devuelve `null` si no es un hex válido. */
export function normalizeHex(value: string): string | null {
  const v = value.trim();
  if (HEX6.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    const [r, g, b] = [v[1]!, v[2]!, v[3]!];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function toRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex) ?? '#000000';
  const n = parseInt(normalized.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Mezcla un hex con blanco. `ratio` 0..1 = cantidad de blanco añadido. */
export function tint(hex: string, ratio: number): string {
  const { r, g, b } = toRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  const out = (1 << 24) + (mix(r) << 16) + (mix(g) << 8) + mix(b);
  return `#${out.toString(16).slice(1)}`;
}

/** Mezcla un hex con negro. `ratio` 0..1 = cantidad de negro añadido. */
export function shade(hex: string, ratio: number): string {
  const { r, g, b } = toRgb(hex);
  const mix = (c: number) => Math.round(c * (1 - ratio));
  const out = (1 << 24) + (mix(r) << 16) + (mix(g) << 8) + mix(b);
  return `#${out.toString(16).slice(1)}`;
}

/** Brillo percibido 0..255 (fórmula YIQ, la misma del proyecto de referencia). */
export function perceivedBrightness(hex: string): number {
  const { r, g, b } = toRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * ¿El color es «claro»? Umbral 150 heredado del CV de referencia: por encima,
 * el texto blanco de la cabecera deja de leerse y hay que pasar a tinta oscura.
 */
export function isLight(hex: string): boolean {
  return perceivedBrightness(hex) > 150;
}
