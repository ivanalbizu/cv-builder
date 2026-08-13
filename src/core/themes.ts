import type { Theme, ThemeOverrides } from './types';
import { tint } from '../lib/color';
import { bestInk, ensureContrast } from '../lib/contrast';

/**
 * Set curado de temas, portado del CV de referencia que inspiró el proyecto,
 * donde ya estaban validados a 1 página. Cambiar de tema **no** puede cambiar
 * el contenido ni la maqueta: solo redefine estas variables.
 */

/**
 * Tipografías de los temas: SIEMPRE las auto-hospedadas.
 *
 * Antes cada tema declaraba un stack del sistema (Georgia, Palatino Linotype,
 * Didot…). Medido en Linux, eso hacía que «Clásico» y «Boutique» salieran
 * tipográficamente IDÉNTICOS —ninguna de las dos fuentes existe y caían al
 * mismo respaldo— y que «Lujo» cambiara de aspecto solo, sin tocar el tema, en
 * cuanto se auto-hospedó Playfair Display, que su stack ya listaba.
 *
 * Un tema que se ve distinto en cada máquina no es un tema. Con las familias
 * incrustadas, el aspecto es el mismo en todas partes y en el PDF.
 */
const SANS_SISTEMA = '"Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif';
const SERIF_SISTEMA = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

const INTER = `Inter, ${SANS_SISTEMA}`;
const SOURCE = `"Source Sans 3", ${SANS_SISTEMA}`;
const MANROPE = `Manrope, ${SANS_SISTEMA}`;
const LORA = `Lora, ${SERIF_SISTEMA}`;
const PLAYFAIR = `"Playfair Display", ${SERIF_SISTEMA}`;
const GARAMOND = `"EB Garamond", ${SERIF_SISTEMA}`;

/** Tinta y grises compartidos: ya validados contra WCAG AA en los 11 pares. */
const TINTA = { ink: '#23303a', inkSoft: '#5c6b76' };

export const THEMES: Theme[] = [
  {
    id: 'clasico',
    name: 'Clásico',
    colors: {
      primary: '#123a51',
      primarySoft: '#1d5773',
      accent: '#b58a3e',
      accentSoft: '#e3d3b3',
      surface: '#faf7f1',
      ...TINTA,
      rule: '#e2ddd3',
    },
    fonts: { display: LORA, serif: LORA, sans: SOURCE },
    density: 'compact',
  },
  {
    id: 'boutique',
    name: 'Boutique',
    colors: {
      primary: '#6f3d33',
      primarySoft: '#8a4c3c',
      accent: '#bd7f2a',
      accentSoft: '#ecd9b3',
      surface: '#f9f4ee',
      ...TINTA,
      rule: '#e2ddd3',
    },
    fonts: { display: GARAMOND, serif: GARAMOND, sans: SOURCE },
    density: 'compact',
  },
  {
    id: 'corporativo',
    name: 'Corporativo',
    colors: {
      primary: '#22424e',
      primarySoft: '#325863',
      accent: '#2e7d8a',
      accentSoft: '#cfe4e8',
      surface: '#f1f6f7',
      ...TINTA,
      rule: '#dfe7e9',
    },
    // Todo sans, sin serif: es lo que le da el aire corporativo.
    fonts: { display: INTER, serif: INTER, sans: INTER },
    density: 'compact',
  },
  {
    id: 'lujo',
    name: 'Lujo',
    colors: {
      primary: '#262626',
      primarySoft: '#3d3d3d',
      accent: '#b8912f',
      accentSoft: '#e7d6a6',
      surface: '#f7f5ef',
      ...TINTA,
      rule: '#e4e0d6',
    },
    // Playfair es el alto contraste que el tema buscaba con Didot.
    fonts: { display: PLAYFAIR, serif: PLAYFAIR, sans: INTER },
    density: 'compact',
  },
  {
    id: 'botanico',
    name: 'Botánico',
    colors: {
      primary: '#1f4436',
      primarySoft: '#2d5c49',
      accent: '#7d7a2c',
      accentSoft: '#dfe0bc',
      surface: '#f3f6f0',
      ...TINTA,
      rule: '#dde4da',
    },
    fonts: { display: LORA, serif: LORA, sans: MANROPE },
    density: 'compact',
  },
  {
    id: 'tinta',
    name: 'Tinta',
    colors: {
      // Monocromo de verdad: pensado para fotocopia e impresión en blanco y
      // negro, donde cualquier color acaba siendo una mancha gris.
      primary: '#1c1c1c',
      primarySoft: '#333333',
      accent: '#5f5f5f',
      accentSoft: '#c9c9c9',
      surface: '#f4f4f4',
      ...TINTA,
      rule: '#dcdcdc',
    },
    fonts: { display: GARAMOND, serif: GARAMOND, sans: MANROPE },
    density: 'compact',
  },
  {
    id: 'indigo',
    name: 'Índigo',
    colors: {
      primary: '#2b2a63',
      primarySoft: '#3f3d86',
      accent: '#5a53b8',
      accentSoft: '#d5d2ee',
      surface: '#f3f3fa',
      ...TINTA,
      rule: '#dedded',
    },
    fonts: { display: MANROPE, serif: MANROPE, sans: INTER },
    density: 'compact',
  },
  {
    id: 'granate',
    name: 'Granate',
    colors: {
      primary: '#6b2733',
      primarySoft: '#873543',
      accent: '#b4553c',
      accentSoft: '#f0cfc2',
      surface: '#faf2f0',
      ...TINTA,
      rule: '#ebdcd8',
    },
    fonts: { display: PLAYFAIR, serif: LORA, sans: SOURCE },
    density: 'compact',
  },
];

