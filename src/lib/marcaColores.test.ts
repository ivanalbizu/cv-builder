import { describe, expect, it } from 'vitest';
import { construirPregunta, dominio, extraerColores } from './marcaColores';

/**
 * Lo delicado aquí es el parseo: un modelo casi nunca responde con el formato
 * exacto que se le pidió, y obligar al usuario a limpiar el texto a mano sería
 * peor que aceptar un párrafo entero.
 */

describe('construirPregunta', () => {
  it('incluye la URL y pide un formato concreto', () => {
    const p = construirPregunta('https://www.melia.com/es');
    expect(p).toContain('https://www.melia.com/es');
    expect(p).toContain('principal: #xxxxxx');
    expect(p).toContain('acento: #xxxxxx');
  });

  it('pide que avise en vez de inventar si no puede navegar', () => {
    // Sin esto, un modelo sin navegación devuelve colores plausibles y falsos.
    expect(construirPregunta('x.com')).toMatch(/en vez de adivinar/);
  });
});

describe('extraerColores', () => {
  it('lee la respuesta con el formato pedido', () => {
    expect(extraerColores('principal: #004b8d\nacento: #c8102e')).toEqual({
      primary: '#004b8d',
      accent: '#c8102e',
    });
  });

  it('aguanta que el modelo se explaye', () => {
    const respuesta = `¡Claro! He revisado la web y estos son sus colores:

    - **principal**: #1a3a6b — el azul de la cabecera y los botones.
    - **acento**: #E8A33D, un dorado que usan para destacar.

    Espero que te sirva.`;
    expect(extraerColores(respuesta)).toEqual({ primary: '#1a3a6b', accent: '#e8a33d' });
  });

  it('acepta las etiquetas en inglés', () => {
    expect(extraerColores('primary: #112233\naccent: #445566')).toEqual({
      primary: '#112233',
      accent: '#445566',
    });
  });

  it('sin etiquetas, coge los dos primeros por orden', () => {
    expect(extraerColores('Usan #ff0000 y también #00ff00 en la web.')).toEqual({
      primary: '#ff0000',
      accent: '#00ff00',
    });
  });

  it('expande la forma corta de tres dígitos', () => {
    expect(extraerColores('#abc y #def').primary).toBe('#aabbcc');
  });

  it('no repite el mismo color en los dos huecos', () => {
    const r = extraerColores('El azul #004b8d aparece por todas partes: #004b8d, #004b8d.');
    expect(r.primary).toBe('#004b8d');
    expect(r.accent).toBeUndefined();
  });

  it('devuelve vacío si el modelo dice que no puede', () => {
    expect(extraerColores('Lo siento, no puedo navegar por internet.')).toEqual({
      primary: undefined,
      accent: undefined,
    });
  });

  it('ignora un hex de más si vienen etiquetados los dos que importan', () => {
    const r = extraerColores('paleta: #111111\nprincipal: #222222\nacento: #333333');
    expect(r).toEqual({ primary: '#222222', accent: '#333333' });
  });
});

describe('dominio', () => {
  it('extrae el host aunque falte el protocolo', () => {
    expect(dominio('www.melia.com/es')).toBe('www.melia.com');
    expect(dominio('https://melia.com')).toBe('melia.com');
  });

  it('devuelve null si no hay forma de interpretarlo', () => {
    expect(dominio('   ')).toBeNull();
  });
});
