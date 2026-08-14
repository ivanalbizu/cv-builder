import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { CVDocument, Theme } from './types';
import { SEED_DOCUMENT } from './seed';
import { newId } from '../lib/id';
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
 * Una versión del CV. Adaptar el currículum a una oferta produce variantes por
 * naturaleza —una por candidatura—, y con un solo documento adaptarlo a la
 * segunda destruía la primera.
 */
export interface Variante {
  id: string;
  nombre: string;
  doc: CVDocument;
  /** Epoch ms; ordena la lista por lo último tocado. */
  modificada: number;
}

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
  variantes: Variante[];
  activaId: string;
  /** Escala de la vista previa en pantalla. Nunca afecta a la impresión. */
  zoom: number;

  /** Documentos anteriores de la variante ACTIVA, del más antiguo al último. */
  pasado: CVDocument[];
  futuro: CVDocument[];
  ultimaFusion: { clave: string; en: number } | null;

  /** Punto de escritura único; uso reservado a `core/commands.ts`. */
  update: (recipe: (draft: CVDocument) => void, opciones?: OpcionesEdicion) => void;
  replaceDoc: (doc: CVDocument) => void;
  setZoom: (zoom: number) => void;

  undo: () => void;
  redo: () => void;
  olvidarHistorial: () => void;

  crearVariante: (nombre: string, doc: CVDocument) => string;
  renombrarVariante: (id: string, nombre: string) => void;
  eliminarVariante: (id: string) => void;
  activarVariante: (id: string) => void;
}

export const STORAGE_KEY = 'cv-builder:doc:v1';

/**
 * El documento en edición. Es DERIVADO de la variante activa, no un campo
 * aparte: con dos copias acabarían divergiendo en cuanto una ruta de escritura
 * olvidara actualizar la otra.
 */
export function docActivo(s: CVStore): CVDocument {
  return (s.variantes.find((v) => v.id === s.activaId) ?? s.variantes[0]!).doc;
}

function varianteInicial(): Variante {
  return { id: newId('v'), nombre: 'Mi CV', doc: SEED_DOCUMENT, modificada: Date.now() };
}

