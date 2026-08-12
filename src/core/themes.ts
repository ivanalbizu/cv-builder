import type { Theme, ThemeOverrides } from './types';
import { isLight, tint } from '../lib/color';

/**
 * Set curado de temas, portado del CV de referencia que inspiró el proyecto,
 * donde ya estaban validados a 1 página. Cambiar de tema **no** puede cambiar
 * el contenido ni la maqueta: solo redefine estas variables.
 */

const SANS_SYSTEM = '"Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

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
      ink: '#23303a',
      inkSoft: '#5c6b76',
      rule: '#e2ddd3',
    },
    fonts: {
      display: '"Georgia", "Iowan Old Style", "Times New Roman", serif',
      serif: '"Georgia", "Iowan Old Style", "Times New Roman", serif',
      sans: SANS_SYSTEM,
    },
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
      ink: '#23303a',
      inkSoft: '#5c6b76',
      rule: '#e2ddd3',
    },
    fonts: {
      display: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
      serif: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
      sans: SANS_SYSTEM,
    },
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
      ink: '#23303a',
      inkSoft: '#5c6b76',
      rule: '#dfe7e9',
    },
    fonts: {
      // Tema «todo sans»: sin serif, para un aire más corporativo.
      display: SANS_SYSTEM,
      serif: SANS_SYSTEM,
      sans: SANS_SYSTEM,
    },
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
      ink: '#23303a',
      inkSoft: '#5c6b76',
      rule: '#e4e0d6',
    },
    fonts: {
      display: '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif',
      serif: '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif',
      sans: SANS_SYSTEM,
    },
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
 * Tema → custom properties para el elemento raíz de la hoja.
 * Es el único punto donde JS toca el estilo de la zona imprimible: pasa
 * valores, nunca reglas de maquetación (CLAUDE.md §11).
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  return {
    '--primary': theme.colors.primary,
    '--primary-soft': theme.colors.primarySoft,
    '--accent': theme.colors.accent,
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
 * Auto-contraste de cabecera: con un color principal claro, el texto blanco
 * deja de leerse y la plantilla cambia a tinta oscura vía `[data-header]`.
 */
export function headerContrast(theme: Theme): 'light' | 'dark' {
  return isLight(theme.colors.primary) ? 'light' : 'dark';
}
