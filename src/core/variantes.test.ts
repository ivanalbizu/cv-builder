import { beforeEach, describe, expect, it } from 'vitest';
import { commands } from './commands';
import { docActivo, useCVStore } from './store';
import { SEED_DOCUMENT } from './seed';

/**
 * Variantes del documento.
 *
 * Adaptar el CV a una oferta produce versiones por naturaleza —una por
 * candidatura—. Lo que hay que garantizar es el aislamiento: editar una no
 * puede tocar a las demás, que es justo lo que pasaba con un documento único.
 */

const doc = () => docActivo(useCVStore.getState());
const nombre = () => doc().data.basics.name;

beforeEach(() => {
  const inicial = useCVStore.getState().variantes[0]!;
  useCVStore.setState({
    variantes: [{ ...inicial, nombre: 'Mi CV', doc: structuredClone(SEED_DOCUMENT) }],
    activaId: inicial.id,
    pasado: [],
    futuro: [],
    ultimaFusion: null,
  });
});

describe('lo básico', () => {
  it('arranca con una sola versión activa', () => {
    const lista = commands.variantes();
    expect(lista).toHaveLength(1);
    expect(lista[0]!.activa).toBe(true);
  });

  it('duplicar copia el contenido y salta a la copia', () => {
    commands.setBasics({ name: 'Original' });
    const id = commands.duplicarVariante('Para Hotel Aurora');

    expect(commands.variantes()).toHaveLength(2);
    expect(commands.variantes().find((v) => v.activa)!.id).toBe(id);
    expect(nombre(), 'la copia parte del contenido actual').toBe('Original');
  });

  it('empezar una vacía no arrastra el contenido anterior', () => {
    commands.setBasics({ name: 'Original' });
    commands.nuevaVariante('Desde cero');
    expect(nombre()).toBe('Tu nombre');
  });

  it('renombrar no toca el documento', () => {
    const id = useCVStore.getState().activaId;
    const antes = doc();
    commands.renombrarVariante(id, 'Otro nombre');
    expect(commands.variantes()[0]!.nombre).toBe('Otro nombre');
    expect(doc()).toBe(antes);
  });

  it('un nombre en blanco no borra el que había', () => {
    const id = useCVStore.getState().activaId;
    commands.renombrarVariante(id, '   ');
    expect(commands.variantes()[0]!.nombre).toBe('Mi CV');
  });
});

describe('aislamiento', () => {
  it('editar una versión no toca a la otra', () => {
    commands.setBasics({ name: 'CV general' });
    const general = useCVStore.getState().activaId;

    commands.duplicarVariante('Para una oferta');
    commands.setBasics({ name: 'CV adaptado' });
    expect(nombre()).toBe('CV adaptado');

    commands.activarVariante(general);
    expect(nombre(), 'la original debe seguir intacta').toBe('CV general');
  });

  it('cada versión guarda su propio tema y plantilla', () => {
    commands.setTheme('lujo');
    commands.setTemplate('sidebar');
    const primera = useCVStore.getState().activaId;

    commands.duplicarVariante('otra');
    commands.setTheme('botanico');
    commands.setTemplate('minimal');

    commands.activarVariante(primera);
    expect(doc().themeId).toBe('lujo');
    expect(doc().templateId).toBe('sidebar');
  });
});

describe('historial y variantes', () => {
  it('cambiar de versión vacía el historial', () => {
    commands.setBasics({ name: 'Algo' });
    expect(commands.historial().puedeDeshacer).toBe(true);

    commands.duplicarVariante('otra');
    // Deshacer tras el salto restauraría el documento de OTRA versión encima.
    expect(commands.historial().puedeDeshacer).toBe(false);
  });

  it('deshacer solo afecta a la versión activa', () => {
    const primera = useCVStore.getState().activaId;
    commands.duplicarVariante('segunda');
    commands.setBasics({ name: 'Cambiado en la segunda' });
    commands.undo();

    expect(nombre()).toBe('Marcos Ibáñez Herrera');
    commands.activarVariante(primera);
    expect(nombre()).toBe('Marcos Ibáñez Herrera');
  });
});

describe('bordes', () => {
  it('no se puede eliminar la última: la app nunca se queda sin documento', () => {
    commands.eliminarVariante(useCVStore.getState().activaId);
    expect(commands.variantes()).toHaveLength(1);
  });

  it('al eliminar la activa, salta a otra', () => {
    const primera = useCVStore.getState().activaId;
    commands.duplicarVariante('segunda');
    const segunda = useCVStore.getState().activaId;

    commands.eliminarVariante(segunda);
    expect(commands.variantes()).toHaveLength(1);
    expect(useCVStore.getState().activaId).toBe(primera);
  });

  it('activar una versión inexistente no rompe nada', () => {
    const antes = useCVStore.getState().activaId;
    commands.activarVariante('no-existe');
    expect(useCVStore.getState().activaId).toBe(antes);
    expect(() => doc()).not.toThrow();
  });

  it('la lista ordena por lo último tocado', async () => {
    commands.duplicarVariante('reciente');
    await new Promise((r) => setTimeout(r, 5));
    commands.setBasics({ name: 'tocada ahora' });
    expect(commands.variantes()[0]!.nombre).toBe('reciente');
  });
});
