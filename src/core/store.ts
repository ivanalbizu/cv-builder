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
 *
 * Ese embudo es lo que hace barato el historial: como no hay más caminos de
 * escritura, basta con anotar el documento anterior aquí para que TODO sea
 * deshacible, incluido lo que haga un agente.
 */

/**
 * Tope del historial.
 *
 * Guardar el documento entero por paso no pesa lo que parece: immer comparte
 * estructura, así que dos versiones que solo difieren en un campo comparten el
 * resto de objetos — y en particular la foto en base64, que es el único dato
 * grande, es la MISMA cadena en todas las entradas.
 */
const MAX_HISTORIAL = 60;

/**
 * Ventana para fusionar ediciones seguidas del mismo campo.
 *
 * Sin esto, escribir «Recepcionista» dejaría trece pasos de deshacer y la
 * función sería inservible. Los comandos de escritura continua (teclear,
 * arrastrar un selector de color) pasan una clave y sus cambios consecutivos
 * se funden en un solo paso; los estructurales (añadir, borrar, reordenar) no
 * la pasan, así que siempre son un paso propio.
 */
const VENTANA_FUSION_MS = 700;

export interface OpcionesEdicion {
  /** Clave de fusión; cambios seguidos con la misma clave son un solo paso. */
  fusionar?: string;
}

export interface CVStore {
  doc: CVDocument;
  /** Escala de la vista previa en pantalla. Nunca afecta a la impresión. */
  zoom: number;

  /** Documentos anteriores, del más antiguo al más reciente. */
  pasado: CVDocument[];
  /** Documentos deshechos, listos para rehacer. */
  futuro: CVDocument[];
  /** Última fusión aplicada, para saber si la siguiente edición continúa. */
  ultimaFusion: { clave: string; en: number } | null;

  /** Punto de escritura único; uso reservado a `core/commands.ts`. */
  update: (recipe: (draft: CVDocument) => void, opciones?: OpcionesEdicion) => void;
  replaceDoc: (doc: CVDocument) => void;
  setZoom: (zoom: number) => void;

  undo: () => void;
  redo: () => void;
  /** Vacía el historial. Para cargar un documento «desde cero». */
  olvidarHistorial: () => void;
}

export const STORAGE_KEY = 'cv-builder:doc:v1';

export const useCVStore = create<CVStore>()(
  persist(
    immer((set, get) => {
      /**
       * Anota el documento anterior antes de sustituirlo.
       * Devuelve `false` si la edición debe fundirse con la anterior.
       */
      const registrar = (anterior: CVDocument, fusionar?: string) => {
        const { ultimaFusion } = get();
        const continua =
          fusionar !== undefined &&
          ultimaFusion?.clave === fusionar &&
          Date.now() - ultimaFusion.en < VENTANA_FUSION_MS;

        set((state) => {
          if (!continua) {
            state.pasado.push(anterior);
            if (state.pasado.length > MAX_HISTORIAL) state.pasado.shift();
          }
          // Cualquier edición nueva invalida lo que hubiera para rehacer.
          state.futuro = [];
          state.ultimaFusion = fusionar === undefined ? null : { clave: fusionar, en: Date.now() };
        });
      };

      return {
        doc: SEED_DOCUMENT,
        zoom: 1,
        pasado: [],
        futuro: [],
        ultimaFusion: null,

        update: (recipe, opciones) => {
          const anterior = get().doc;
          set((state) => void recipe(state.doc));
          // immer devuelve el MISMO objeto si la receta no cambió nada; sin
          // esta guarda, abrir un desplegable y elegir lo mismo dejaría un
          // paso de deshacer que no deshace nada.
          if (get().doc === anterior) return;
          registrar(anterior, opciones?.fusionar);
        },

        replaceDoc: (doc) => {
          const anterior = get().doc;
          if (doc === anterior) return;
          set((state) => {
            state.doc = doc;
          });
          // Importar un JSON o cargar la semilla también se deshace: son la
          // clase de acción que más se lamenta si no hay vuelta atrás.
          registrar(anterior);
        },

        setZoom: (zoom) =>
          set((state) => {
            state.zoom = Math.min(2, Math.max(0.25, zoom));
          }),

        undo: () =>
          set((state) => {
            const anterior = state.pasado.pop();
            if (!anterior) return;
            state.futuro.unshift(state.doc);
            state.doc = anterior;
            // Se corta la fusión: lo siguiente que se escriba es un paso nuevo.
            state.ultimaFusion = null;
          }),

        redo: () =>
          set((state) => {
            const siguiente = state.futuro.shift();
            if (!siguiente) return;
            state.pasado.push(state.doc);
            state.doc = siguiente;
            state.ultimaFusion = null;
          }),

        olvidarHistorial: () =>
          set((state) => {
            state.pasado = [];
            state.futuro = [];
            state.ultimaFusion = null;
          }),
      };
    }),
    {
      name: STORAGE_KEY,
      // Solo el documento. El zoom es estado de UI, y el historial es de la
      // sesión: recuperar al recargar un «deshacer» de hace tres días sería
      // más desconcertante que útil, y multiplicaría el tamaño en localStorage.
      partialize: (state) => ({ doc: state.doc }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectores (lectura). La UI lee por aquí; escribir es cosa de los comandos.
// ---------------------------------------------------------------------------

export const selectDoc = (s: CVStore): CVDocument => s.doc;

/** Tema resuelto fuera de React (herramientas del agente, scripts). */
export function selectResolvedThemeFor(s: CVStore): Theme {
  return resolveTheme(getTheme(s.doc.themeId), s.doc.overrides);
}

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
