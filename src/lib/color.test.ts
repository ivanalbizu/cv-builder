import { describe, expect, it } from 'vitest';
import { isLight, normalizeHex, perceivedBrightness, shade, tint } from './color';

describe('normalizeHex', () => {
  it('expande la forma corta', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('rechaza lo que no es hex', () => {
    expect(normalizeHex('rojo')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
  });
});

describe('tint / shade', () => {
  it('tint(1) es blanco y tint(0) no cambia nada', () => {
    expect(tint('#123a51', 1)).toBe('#ffffff');
    expect(tint('#123a51', 0)).toBe('#123a51');
  });

  it('shade(1) es negro', () => {
    expect(shade('#123a51', 1)).toBe('#000000');
  });
});

describe('auto-contraste de cabecera', () => {
  it('usa el umbral 150 heredado del CV de referencia', () => {
    // El azul del tema clásico es oscuro: la cabecera va en blanco.
    expect(isLight('#123a51')).toBe(false);
    // Un amarillo de marca es claro: hay que pasar a tinta oscura.
    expect(isLight('#ffd400')).toBe(true);
  });

  it('el brillo percibido pondera el verde por encima del azul', () => {
    expect(perceivedBrightness('#00ff00')).toBeGreaterThan(perceivedBrightness('#0000ff'));
  });
});
