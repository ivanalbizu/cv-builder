import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commands } from './commands';
import { docActivo, useCVStore } from './store';
import { SEED_DOCUMENT } from './seed';
import type { ExperienceItem } from './types';

/**
 * Historial de deshacer/rehacer.
 *
 * Lo delicado no es apilar documentos, es la GRANULARIDAD: sin fusionar las
 * ediciones seguidas, escribir «Recepcionista» dejaría trece pasos y deshacer
 * sería inservible; fusionando de más, una acción estructural se perdería
 * dentro del paso anterior.
 */

const doc = () => docActivo(useCVStore.getState());
const nombre = () => doc().data.basics.name;
const experiencia = () => SEED_DOCUMENT.data.sections[0]!.id;

beforeEach(() => {
  useCVStore.getState().replaceDoc(structuredClone(SEED_DOCUMENT));
  useCVStore.getState().olvidarHistorial();
  vi.useRealTimers();
});

describe('lo básico', () => {
  it('sin nada que deshacer, deshacer no hace nada', () => {
    const antes = doc();
    commands.undo();
    expect(doc()).toBe(antes);
    expect(commands.historial()).toEqual({ puedeDeshacer: false, puedeRehacer: false });
  });

  it('deshace un cambio y lo rehace', () => {
    commands.setBasics({ title: 'Jefe de recepción' });
    expect(doc().data.basics.title).toBe('Jefe de recepción');

    commands.undo();
    expect(doc().data.basics.title).toBe('Recepcionista de Hotel');

    commands.redo();
    expect(doc().data.basics.title).toBe('Jefe de recepción');
  });

  it('informa de lo que hay disponible', () => {
    expect(commands.historial().puedeDeshacer).toBe(false);
    commands.addSection('skills');
    expect(commands.historial()).toEqual({ puedeDeshacer: true, puedeRehacer: false });
    commands.undo();
    expect(commands.historial()).toEqual({ puedeDeshacer: false, puedeRehacer: true });
  });

  it('una edición nueva descarta lo que había para rehacer', () => {
    commands.addSection('skills');
    commands.undo();
    expect(commands.historial().puedeRehacer).toBe(true);

    commands.addSection('languages');
    expect(commands.historial().puedeRehacer).toBe(false);
  });

  it('no apila pasos cuando la edición no cambia nada', () => {
    // Elegir en un desplegable el valor que ya estaba puesto.
    commands.setTemplate(doc().templateId);
    expect(commands.historial().puedeDeshacer).toBe(false);
  });
});

describe('granularidad', () => {
  it('teclear seguido en un campo es UN solo paso', () => {
    for (const texto of ['J', 'Je', 'Jef', 'Jefe']) commands.setBasics({ title: texto });

    commands.undo();
    expect(doc().data.basics.title, 'debería volver al valor original de una vez').toBe(
      'Recepcionista de Hotel',
    );
  });

  it('cambiar de campo corta la fusión', () => {
    commands.setBasics({ title: 'Jefe' });
    commands.setBasics({ name: 'Ana' });

    commands.undo();
    expect(nombre()).toBe('Marcos Ibáñez Herrera');
    expect(doc().data.basics.title, 'el puesto no debe deshacerse todavía').toBe('Jefe');
  });

  it('editar otro item corta la fusión aunque sea el mismo campo', () => {
    const items = (doc().data.sections[0] as { items: ExperienceItem[] }).items;
    commands.updateItem(experiencia(), items[0]!.id, { role: 'A' });
    commands.updateItem(experiencia(), items[1]!.id, { role: 'B' });

    commands.undo();
    const despues = (doc().data.sections[0] as { items: ExperienceItem[] }).items;
    expect(despues[1]!.role).not.toBe('B');
    expect(despues[0]!.role, 'el primero no debe verse afectado').toBe('A');
  });

  it('pasada la ventana, seguir escribiendo es un paso nuevo', () => {
    vi.useFakeTimers();
    commands.setBasics({ title: 'Jefe' });
    vi.advanceTimersByTime(1500);
    commands.setBasics({ title: 'Jefe de recepción' });

    commands.undo();
    expect(doc().data.basics.title).toBe('Jefe');
  });

  it('las acciones estructurales nunca se funden entre sí', () => {
    commands.addSection('skills');
    commands.addSection('languages');
    const total = doc().data.sections.length;

    commands.undo();
    expect(doc().data.sections).toHaveLength(total - 1);
    commands.undo();
    expect(doc().data.sections).toHaveLength(total - 2);
  });
});

describe('acciones destructivas', () => {
  it('cargar un JSON encima del trabajo se puede deshacer', () => {
    commands.setBasics({ name: 'Trabajo en curso' });
    commands.loadJSON({
      basics: {
        name: 'Otro CV',
        title: '',
        photoOptions: { fit: 'cover', shape: 'circle', background: '#fff', position: 'center' },
        contact: [],
      },
      sections: [],
    });
    expect(nombre()).toBe('Otro CV');

    commands.undo();
    expect(nombre(), 'lo importado debe poder revertirse').toBe('Trabajo en curso');
  });

  it('«empezar de cero» también', () => {
    commands.reset();
    expect(doc().data.sections).toHaveLength(1);

    commands.undo();
    expect(nombre()).toBe('Marcos Ibáñez Herrera');
  });

  it('borrar una sección se recupera con todo su contenido', () => {
    const antes = (doc().data.sections[0] as { items: ExperienceItem[] }).items.length;
    commands.removeSection(experiencia());
    commands.undo();

    const seccion = doc().data.sections.find((s) => s.id === experiencia());
    expect((seccion as { items: ExperienceItem[] }).items).toHaveLength(antes);
  });
});

describe('memoria', () => {
  it('el historial tiene tope y descarta lo más antiguo', () => {
    for (let i = 0; i < 80; i += 1) commands.addSection('skills');
    expect(useCVStore.getState().pasado.length).toBeLessThanOrEqual(60);
  });

  it('las versiones comparten la foto en vez de copiarla', () => {
    // Es lo que hace barato guardar el documento entero por paso: la foto en
    // base64 es el único dato grande y es la MISMA cadena en cada entrada.
    const foto = doc().data.basics.photo;
    commands.setBasics({ title: 'Otro puesto' });
    const anterior = useCVStore.getState().pasado.at(-1)!;
    expect(anterior.data.basics.photo).toBe(foto);
  });
});
