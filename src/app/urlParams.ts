import { commands } from '../core/commands';
import { THEMES } from '../core/themes';
import { TEMPLATES } from '../cv/templates';
import { isHex, normalizeHex } from '../lib/color';

/**
 * Parámetros de URL, portados del CV de referencia, que ya los usaba para
 * generar un PDF por tema sin tocar la interfaz.
 *
 *   ?template=sidebar&theme=lujo&primary=%23004b8d&accent=%23c8102e&density=comfy
 *
 * Sirven para automatizar (Chrome headless, Playwright en fase 3) y para
 * compartir un enlace con un aspecto concreto. Solo tocan TEMA y PLANTILLA:
 * el contenido no se toca desde la URL, que sería una vía de inyección.
 *
 * Todo valor desconocido se ignora en silencio: un enlace mal copiado abre la
 * app normal, no una app rota.
 */
export function applyUrlParams(search = window.location.search): void {
  const params = new URLSearchParams(search);

  const template = params.get('template');
  if (template && TEMPLATES.some((t) => t.id === template)) {
    commands.setTemplate(template);
  }

  const theme = params.get('theme');
  if (theme && THEMES.some((t) => t.id === theme)) {
    commands.setTheme(theme);
  }

  for (const [key, apply] of [
    ['primary', commands.setPrimary],
    ['accent', commands.setAccent],
  ] as const) {
    const value = params.get(key);
    const hex = value ? normalizeHex(value) : null;
    if (hex && isHex(hex)) apply(hex);
  }

  const density = params.get('density');
  if (density === 'comfy' || density === 'compact') commands.setDensity(density);
}
