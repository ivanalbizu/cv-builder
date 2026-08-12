import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { CVDocument, Theme } from './types';
import { SEED_DOCUMENT } from './seed';
import { getTheme, resolveTheme } from './themes';

/**
 * Store de la app.
 *
 * IMPORTANTE (CLAUDE.md §11): la UI y el agente **no** llaman a `update` ni
 * tocan este store directamente. Toda mutación pasa por la capa de comandos
 * (`core/commands.ts`), que es la que se expone también a WebMCP. `update`
 * es el único hueco por el que los comandos escriben.
 */
export interface CVStore {
  doc: CVDocument;
  /** Escala de la vista previa en pantalla. Nunca afecta a la impresión. */
  zoom: number;
  /** Punto de escritura único; uso reservado a `core/commands.ts`. */
  update: (recipe: (draft: CVDocument) => void) => void;
  replaceDoc: (doc: CVDocument) => void;
  setZoom: (zoom: number) => void;
}

export const STORAGE_KEY = 'cv-builder:doc:v1';

export const useCVStore = create<CVStore>()(
  persist(
    immer((set) => ({
      doc: SEED_DOCUMENT,
      zoom: 1,
      update: (recipe) => set((state) => void recipe(state.doc)),
      replaceDoc: (doc) =>
        set((state) => {
          state.doc = doc;
        }),
      setZoom: (zoom) =>
        set((state) => {
          state.zoom = Math.min(2, Math.max(0.25, zoom));
        }),
    })),
    {
      name: STORAGE_KEY,
      // El zoom es estado de UI: no forma parte del documento.
      partialize: (state) => ({ doc: state.doc }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectores (lectura). La UI lee por aquí; escribir es cosa de los comandos.
// ---------------------------------------------------------------------------

export const selectDoc = (s: CVStore): CVDocument => s.doc;

/**
 * Tema base + ajustes del usuario ya aplicados: lo que consume la plantilla.
 *
 * Se memoiza a propósito: `resolveTheme` devuelve un objeto nuevo cada vez y
 * usarlo como selector directo rompería `useSyncExternalStore` (bucle de
 * renders por snapshot no estable).
 */
export function useResolvedTheme(): Theme {
  const themeId = useCVStore((s) => s.doc.themeId);
  const overrides = useCVStore((s) => s.doc.overrides);
  return useMemo(() => resolveTheme(getTheme(themeId), overrides), [themeId, overrides]);
}
