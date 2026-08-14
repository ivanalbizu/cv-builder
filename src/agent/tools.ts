import { commands } from '../core/commands';
import { docActivo, selectResolvedThemeFor, useCVStore } from '../core/store';
import { THEMES, accentTextColor } from '../core/themes';
import { bestInk, contrastRatio, wcagLevel } from '../lib/contrast';
import { TEMPLATES } from '../cv/templates';
import type { ArgsSpec, JsonSchema } from './schema';
import { toJsonSchema, validate } from './schema';

/**
 * Catálogo de herramientas del agente (CLAUDE.md §8).
 *
 * Cada herramienta mapea 1:1 a un comando de `core/commands.ts`; aquí no hay
 * lógica de negocio, solo el contrato que el agente necesita para llamar:
 * nombre, descripción y esquema de argumentos.
 *
 * Es **agnóstico del transporte** a propósito. WebMCP está en movimiento
 * (§8), así que el catálogo no sabe nada de MCP: un adaptador fino lo traducirá
 * al mecanismo que acabe imponiéndose. Mientras tanto ya es usable por
 * `window.cvBuilder.callTool()`.
 *
 * Las descripciones están escritas PARA UN AGENTE: dicen no solo qué hace la
 * herramienta sino qué se espera del contenido (p. ej. que las viñetas son
 * titulares, no párrafos), porque es lo que evita que el CV se salga de página.
 */

export interface Tool {
  name: string;
  description: string;
  args: ArgsSpec;
  run: (args: Record<string, unknown>) => unknown;
}

const themeIds = THEMES.map((t) => t.id);
const templateIds = TEMPLATES.map((t) => t.id);

