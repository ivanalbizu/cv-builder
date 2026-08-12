import { commands, type CVCommands } from '../core/commands';
import { useCVStore } from '../core/store';
import { callTool, toolCatalog, type ToolDescriptor, type ToolResult } from './tools';

/**
 * Puente `window.cvBuilder` — CLAUDE.md §5.3 / §8.
 *
 * Expone dos vistas de lo mismo:
 *   · los comandos sueltos, cómodos desde la consola y desde los tests;
 *   · el catálogo de herramientas (`tools` / `callTool`), que es lo que
 *     consumirá un puente agente↔web.
 *
 * Ambas acaban en la misma capa de comandos, así que no pueden divergir. Este
 * es el fallback sin MCP y la base sobre la que montar, en la segunda mitad de
 * la fase 4, el adaptador WebMCP que corresponda a la spec vigente.
 */
export interface CVBuilderGlobal extends CVCommands {
  /** Catálogo de herramientas con su JSON Schema, listo para un agente. */
  tools(): ToolDescriptor[];
  /** Ejecuta una herramienta por nombre. No lanza: devuelve `{ok:false,error}`. */
  callTool(name: string, args?: unknown): ToolResult;
  /** Suscripción a cambios del documento (útil para un agente reactivo). */
  subscribe(listener: () => void): () => void;
}

declare global {
  interface Window {
    cvBuilder?: CVBuilderGlobal;
  }
}

export function installGlobalApi(target: Window = window): void {
  const api: CVBuilderGlobal = {
    ...commands,
    tools: toolCatalog,
    callTool,
    subscribe: (listener) => useCVStore.subscribe(listener),
  };
  target.cvBuilder = api;
}