export const DEFAULT_THEME_ID = 'clasico';

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/**
 * Aplica los ajustes del usuario sobre el tema base.
 *
 * Los tonos «soft» se derivan del color elegido con el mismo `tint` que usaba
 * el CV de referencia (0.12 para el degradado de cabecera, 0.55 para el acento),
 * así el usuario solo tiene que elegir dos colores y el resto encaja.
 */
export function resolveTheme(base: Theme, overrides: ThemeOverrides): Theme {
  const colors = { ...base.colors };

  if (overrides.primary) {
    colors.primary = overrides.primary;
    colors.primarySoft = tint(overrides.primary, 0.12);
  }
  if (overrides.accent) {
    colors.accent = overrides.accent;
    colors.accentSoft = tint(overrides.accent, 0.55);
  }

  return {
    ...base,
    colors,
    fonts: { ...base.fonts, ...overrides.fonts },
    density: overrides.density ?? base.density,
  };
}

/**
 * Variantes de color aptas para TEXTO.
 *
 * Los colores de un tema cumplen dos papeles muy distintos: pintar superficies
 * (cabecera, insignias, la barra lateral) y escribir texto encima de la hoja
 * blanca. Un mismo tono sirve de maravilla para lo primero y puede ser
 * ilegible para lo segundo — un amarillo de marca sobre blanco se queda en
 * 1.4:1, y el CV deja de leerse.
 *
 * Se derivan tonos aparte SOLO para el texto. Así los adornos conservan
 * exactamente el color elegido y la lectura queda garantizada.
 */
export function primaryTextColor(theme: Theme): string {
  // Se mide contra `surface` y no contra blanco: es el fondo claro más oscuro
  // que lleva texto, así que exigir ahí cubre también el blanco puro.
  return ensureContrast(theme.colors.primary, theme.colors.surface);
}

/**
 * Tinta de la cabecera: la que más contraste da sobre el color principal.
 */
export function headerInk(theme: Theme): string {
  return bestInk(theme.colors.primary).ink;
}

/**
 * Acento legible SOBRE la cabecera.
 *
 * El puesto y los iconos de contacto van en un tono de acento para dar
 * jerarquía. Con principal oscuro, `accentSoft` ya contrasta de sobra; con uno
 * claro se perdía —llegó a desaparecer el puesto entero— así que se ajusta
 * partiendo del mismo color y solo cuando hace falta.
 */
export function headerAccent(theme: Theme): string {
  return ensureContrast(theme.colors.accentSoft, theme.colors.primary);
}

/**
 * Variante del acento apta para TEXTO.
 *
 * El acento es un tono medio: perfecto como filete o como punto del timeline,
 * insuficiente como texto de 9pt sobre blanco (los dorados de los temas se
 * quedaban en 3:1, por debajo del 4.5:1 que pide WCAG AA). Se deriva oscura
 * conservando el tono, así los adornos no cambian y el texto se lee.
 */
export function accentTextColor(theme: Theme): string {
  return ensureContrast(theme.colors.accent, '#ffffff');
}

/**
 * Tema → custom properties para el elemento raíz de la hoja.
 * Es el único punto donde JS toca el estilo de la zona imprimible: pasa
 * valores, nunca reglas de maquetación (CLAUDE.md §11).
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  return {
    '--primary': theme.colors.primary,
    '--primary-soft': theme.colors.primarySoft,
    '--accent': theme.colors.accent,
    '--accent-text': accentTextColor(theme),
    '--primary-text': primaryTextColor(theme),
    '--header-ink': headerInk(theme),
    '--header-accent': headerAccent(theme),
    '--accent-soft': theme.colors.accentSoft,
    '--surface': theme.colors.surface,
    '--ink': theme.colors.ink,
    '--ink-soft': theme.colors.inkSoft,
    '--rule': theme.colors.rule,
    '--display': theme.fonts.display,
    '--serif': theme.fonts.serif,
    '--sans': theme.fonts.sans,
  };
}

/**
 * Auto-contraste de cabecera: con un principal claro, el texto blanco deja de
 * leerse y la plantilla cambia a tinta oscura vía `[data-header]`.
 *
 * Antes se decidía con un umbral de brillo fijo (YIQ > 150) heredado del CV de
 * referencia. Ahora se comparan los dos ratios WCAG y gana el que más contraste
 * da: un umbral tiene un punto ciego justo en su propia raya, donde un color
 * puede llevarse la tinta peor de las dos.
 */
export function headerContrast(theme: Theme): 'light' | 'dark' {
  return bestInk(theme.colors.primary).variant;
}
