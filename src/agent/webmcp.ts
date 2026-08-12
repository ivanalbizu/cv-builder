import { TOOLS } from './tools';
import { callTool } from './tools';
import { toJsonSchema } from './schema';

/**
 * Adaptador WebMCP (CLAUDE.md §8, fase 4 paso 2).
 *
 * Es DELIBERADAMENTE fino: traduce el catálogo de `tools.ts` al mecanismo del
 * navegador y nada más. Toda la lógica vive en la capa de comandos, así que
 * cuando la spec vuelva a moverse solo se reescribe este fichero.
 *
 * Estado de la spec cuando se escribió esto (agosto 2026), y motivo de que el
 * adaptador esté escrito a la defensiva:
 *
 *  - WebMCP es un **Draft Community Group Report** del W3C: no es un estándar
 *    ni está en el Standards Track. Sigue en incubación.
 *  - La API **ya se ha movido una vez**: de `navigator.modelContext` a
 *    `document.modelContext` (21 jul 2026). Chrome 150 deprecó la ubicación
 *    antigua, pero el origin trial sigue sirviendo las dos. Por eso aquí se
 *    prueban ambas, en ese orden.
 *  - Solo Chrome la implementa (origin trial 149–156). Firefox y Safari
 *    participan en la spec pero sin fechas.
 *
 * Si el navegador no la trae, `installWebMCP` no hace nada y la app funciona
 * igual: la integración es aditiva, nunca un requisito.
 */

/** La parte de la API que usamos. Declarada aquí porque aún no está en lib.dom. */
export interface ModelContextLike {
  registerTool(tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;
  }): void | Promise<void>;
}

/**
 * Busca la API en las dos ubicaciones que conviven durante el origin trial.
 * `document` primero: es la ubicación vigente, y `navigator` está deprecada.
 */
export function findModelContext(scope: {
  document?: unknown;
  navigator?: unknown;
}): ModelContextLike | null {
  const fromDocument = (scope.document as { modelContext?: unknown } | undefined)?.modelContext;
  const fromNavigator = (scope.navigator as { modelContext?: unknown } | undefined)?.modelContext;
  const found = fromDocument ?? fromNavigator;

  return found && typeof (found as ModelContextLike).registerTool === 'function'
    ? (found as ModelContextLike)
    : null;
}

export interface InstallResult {
  /** `false` si el navegador no trae WebMCP: no es un error. */
  installed: boolean;
  registered: string[];
}

/**
 * Registra el catálogo entero en el navegador.
 *
 * `modelContext` se puede inyectar para poder testear el mapeo sin depender de
 * un Chrome con el origin trial activo.
 */
export function installWebMCP(modelContext?: ModelContextLike | null): InstallResult {
  const target =
    modelContext ??
    (typeof window === 'undefined' ? null : findModelContext(window as unknown as { document: unknown; navigator: unknown }));

  if (!target) return { installed: false, registered: [] };

  const registered: string[] = [];
  for (const tool of TOOLS) {
    target.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: toJsonSchema(tool.args) as unknown as Record<string, unknown>,
      execute: async (input) => toContent(callTool(tool.name, input ?? {})),
    });
    registered.push(tool.name);
  }

  return { installed: true, registered };
}

/**
 * Resultado de `callTool` → el `content` que espera WebMCP.
 *
 * Un error se devuelve como texto, no como excepción: el agente lo lee, se
 * corrige y reintenta. Lanzar cortaría la conversación por un argumento mal
 * escrito, que es precisamente el fallo más probable.
 */
function toContent(result: ReturnType<typeof callTool>): {
  content: { type: 'text'; text: string }[];
} {
  const text = result.ok
    ? JSON.stringify(result.result ?? { ok: true })
    : `Error: ${result.error}`;
  return { content: [{ type: 'text', text }] };
}
