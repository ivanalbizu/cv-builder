import { commands, type CVCommands } from '../core/commands';
import { useCVStore } from '../core/store';

/**
 * Puente `window.cvBuilder` — CLAUDE.md §5.3 / §8.
 *
 * Es el fallback sin MCP: expone **la misma** capa de comandos que usa la UI,
 * ni una función más. Sirve para automatizar desde la consola, para los tests
 * e2e y, en la fase 4, como base sobre la que montar el adaptador WebMCP
 * vigente (la spec se mueve, así que el core se mantiene agnóstico).
 */
export interface CVBuilderGlobal extends CVCommands {
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
    subscribe: (listener) => useCVStore.subscribe(listener),
  };
  target.cvBuilder = api;
}
