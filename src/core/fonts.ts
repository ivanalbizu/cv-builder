/**
 * Catálogo tipográfico (CLAUDE.md §7).
 *
 * Solo fuentes **libres**: el set de Google Fonts que se auto-hospeda en
 * `src/assets/fonts` (todas OFL 1.1) más los stacks del sistema, que no
 * descargan nada. Nunca privativas — ni licencia, ni archivo.
 *
 * El `stack` siempre termina en una familia genérica: si la fuente elegida
 * fallara al cargar, el CV se compone igual en vez de caer a Times.
 */

export type FontRole = 'sans' | 'serif';

export interface FontOption {
  id: string;
  name: string;
  role: FontRole;
  stack: string;
  /** Nota corta para el panel: para qué va bien. */
  hint: string;
  /** `false` en los stacks del sistema, que no bajan ningún archivo. */
  descarga: boolean;
}

const SISTEMA_SANS = '"Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif';
const SISTEMA_SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

export const FONTS: FontOption[] = [
  {
    id: 'sistema-sans',
    name: 'Sistema (sans)',
    role: 'sans',
    stack: SISTEMA_SANS,
    hint: 'La del sistema. No descarga nada y es la que valida la maqueta.',
    descarga: false,
  },
  {
    id: 'inter',
    name: 'Inter',
    role: 'sans',
    stack: `Inter, ${SISTEMA_SANS}`,
    hint: 'Neutra y muy legible en cuerpos pequeños. Alternativa libre a Graphik.',
    descarga: true,
  },
  {
    id: 'source-sans-3',
    name: 'Source Sans 3',
    role: 'sans',
    stack: `"Source Sans 3", ${SISTEMA_SANS}`,
    hint: 'Humanista, algo más cálida que Inter.',
    descarga: true,
  },
  {
    id: 'manrope',
    name: 'Manrope',
    role: 'sans',
    stack: `Manrope, ${SISTEMA_SANS}`,
    hint: 'Geométrica y compacta; da un aire más moderno.',
    descarga: true,
  },
  {
    id: 'sistema-serif',
    name: 'Sistema (serif)',
    role: 'serif',
    stack: SISTEMA_SERIF,
    hint: 'Georgia y equivalentes. No descarga nada.',
    descarga: false,
  },
  {
    id: 'lora',
    name: 'Lora',
    role: 'serif',
    stack: `Lora, ${SISTEMA_SERIF}`,
    hint: 'Serif de texto, sobria. Buena para nombres de empresa.',
    descarga: true,
  },
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    role: 'serif',
    stack: `"Playfair Display", ${SISTEMA_SERIF}`,
    hint: 'Mucho contraste. Solo para el nombre y los títulos, nunca de cuerpo.',
    descarga: true,
  },
  {
    id: 'eb-garamond',
    name: 'EB Garamond',
    role: 'serif',
    stack: `"EB Garamond", ${SISTEMA_SERIF}`,
    hint: 'Clásica y estrecha; deja respirar líneas largas.',
    descarga: true,
  },
];

export function fontsByRole(role: FontRole): FontOption[] {
  return FONTS.filter((f) => f.role === role);
}

/** Busca por id; si no existe, el primero de su papel (el del sistema). */
export function getFont(id: string, role: FontRole): FontOption {
  return FONTS.find((f) => f.id === id && f.role === role) ?? fontsByRole(role)[0]!;
}

/** Id de la opción cuyo `stack` coincide con el que ya guarda el tema. */
export function fontIdFromStack(stack: string, role: FontRole): string {
  return FONTS.find((f) => f.role === role && f.stack === stack)?.id ?? fontsByRole(role)[0]!.id;
}
