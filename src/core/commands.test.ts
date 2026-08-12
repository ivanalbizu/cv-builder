import { beforeEach, describe, expect, it } from 'vitest';
import { commands } from './commands';
import { useCVStore } from './store';
import { SEED_DOCUMENT } from './seed';
import { getTheme, resolveTheme } from './themes';
import type { ExperienceItem, LanguageItem } from './types';

/**
 * La capa de comandos es el contrato que comparten la UI y el agente (WebMCP),
 * así que se testea sola, sin React de por medio. Si algo se rompe aquí, se
 * rompe en los dos sitios.
 */

const doc = () => useCVStore.getState().doc;

beforeEach(() => {
  useCVStore.getState().replaceDoc(structuredClone(SEED_DOCUMENT));
});

describe('básicos', () => {
  it('parchea solo los campos indicados', () => {
    commands.setBasics({ title: 'Jefe de recepción' });
    expect(doc().data.basics.title).toBe('Jefe de recepción');
    expect(doc().data.basics.name).toBe('Marcos Ibáñez Herrera');
  });

  it('quita la foto con null', () => {
    commands.setPhoto(null);
    expect(doc().data.basics.photo).toBeNull();
  });

  it('añade, actualiza y elimina contactos', () => {
    const id = commands.addContact({ kind: 'link', label: 'LinkedIn', url: 'https://x.test' });
    expect(doc().data.basics.contact.at(-1)?.label).toBe('LinkedIn');

    commands.updateContact(id, { label: 'Mi LinkedIn' });
    expect(doc().data.basics.contact.at(-1)?.label).toBe('Mi LinkedIn');

    commands.removeContact(id);
    expect(doc().data.basics.contact.some((c) => c.id === id)).toBe(false);
  });
});

describe('secciones', () => {
  it('crea la sección con título e icono por defecto según el tipo', () => {
    const id = commands.addSection('skills');
    const section = doc().data.sections.find((s) => s.id === id);
    expect(section).toMatchObject({ type: 'skills', title: 'Competencias', icon: 'monitor' });
  });

  it('reordena y no se sale del array', () => {
    const [first, second] = doc().data.sections;
    commands.reorderSection(first!.id, 1);
    expect(doc().data.sections[0]!.id).toBe(second!.id);

    commands.reorderSection(second!.id, 99);
    expect(doc().data.sections.at(-1)!.id).toBe(second!.id);
  });

  it('elimina la sección con sus items', () => {
    const id = doc().data.sections[0]!.id;
    commands.removeSection(id);
    expect(doc().data.sections.some((s) => s.id === id)).toBe(false);
  });
});

describe('items', () => {
  const experienceId = () => SEED_DOCUMENT.data.sections[0]!.id;

  it('crea el item vacío que corresponde al tipo de la sección', () => {
    const id = commands.addItem(experienceId());
    const section = doc().data.sections.find((s) => s.id === experienceId());
    const item = section?.type === 'experience' ? section.items.find((i) => i.id === id) : null;
    expect(item).toMatchObject({ org: '', role: '', bullets: [], tags: [] });
  });

  it('crea el item con valores iniciales', () => {
    const id = commands.addItem(experienceId(), { org: 'Hotel Nuevo', role: 'Recepcionista' });
    const section = doc().data.sections[0]!;
    const item = (section as { items: ExperienceItem[] }).items.find((i) => i.id === id);
    expect(item?.org).toBe('Hotel Nuevo');
  });

  it('devuelve null si la sección no existe', () => {
    expect(commands.addItem('no-existe')).toBeNull();
  });

  it('actualiza y elimina por id', () => {
    const section = doc().data.sections[0]!;
    const target = (section as { items: ExperienceItem[] }).items[0]!;

    commands.updateItem(section.id, target.id, { role: 'Jefe de turno' });
    expect((doc().data.sections[0] as { items: ExperienceItem[] }).items[0]!.role).toBe(
      'Jefe de turno',
    );

    commands.removeItem(section.id, target.id);
    expect(
      (doc().data.sections[0] as { items: ExperienceItem[] }).items.some((i) => i.id === target.id),
    ).toBe(false);
  });

  it('reordena items dentro de su sección', () => {
    const section = doc().data.sections[0]!;
    const items = (section as { items: ExperienceItem[] }).items;
    const [first, second] = [items[0]!, items[1]!];

    commands.reorderItem(section.id, first.id, 1);
    expect((doc().data.sections[0] as { items: ExperienceItem[] }).items[0]!.id).toBe(second.id);
  });

  it('no rompe el documento con ids inexistentes', () => {
    const before = structuredClone(doc());
    commands.updateItem('nope', 'nope', { org: 'x' });
    commands.removeItem('nope', 'nope');
    commands.reorderItem('nope', 'nope', 3);
    expect(doc()).toEqual(before);
  });

  it('mantiene el tipo de item correcto en secciones de idiomas', () => {
    const languages = doc().data.sections.find((s) => s.type === 'languages')!;
    const id = commands.addItem(languages.id, { name: 'Alemán', level: 'A2' });
    const item = (doc().data.sections.find((s) => s.id === languages.id) as {
      items: LanguageItem[];
    }).items.find((i) => i.id === id);
    expect(item).toMatchObject({ name: 'Alemán', level: 'A2' });
  });
});

describe('tema', () => {
  it('cambia de tema y descarta los colores personalizados', () => {
    commands.setPrimary('#ff0000');
    commands.setTheme('lujo');
    expect(doc().themeId).toBe('lujo');
    expect(doc().overrides.primary).toBeUndefined();
  });

  it('ignora un tema desconocido y se queda en el primero', () => {
    commands.setTheme('no-existe');
    expect(doc().themeId).toBe('clasico');
  });

  it('deriva los tonos «soft» del color elegido', () => {
    commands.setPrimary('#004b8d');
    commands.setAccent('#c8102e');
    const theme = resolveTheme(getTheme(doc().themeId), doc().overrides);
    expect(theme.colors.primary).toBe('#004b8d');
    // El «soft» es una versión aclarada, no el valor original.
    expect(theme.colors.primarySoft).not.toBe('#004b8d');
    expect(theme.colors.accentSoft).not.toBe('#c8102e');
  });

  it('resetColors vuelve al tema sin tocar la densidad', () => {
    commands.setDensity('comfy');
    commands.setAccent('#123456');
    commands.resetColors();
    expect(doc().overrides.accent).toBeUndefined();
    expect(doc().overrides.density).toBe('comfy');
  });
});

describe('documento', () => {
  it('toJSON devuelve una copia, no una referencia', () => {
    const copy = commands.toJSON();
    copy.data.basics.name = 'Otro';
    expect(doc().data.basics.name).toBe('Marcos Ibáñez Herrera');
  });

  it('loadJSON acepta un CVData suelto y lo envuelve', () => {
    commands.loadJSON({
      basics: {
        name: 'Ana',
        title: 'Diseñadora',
        photoOptions: { fit: 'cover', shape: 'circle', background: '#fff', position: 'center' },
        contact: [],
      },
      sections: [],
    });
    expect(doc().data.basics.name).toBe('Ana');
    expect(doc().version).toBe(1);
    expect(doc().themeId).toBe('clasico');
  });

  it('reset deja un documento vacío pero usable', () => {
    commands.reset();
    expect(doc().data.sections).toHaveLength(1);
    expect(doc().data.basics.photo).toBeNull();
  });
});