export const useCVStore = create<CVStore>()(
  persist(
    immer((set, get) => {
      const inicial = varianteInicial();

      /** Anota el documento anterior; decide si la edición se funde con la previa. */
      const registrar = (anterior: CVDocument, fusionar?: string) => {
        const { ultimaFusion } = get();
        const continua =
          fusionar !== undefined &&
          ultimaFusion?.clave === fusionar &&
          Date.now() - ultimaFusion.en < VENTANA_FUSION_MS;

        set((state) => {
          const v = state.variantes.find((x) => x.id === state.activaId);
          if (v) v.modificada = Date.now();

          if (!continua) {
            state.pasado.push(anterior);
            if (state.pasado.length > MAX_HISTORIAL) state.pasado.shift();
          }
          // Cualquier edición nueva invalida lo que hubiera para rehacer.
          state.futuro = [];
          state.ultimaFusion = fusionar === undefined ? null : { clave: fusionar, en: Date.now() };
        });
      };

      const escribirEnActiva = (fn: (doc: CVDocument) => void) =>
        set((state) => {
          const v = state.variantes.find((x) => x.id === state.activaId);
          if (v) fn(v.doc);
        });

      return {
        variantes: [inicial],
        activaId: inicial.id,
        zoom: 1,
        pasado: [],
        futuro: [],
        ultimaFusion: null,

        update: (recipe, opciones) => {
          const anterior = docActivo(get());
          escribirEnActiva(recipe);
          // immer devuelve el MISMO objeto si la receta no cambió nada; sin
          // esta guarda, abrir un desplegable y elegir lo mismo dejaría un
          // paso de deshacer que no deshace nada.
          if (docActivo(get()) === anterior) return;
          registrar(anterior, opciones?.fusionar);
        },

        replaceDoc: (doc) => {
          const anterior = docActivo(get());
          if (doc === anterior) return;
          escribirEnActiva(() => {});
          set((state) => {
            const v = state.variantes.find((x) => x.id === state.activaId);
            if (v) v.doc = doc;
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
            const v = state.variantes.find((x) => x.id === state.activaId);
            if (!v) return;
            state.futuro.unshift(v.doc);
            v.doc = anterior;
            // Se corta la fusión: lo siguiente que se escriba es un paso nuevo.
            state.ultimaFusion = null;
          }),

        redo: () =>
          set((state) => {
            const siguiente = state.futuro.shift();
            if (!siguiente) return;
            const v = state.variantes.find((x) => x.id === state.activaId);
            if (!v) return;
            state.pasado.push(v.doc);
            v.doc = siguiente;
            state.ultimaFusion = null;
          }),

        olvidarHistorial: () =>
          set((state) => {
            state.pasado = [];
            state.futuro = [];
            state.ultimaFusion = null;
          }),

        // ---- variantes ------------------------------------------------------

        crearVariante: (nombre, doc) => {
          const id = newId('v');
          set((state) => {
            state.variantes.push({ id, nombre, doc, modificada: Date.now() });
            state.activaId = id;
            // Cambiar de variante corta el historial: deshacer después de un
            // salto restauraría el documento de OTRA versión sobre esta.
            state.pasado = [];
            state.futuro = [];
            state.ultimaFusion = null;
          });
          return id;
        },

        renombrarVariante: (id, nombre) =>
          set((state) => {
            const v = state.variantes.find((x) => x.id === id);
            if (v && nombre.trim()) v.nombre = nombre.trim();
          }),

        eliminarVariante: (id) =>
          set((state) => {
            // Nunca dejar la app sin documento: con una sola, no se borra.
            if (state.variantes.length <= 1) return;
            state.variantes = state.variantes.filter((v) => v.id !== id);
            if (state.activaId === id) {
              state.activaId = state.variantes[0]!.id;
              state.pasado = [];
              state.futuro = [];
              state.ultimaFusion = null;
            }
          }),

        activarVariante: (id) =>
          set((state) => {
            if (!state.variantes.some((v) => v.id === id) || state.activaId === id) return;
            state.activaId = id;
            state.pasado = [];
            state.futuro = [];
            state.ultimaFusion = null;
          }),
      };
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      /**
       * v1 guardaba un único `doc`. Se envuelve en una variante para no perder
       * el CV de quien ya venía usando la app.
       */
      migrate: (guardado, version) => {
        if (version >= 2) return guardado as { variantes: Variante[]; activaId: string };
        const doc = (guardado as { doc?: CVDocument } | null)?.doc ?? SEED_DOCUMENT;
        const v: Variante = { id: newId('v'), nombre: 'Mi CV', doc, modificada: Date.now() };
        return { variantes: [v], activaId: v.id };
      },
      // Solo las variantes. El zoom es estado de UI, y el historial es de la
      // sesión: recuperar al recargar un «deshacer» de hace tres días sería
      // más desconcertante que útil, y multiplicaría el tamaño en localStorage.
      partialize: (state) => ({ variantes: state.variantes, activaId: state.activaId }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selectores (lectura). La UI lee por aquí; escribir es cosa de los comandos.
// ---------------------------------------------------------------------------

export const selectDoc = docActivo;

/** Tema resuelto fuera de React (herramientas del agente, scripts). */
export function selectResolvedThemeFor(s: CVStore): Theme {
  const doc = docActivo(s);
  return resolveTheme(getTheme(doc.themeId), doc.overrides);
}

/**
 * Tema base + ajustes del usuario ya aplicados: lo que consume la plantilla.
 *
 * Se memoiza a propósito: `resolveTheme` devuelve un objeto nuevo cada vez y
 * usarlo como selector directo rompería `useSyncExternalStore` (bucle de
 * renders por snapshot no estable).
 */
export function useResolvedTheme(): Theme {
  const themeId = useCVStore((s) => docActivo(s).themeId);
  const overrides = useCVStore((s) => docActivo(s).overrides);
  return useMemo(() => resolveTheme(getTheme(themeId), overrides), [themeId, overrides]);
}
