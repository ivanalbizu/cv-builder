import { describe, expect, it } from 'vitest';
import {
  THEMES,
  accentTextColor,
  headerAccent,
  headerContrast,
  headerInk,
  primaryTextColor,
  resolveTheme,
} from './themes';
import { contrastRatio, wcagLevel } from '../lib/contrast';
import type { Theme } from './types';

/**
 * Contraste de los temas curados, como parte del checklist.
 *
 * Nace de una auditoría que encontró 6 fallos de AA en 3 de los 4 temas: el
 * acento se usaba como texto pequeño sobre blanco y se quedaba en ~3:1. El
 * arreglo fue derivar `--accent-text`; este test existe para que el fallo no
 * vuelva a entrar, aquí o en un tema nuevo.
 */

/** Pares fondo/texto que existen de verdad en las plantillas, con su tamaño. */
function pares(theme: Theme) {
  const c = theme.colors;
  const blanco = '#ffffff';
  const accentText = accentTextColor(theme);
  const primaryText = primaryTextColor(theme);

  return [
    { label: 'nombre en cabecera', fg: headerInk(theme), bg: c.primary, large: true },
    { label: 'puesto en cabecera', fg: headerAccent(theme), bg: c.primary, large: false },
    { label: 'contacto en cabecera', fg: headerInk(theme), bg: c.primary, large: false },
    { label: 'título de sección', fg: primaryText, bg: blanco, large: false },
    { label: 'nombre de empresa', fg: primaryText, bg: blanco, large: false },
    { label: 'insignia de fechas', fg: primaryText, bg: c.surface, large: false },
    { label: 'cargo del puesto', fg: accentText, bg: blanco, large: false },
    { label: 'año de formación', fg: accentText, bg: blanco, large: false },
    { label: 'nivel de idioma', fg: accentText, bg: blanco, large: false },
    { label: 'texto del perfil', fg: c.ink, bg: c.surface, large: false },
    { label: 'ciudad y secundarios', fg: c.inkSoft, bg: blanco, large: false },
  ];
}

describe.each(THEMES.map((t) => [t.name, t] as const))('tema %s', (_nombre, theme) => {
  it.each(pares(theme))('«$label» cumple WCAG AA', ({ fg, bg, large }) => {
    const ratio = contrastRatio(fg, bg);
    expect(wcagLevel(ratio, large ? 'large' : 'normal'), `ratio ${ratio.toFixed(2)}:1`).not.toBe(
      'insuficiente',
    );
  });

  it('el acento decorativo NO se toca: solo se deriva su variante de texto', () => {
    // El filete, los puntos del timeline y los iconos siguen usando --accent.
    // Cambiar la paleta habría alterado el diseño; esto solo añade un tono.
    expect(theme.colors.accent).toBe(THEMES.find((t) => t.id === theme.id)!.colors.accent);
  });
});

describe('acento como texto', () => {
  it('se oscurece solo cuando hace falta', () => {
    const corporativo = THEMES.find((t) => t.id === 'corporativo')!;
    // Su acento ya cumplía (4.75:1), así que debe quedarse igual.
    expect(accentTextColor(corporativo)).toBe(corporativo.colors.accent);

    const lujo = THEMES.find((t) => t.id === 'lujo')!;
    // El suyo se quedaba en 2.95:1 y sí tiene que cambiar.
    expect(accentTextColor(lujo)).not.toBe(lujo.colors.accent);
  });

  it('también protege un acento de marca elegido por el usuario o un agente', () => {
    const conMarca = resolveTheme(THEMES[0]!, { accent: '#ffd400' });
    expect(contrastRatio(accentTextColor(conMarca), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * La prueba de fuego: colores de marca arbitrarios, incluidos los que antes
 * dejaban el CV ilegible. Un amarillo corporativo hacía desaparecer el puesto
 * de la cabecera y dejaba los títulos de sección en 1.4:1.
 */
describe.each([
  ['azul corporativo', '#004b8d', '#c8102e'],
  ['amarillo de marca', '#ffd400', '#ffcc00'],
  ['rojo intenso', '#c8102e', '#ffb81c'],
  ['gris medio', '#7f7f7f', '#9a9a9a'],
  ['casi blanco', '#f2f2f2', '#e0e0e0'],
  ['negro', '#000000', '#444444'],
  ['verde lima', '#a8e10c', '#d4ff4f'],
])('marca %s', (_nombre, primary, accent) => {
  const theme = resolveTheme(THEMES[0]!, { primary, accent });

  it.each(pares(theme))('«$label» sigue siendo legible', ({ fg, bg, large }) => {
    const ratio = contrastRatio(fg, bg);
    expect(wcagLevel(ratio, large ? 'large' : 'normal'), `ratio ${ratio.toFixed(2)}:1`).not.toBe(
      'insuficiente',
    );
  });
});

describe('auto-contraste de cabecera', () => {
  it('los cuatro temas llevan tinta blanca: todos tienen principal oscuro', () => {
    for (const theme of THEMES) expect(headerContrast(theme)).toBe('dark');
  });

  it('un principal claro de marca cambia la cabecera a tinta oscura', () => {
    expect(headerContrast(resolveTheme(THEMES[0]!, { primary: '#ffd400' }))).toBe('light');
  });

  it('la tinta elegida siempre supera AA para texto grande', () => {
    const marcas = ['#004b8d', '#ffd400', '#c8102e', '#7f7f7f', '#e8e8e8', '#2b2b2b'];
    for (const primary of marcas) {
      const theme = resolveTheme(THEMES[0]!, { primary });
      const tinta = headerContrast(theme) === 'light' ? '#22303a' : '#ffffff';
      const ratio = contrastRatio(tinta, primary);
      expect(wcagLevel(ratio, 'large'), `${primary} → ${ratio.toFixed(2)}:1`).not.toBe(
        'insuficiente',
      );
    }
  });
});
