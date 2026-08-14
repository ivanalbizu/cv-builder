import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, useCVStore } from './store';
import { SEED_DOCUMENT } from './seed';
import type { CVDocument } from './types';

/**
 * Migración del formato guardado.
 *
 * La v1 guardaba un único `doc`; la v2 guarda una lista de variantes. Este es
 * el punto donde un descuido borra el CV de alguien que llevaba meses usando la
 * app, así que la migración se ejerce de verdad en vez de darla por buena.
 */

/** Ejecuta la migración declarada en el store contra un guardado antiguo. */
function migrar(guardado: unknown, version: number) {
  const opciones = (
    useCVStore as unknown as {
      persist: { getOptions: () => { migrate?: (s: unknown, v: number) => unknown } };
    }
  ).persist.getOptions();
  return opciones.migrate!(guardado, version) as {
    variantes: { id: string; nombre: string; doc: CVDocument }[];
    activaId: string;
  };
}

describe('de v1 (un documento) a v2 (variantes)', () => {
  it('conserva el CV que hubiera guardado', () => {
    const antiguo = structuredClone(SEED_DOCUMENT);
    antiguo.data.basics.name = 'CV de hace meses';
    antiguo.themeId = 'lujo';

    const nuevo = migrar({ doc: antiguo }, 1);

    expect(nuevo.variantes).toHaveLength(1);
    expect(nuevo.variantes[0]!.doc.data.basics.name).toBe('CV de hace meses');
    expect(nuevo.variantes[0]!.doc.themeId, 'también el aspecto').toBe('lujo');
  });

  it('deja activa la variante migrada', () => {
    const nuevo = migrar({ doc: SEED_DOCUMENT }, 1);
    expect(nuevo.activaId).toBe(nuevo.variantes[0]!.id);
  });

  it('le pone un nombre en vez de dejarla sin rótulo', () => {
    expect(migrar({ doc: SEED_DOCUMENT }, 1).variantes[0]!.nombre).toBeTruthy();
  });

  it('un guardado corrupto no deja la app sin documento', () => {
    // Antes que arrancar en blanco o reventar, se cae a la semilla.
    for (const basura of [null, {}, { doc: undefined }]) {
      const nuevo = migrar(basura, 1);
      expect(nuevo.variantes[0]!.doc.data.basics).toBeDefined();
    }
  });

  it('un guardado ya en v2 pasa tal cual', () => {
    const v2 = { variantes: [{ id: 'v_x', nombre: 'A', doc: SEED_DOCUMENT, modificada: 1 }], activaId: 'v_x' };
    expect(migrar(v2, 2)).toEqual(v2);
  });
});

describe('qué se persiste', () => {
  it('la clave de almacenamiento no cambia: se migra en su sitio', () => {
    // Cambiarla haría «desaparecer» el CV en lugar de migrarlo.
    expect(STORAGE_KEY).toBe('cv-builder:doc:v1');
  });

  it('el historial no se guarda', () => {
    const opciones = (
      useCVStore as unknown as {
        persist: { getOptions: () => { partialize?: (s: unknown) => object } };
      }
    ).persist.getOptions();
    const guardado = opciones.partialize!(useCVStore.getState());

    expect(Object.keys(guardado).sort()).toEqual(['activaId', 'variantes']);
  });
});
