import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findModelContext, installWebMCP, type ModelContextLike } from './webmcp';
import { TOOLS } from './tools';
import { useCVStore } from '../core/store';
import { SEED_DOCUMENT } from '../core/seed';

/**
 * El adaptador se testea con un doble de la API del navegador porque el
 * original solo existe en Chrome con el origin trial activo. Lo que se
 * comprueba aquí es el MAPEO (catálogo → registerTool → content); que la API
 * real acepta lo que le damos lo verifica `e2e/webmcp.spec.ts` contra un Chrome
 * de verdad.
 */

function fakeModelContext() {
  const tools: Parameters<ModelContextLike['registerTool']>[0][] = [];
  return {
    tools,
    registerTool: vi.fn((tool: Parameters<ModelContextLike['registerTool']>[0]) => {
      tools.push(tool);
    }),
  };
}

beforeEach(() => {
  useCVStore.getState().replaceDoc(structuredClone(SEED_DOCUMENT));
});

describe('findModelContext', () => {
  const api = { registerTool() {} };

  it('prefiere document, que es la ubicación vigente de la spec', () => {
    const otro = { registerTool() {} };
    expect(findModelContext({ document: { modelContext: api }, navigator: { modelContext: otro } })).toBe(api);
  });

  it('acepta navigator como respaldo: sigue viva durante el origin trial', () => {
    expect(findModelContext({ document: {}, navigator: { modelContext: api } })).toBe(api);
  });

  it('devuelve null si el navegador no la trae', () => {
    expect(findModelContext({ document: {}, navigator: {} })).toBeNull();
  });

  it('devuelve null si hay algo con ese nombre pero no sirve', () => {
    // Defensa contra una versión futura con otra forma: mejor no registrar
    // nada que reventar al arrancar la app.
    expect(findModelContext({ document: { modelContext: { registerTool: 'no soy función' } } })).toBeNull();
  });
});

describe('installWebMCP', () => {
  it('sin API disponible no instala nada, y no es un error', () => {
    expect(installWebMCP(null)).toEqual({ installed: false, registered: [] });
  });

  it('registra el catálogo completo', () => {
    const mc = fakeModelContext();
    const res = installWebMCP(mc);

    expect(res.installed).toBe(true);
    expect(res.registered).toEqual(TOOLS.map((t) => t.name));
    expect(mc.registerTool).toHaveBeenCalledTimes(TOOLS.length);
  });

  it('cada herramienta va con nombre, descripción y JSON Schema', () => {
    const mc = fakeModelContext();
    installWebMCP(mc);

    const addExperience = mc.tools.find((t) => t.name === 'addExperience')!;
    expect(addExperience.description).toMatch(/titulares/i);
    expect(addExperience.inputSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
    });
    expect((addExperience.inputSchema as { required: string[] }).required).toContain('org');
  });

  it('execute ejecuta de verdad el comando y devuelve content', async () => {
    const mc = fakeModelContext();
    installWebMCP(mc);

    const setBasics = mc.tools.find((t) => t.name === 'setBasics')!;
    const out = await setBasics.execute({ title: 'Jefe de recepción' });

    expect(out.content[0]!.type).toBe('text');
    expect(useCVStore.getState().doc.data.basics.title).toBe('Jefe de recepción');
  });

  it('un error del agente vuelve como texto, no como excepción', async () => {
    const mc = fakeModelContext();
    installWebMCP(mc);

    const setTheme = mc.tools.find((t) => t.name === 'setTheme')!;
    const out = await setTheme.execute({ themeId: 'neon' });

    // Lanzar cortaría la conversación por un argumento mal escrito, que es
    // justo el fallo más probable de un agente.
    expect(out.content[0]!.text).toMatch(/^Error: .*debe ser uno de/);
    expect(useCVStore.getState().doc.themeId).toBe('clasico');
  });

  it('getCV devuelve el CV serializado en el content', async () => {
    const mc = fakeModelContext();
    installWebMCP(mc);

    const getCV = mc.tools.find((t) => t.name === 'getCV')!;
    const out = await getCV.execute({});
    const data = JSON.parse(out.content[0]!.text) as { basics: { name: string } };

    expect(data.basics.name).toBe('Marcos Ibáñez Herrera');
  });

  it('tolera que el agente llame sin argumentos', async () => {
    const mc = fakeModelContext();
    installWebMCP(mc);

    const getCV = mc.tools.find((t) => t.name === 'getCV')!;
    await expect(getCV.execute(undefined)).resolves.toBeTruthy();
  });
});