export const TOOLS: Tool[] = [
  // ---- lectura -------------------------------------------------------------
  {
    name: 'getCV',
    description:
      'Devuelve el CV completo (datos, no estilos): básicos y secciones con sus items e ' +
      'ids. Llama a esto primero: el resto de herramientas necesitan los ids que devuelve.',
    args: {},
    run: () => commands.getCV(),
  },
  {
    name: 'getLayout',
    description:
      'Devuelve la plantilla y el tema activos, y cuántas páginas ocupa ahora mismo el CV. ' +
      'Útil para comprobar si un cambio de contenido lo ha sacado de una página.',
    args: {},
    run: () => {
      const doc = docActivo(useCVStore.getState());
      return {
        templateId: doc.templateId,
        themeId: doc.themeId,
        overrides: doc.overrides,
        templatesDisponibles: templateIds,
        temasDisponibles: themeIds,
      };
    },
  },

  // ---- contenido -----------------------------------------------------------
  {
    name: 'setBasics',
    description:
      'Cambia nombre, puesto o perfil profesional. Solo se tocan los campos que pases. ' +
      'El perfil es un párrafo de 4–6 líneas; si lo dejas vacío, la sección desaparece.',
    args: {
      name: { kind: 'string', description: 'Nombre completo', optional: true },
      title: { kind: 'string', description: 'Puesto al que opta', optional: true },
      summary: { kind: 'string', description: 'Perfil profesional, un párrafo', optional: true },
    },
    run: (a) => {
      commands.setBasics(a);
      return { ok: true };
    },
  },
  {
    name: 'addExperience',
    description:
      'Añade un puesto a una sección de tipo «experience». Las viñetas son TITULARES en ' +
      'negrita (p. ej. «Gestión integral de la recepción»), no frases largas: el detalle se ' +
      'cuenta en la entrevista y los párrafos largos sacan el CV de una página.',
    args: {
      sectionId: { kind: 'string', description: 'Id de la sección de experiencia' },
      org: { kind: 'string', description: 'Empresa' },
      role: { kind: 'string', description: 'Puesto desempeñado' },
      start: { kind: 'string', description: 'Inicio, formato libre corto: «Nov 2018»' },
      end: { kind: 'string', description: 'Fin. Omítelo si es el puesto actual', optional: true },
      current: { kind: 'boolean', description: 'Puesto actual; muestra «Actualidad»', optional: true },
      location: { kind: 'string', description: 'Ciudad', optional: true },
      bullets: { kind: 'stringArray', description: 'Titulares, 2–4 por puesto', optional: true },
      tags: { kind: 'stringArray', description: 'Software usado en esa empresa', optional: true },
      rating: { kind: 'integer', description: 'Categoría del establecimiento, 0–5', optional: true, min: 0, max: 5 },
    },
    run: (a) => {
      const { sectionId, ...values } = a;
      const id = commands.addItem(String(sectionId), values);
      if (!id) throw new Error(`no existe la sección «${String(sectionId)}»`);
      return { itemId: id };
    },
  },
  {
    name: 'setBullets',
    description:
      'Reemplaza las viñetas de un puesto. Es la herramienta para reescribir logros en otro ' +
      'tono: lee el CV con getCV, redacta los titulares y escríbelos aquí de una vez.',
    args: {
      sectionId: { kind: 'string', description: 'Id de la sección' },
      itemId: { kind: 'string', description: 'Id del puesto' },
      bullets: { kind: 'stringArray', description: 'Titulares nuevos, sustituyen a los actuales' },
    },
    run: (a) => {
      commands.updateItem(String(a.sectionId), String(a.itemId), { bullets: a.bullets });
      return { ok: true };
    },
  },
  {
    name: 'addSimpleItem',
    description:
      'Añade un item a una sección de formación, idiomas o competencias. Usa los campos que ' +
      'correspondan al tipo: formación → title/org/year; idiomas → name/level/note; ' +
      'competencias → name.',
    args: {
      sectionId: { kind: 'string', description: 'Id de la sección' },
      title: { kind: 'string', description: 'Titulación (formación)', optional: true },
      name: { kind: 'string', description: 'Idioma o competencia', optional: true },
      org: { kind: 'string', description: 'Centro de estudios (formación)', optional: true },
      year: { kind: 'string', description: 'Año (formación)', optional: true },
      level: { kind: 'string', description: 'Nivel, p. ej. «B2» (idiomas)', optional: true },
      note: { kind: 'string', description: 'Titulación o matiz', optional: true },
    },
    run: (a) => {
      const { sectionId, ...values } = a;
      const id = commands.addItem(String(sectionId), values);
      if (!id) throw new Error(`no existe la sección «${String(sectionId)}»`);
      return { itemId: id };
    },
  },
  {
    name: 'removeItem',
    description: 'Elimina un item de una sección.',
    args: {
      sectionId: { kind: 'string', description: 'Id de la sección' },
      itemId: { kind: 'string', description: 'Id del item' },
    },
    run: (a) => {
      commands.removeItem(String(a.sectionId), String(a.itemId));
      return { ok: true };
    },
  },
  {
    name: 'reorderItem',
    description:
      'Mueve un item dentro de su sección. `toIndex` es la posición destino empezando en 0 ' +
      '(0 = primero). En experiencia lo habitual es orden cronológico inverso.',
    args: {
      sectionId: { kind: 'string', description: 'Id de la sección' },
      itemId: { kind: 'string', description: 'Id del item' },
      toIndex: { kind: 'integer', description: 'Posición destino, desde 0', min: 0 },
    },
    run: (a) => {
      commands.reorderItem(String(a.sectionId), String(a.itemId), Number(a.toIndex));
      return { ok: true };
    },
  },

  // ---- secciones -----------------------------------------------------------
  {
    name: 'addSection',
    description: 'Crea una sección vacía y devuelve su id.',
    args: {
      type: {
        kind: 'string',
        description: 'Tipo de sección',
        enum: ['experience', 'education', 'skills', 'languages', 'custom'] as const,
      },
      title: { kind: 'string', description: 'Título visible; si se omite, uno por defecto', optional: true },
    },
    run: (a) => ({
      sectionId: commands.addSection(a.type as 'experience', a.title as string | undefined),
    }),
  },
  {
    name: 'reorderSection',
    description: 'Cambia el orden de las secciones. `toIndex` empieza en 0.',
    args: {
      sectionId: { kind: 'string', description: 'Id de la sección' },
      toIndex: { kind: 'integer', description: 'Posición destino, desde 0', min: 0 },
    },
    run: (a) => {
      commands.reorderSection(String(a.sectionId), Number(a.toIndex));
      return { ok: true };
    },
  },
  {
    name: 'removeSection',
    description: 'Elimina una sección entera con todos sus items.',
    args: { sectionId: { kind: 'string', description: 'Id de la sección' } },
    run: (a) => {
      commands.removeSection(String(a.sectionId));
      return { ok: true };
    },
  },

  // ---- aspecto -------------------------------------------------------------
  {
    name: 'setTemplate',
    description: `Cambia la plantilla. Disponibles: ${templateIds.join(', ')}.`,
    args: { templateId: { kind: 'string', description: 'Id de plantilla', enum: templateIds } },
    run: (a) => {
      commands.setTemplate(String(a.templateId));
      return { ok: true };
    },
  },
  {
    name: 'setTheme',
    description:
      `Aplica uno de los temas curados: ${themeIds.join(', ')}. ` +
      'Descarta los colores personalizados que hubiera.',
    args: { themeId: { kind: 'string', description: 'Id de tema', enum: themeIds } },
    run: (a) => {
      commands.setTheme(String(a.themeId));
      return { ok: true };
    },
  },
  {
    name: 'setBrandColors',
    description:
      'Aplica los colores de una marca sobre el tema actual. Los tonos suaves se derivan ' +
      'solos, y si el principal es claro la cabecera pasa a tinta oscura automáticamente, ' +
      'así que no hace falta que compruebes el contraste.',
    args: {
      primary: { kind: 'hexColor', description: 'Color principal, p. ej. «#004b8d»' },
      accent: { kind: 'hexColor', description: 'Color de acento', optional: true },
    },
    run: (a) => {
      commands.setPrimary(String(a.primary));
      if (a.accent) commands.setAccent(String(a.accent));

      // Se devuelve el contraste resultante para que el agente sepa si acaba
      // de dejar el CV difícil de leer, en vez de tener que adivinarlo.
      const theme = selectResolvedThemeFor(useCVStore.getState());
      const tinta = headerContrastInk(theme.colors.primary);
      const cabecera = contrastRatio(tinta, theme.colors.primary);
      const texto = contrastRatio(accentTextColor(theme), '#ffffff');

      return {
        ok: true,
        contraste: {
          cabecera: `${cabecera.toFixed(1)}:1 (${wcagLevel(cabecera, 'large')})`,
          acentoComoTexto: `${texto.toFixed(1)}:1 (${wcagLevel(texto)})`,
          nota:
            accentTextColor(theme).toLowerCase() === theme.colors.accent.toLowerCase()
              ? undefined
              : 'El acento se oscurece solo donde hace de texto; los adornos conservan el color.',
        },
      };
    },
  },
  {
    name: 'setDensity',
    description:
      'Densidad de la maqueta. «compact» es la validada a 1 página; «comfy» respira más pero ' +
      'puede pasar a 2. Úsalo si getLayout dice que el CV se sale.',
    args: {
      density: { kind: 'string', description: 'Densidad', enum: ['compact', 'comfy'] as const },
    },
    run: (a) => {
      commands.setDensity(a.density as 'compact');
      return { ok: true };
    },
  },

  // ---- variantes -----------------------------------------------------------
  {
    name: 'listarVariantes',
    description:
      'Lista las versiones del CV, la más reciente primero, indicando cuál está en edición. ' +
      'Cada versión tiene su propio contenido, tema y plantilla.',
    args: {},
    run: () => commands.variantes(),
  },
  {
    name: 'duplicarVariante',
    description:
      'Copia la versión actual y pasa a editar la copia. ÚSALO ANTES de adaptar el CV a una ' +
      'oferta concreta: así reescribes sobre la copia y el CV general queda intacto. Pon un ' +
      'nombre que identifique la candidatura, por ejemplo «Recepción — Hotel Aurora».',
    args: { nombre: { kind: 'string', description: 'Nombre de la nueva versión' } },
    run: (a) => ({ varianteId: commands.duplicarVariante(String(a.nombre)) }),
  },
  {
    name: 'activarVariante',
    description:
      'Cambia la versión en edición. Vacía el historial de deshacer, porque un paso atrás ' +
      'pertenece a la versión donde se dio.',
    args: { varianteId: { kind: 'string', description: 'Id devuelto por listarVariantes' } },
    run: (a) => {
      commands.activarVariante(String(a.varianteId));
      return commands.variantes();
    },
  },

  // ---- historial -----------------------------------------------------------
  {
    name: 'undo',
    description:
      'Deshace el último cambio. Es la red de seguridad para editar sin miedo: si una ' +
      'reescritura no ha quedado bien, se revierte en vez de intentar recomponerla a mano. ' +
      'Las ediciones seguidas de un mismo campo cuentan como un solo paso.',
    args: {},
    run: () => {
      commands.undo();
      return commands.historial();
    },
  },
  {
    name: 'redo',
    description:
      'Rehace lo último deshecho. Cualquier edición nueva descarta lo que hubiera pendiente ' +
      'de rehacer, así que úsalo antes de seguir tocando el CV.',
    args: {},
    run: () => {
      commands.redo();
      return commands.historial();
    },
  },

  // ---- salida --------------------------------------------------------------
  {
    name: 'exportPDF',
    description:
      'Abre el diálogo de impresión del navegador para guardar el CV como PDF. Requiere que ' +
      'haya alguien delante: no sirve para automatizar (para eso está `pnpm pdf`).',
    args: {},
    run: () => {
      commands.exportPDF();
      return { ok: true };
    },
  },
];

/** Catálogo en el formato que espera un puente agente↔web: nombre + JSON Schema. */
export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export function toolCatalog(): ToolDescriptor[] {
  return TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toJsonSchema(tool.args),
  }));
}

export type ToolResult = { ok: true; result: unknown } | { ok: false; error: string };

/**
 * Ejecuta una herramienta validando antes los argumentos.
 *
 * Nunca lanza: un agente que se equivoca de nombre o de tipo recibe un mensaje
 * que explica el error y puede corregirse, en vez de una excepción que corta la
 * conversación. El documento no se toca si la validación falla.
 */
export function callTool(name: string, args: unknown = {}): ToolResult {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { ok: false, error: `herramienta desconocida «${name}». Disponibles: ${TOOLS.map((t) => t.name).join(', ')}` };
  }

  const checked = validate(tool.args, args);
  if (!checked.ok) {
    return { ok: false, error: `argumentos inválidos para «${name}»: ${checked.errors.join('; ')}` };
  }

  try {
    return { ok: true, result: tool.run(checked.value) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Tinta que la cabecera usará sobre ese fondo. Espejo de `headerContrast`. */
function headerContrastInk(primary: string): string {
  return bestInk(primary).ink;
}
