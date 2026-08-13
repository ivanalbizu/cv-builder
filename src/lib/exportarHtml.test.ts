import { describe, expect, it } from 'vitest';
import { nombreArchivo } from './exportarHtml';

/**
 * El nombre del archivo acaba en el sistema de ficheros de quien lo reciba, y
 * en un adjunto de correo: tiene que sobrevivir a ambos.
 */
describe('nombreArchivo', () => {
  it('quita acentos y espacios', () => {
    expect(nombreArchivo('Marcos Ibáñez Herrera')).toBe('marcos-ibanez-herrera.html');
  });

  it('aguanta signos y mayúsculas raras', () => {
    expect(nombreArchivo('  José-María  O’Connor (CV)  ')).toBe('jose-maria-o-connor-cv.html');
  });

  it('no deja guiones sueltos en los extremos', () => {
    expect(nombreArchivo('¡Ana!')).toBe('ana.html');
  });

  it('cae en un nombre genérico si no queda nada utilizable', () => {
    expect(nombreArchivo('')).toBe('cv.html');
    expect(nombreArchivo('«»')).toBe('cv.html');
  });
});
