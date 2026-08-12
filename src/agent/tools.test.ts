import { beforeEach, describe, expect, it } from 'vitest';
import { TOOLS, callTool, toolCatalog } from './tools';
import { useCVStore } from '../core/store';
import { SEED_DOCUMENT } from '../core/seed';
import type { CVData, ExperienceItem } from '../core/types';

/**
 * El catálogo es el contrato que verá el agente. Lo que se prueba aquí no es
 * que los comandos funcionen (eso ya está en commands.test.ts), sino que
 * **argumentos malos no llegan a tocar el documento**: un agente se equivoca a
 * menudo, y la diferencia entre un error legible y un CV corrupto está justo
 * en esta capa.
 */

const doc = () => useCVStore.getState().doc;
const experienceId = () => SEED_DOCUMENT.data.sections[0]!.id;

beforeEach(() => {
  useCVStore.getState().replaceDoc(structuredClone(SEED_DOCUMENT));
});

describe('catálogo', () => {
  it('publica nombre, descripción y JSON Schema de cada herramienta', () => {
    for (const tool of toolCatalog()) {
      expect(tool.name, 'nombre vacío').toBeTruthy();
      expect(tool.description.length, `descripción pobre en ${tool.name}`).toBeGreaterThan(30);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('no tiene nombres repetidos', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marca como obligatorios solo los campos sin `optional`', () => {
    const addExperience = toolCatalog().find((t) => t.name === 'addExperience')!;
    expect(addExperience.inputSchema.required).toEqual(['sectionId', 'org', 'role', 'start']);
  });

  it('enumera en el esquema las plantillas y temas que existen de verdad', () => {
    const setTheme = toolCatalog().find((t) => t.name === 'setTheme')!;
    expect(setTheme.inputSchema.properties.themeId!.enum).toContain('lujo');
    expect(setTheme.inputSchema.properties.themeId!.enum).not.toContain('inventado');
  });
});

describe('callTool: errores', () => {
  it('no lanza con una herramienta inexistente; explica cuáles hay', () => {
    const res = callTool('noExiste');
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain('getCV');
  });

  it('rechaza si falta un campo obligatorio, sin tocar el documento', () => {
    const before = structuredClone(doc());
    const res = callTool('addExperience', { sectionId: experienceId(), org: 'Hotel X' });

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/falta el campo obligatorio «role»/);
    expect(doc()).toEqual(before);
  });

  it('rechaza un campo inventado en vez de ignorarlo en silencio', () => {
    const res = callTool('setBasics', { name: 'Ana', nombre: 'Ana' });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain('campo desconocido');
  });

  it('rechaza tipos equivocados', () => {
    const res = callTool('reorderItem', {
      sectionId: experienceId(),
      itemId: 'x',
      toIndex: 'primero',
    });
    expect(res.ok === false && res.error).toMatch(/«toIndex» debe ser un número entero/);
  });

  it('rechaza un valor fuera del enum', () => {
    const res = callTool('setTheme', { themeId: 'neon' });
    expect(res.ok === false && res.error).toMatch(/debe ser uno de/);
    expect(doc().themeId).toBe('clasico');
  });

  it('rechaza un color que no es hex de 6 dígitos', () => {
    expect(callTool('setBrandColors', { primary: 'azul' }).ok).toBe(false);
    expect(callTool('setBrandColors', { primary: '#abc' }).ok).toBe(false);
    expect(callTool('setBrandColors', { primary: '#004b8d' }).ok).toBe(true);
  });

  it('convierte en error el fallo del comando, no en excepción', () => {
    const res = callTool('addExperience', {
      sectionId: 'no-existe',
      org: 'X',
      role: 'Y',
      start: '2020',
    });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain('no existe la sección');
  });

  it('respeta los límites numéricos declarados en el esquema', () => {
    const args = { sectionId: experienceId(), org: 'X', role: 'Y', start: '2020', rating: 9 };
    expect(callTool('addExperience', args).ok).toBe(false);
    expect(callTool('addExperience', { ...args, rating: 4 }).ok).toBe(true);
  });
});

describe('callTool: camino feliz', () => {
  it('getCV devuelve el CV con los ids que necesitan las demás herramientas', () => {
    const res = callTool('getCV');
    expect(res.ok).toBe(true);
    const data = (res as { result: CVData }).result;
    expect(data.sections[0]!.id).toBe(experienceId());
  });

  it('addExperience devuelve el id del puesto creado', () => {
    const res = callTool('addExperience', {
      sectionId: experienceId(),
      org: 'Hotel Nuevo',
      role: 'Jefe de recepción',
      start: 'Ene 2027',
      current: true,
      bullets: ['Dirección del equipo de recepción'],
    });

    expect(res.ok).toBe(true);
    const { itemId } = (res as { result: { itemId: string } }).result;
    const items = (doc().data.sections[0] as { items: ExperienceItem[] }).items;
    expect(items.find((i) => i.id === itemId)).toMatchObject({
      org: 'Hotel Nuevo',
      current: true,
      bullets: ['Dirección del equipo de recepción'],
    });
  });

  it('setBullets reescribe solo las viñetas', () => {
    const items = (doc().data.sections[0] as { items: ExperienceItem[] }).items;
    const target = items[0]!;

    callTool('setBullets', {
      sectionId: experienceId(),
      itemId: target.id,
      bullets: ['Titular nuevo'],
    });

    const after = (doc().data.sections[0] as { items: ExperienceItem[] }).items[0]!;
    expect(after.bullets).toEqual(['Titular nuevo']);
    expect(after.org).toBe(target.org);
  });

  it('setBrandColors aplica principal y acento sobre el tema actual', () => {
    callTool('setBrandColors', { primary: '#004b8d', accent: '#c8102e' });
    expect(doc().overrides).toMatchObject({ primary: '#004b8d', accent: '#c8102e' });
    expect(doc().themeId).toBe('clasico');
  });

  it('getLayout informa de lo que hay disponible', () => {
    const res = callTool('getLayout');
    const layout = (res as { result: { temasDisponibles: string[]; templateId: string } }).result;
    expect(layout.templateId).toBe('single-column');
    expect(layout.temasDisponibles).toContain('boutique');
  });

  it('las herramientas sin argumentos se pueden llamar sin pasar nada', () => {
    expect(callTool('getCV').ok).toBe(true);
  });
});
