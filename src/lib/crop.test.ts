import { describe, expect, it } from 'vitest';
import { cropCanvasSize } from './crop';

describe('cropCanvasSize', () => {
  it('no amplía: un recorte pequeño se queda como está', () => {
    expect(cropCanvasSize({ x: 0, y: 0, width: 200, height: 150 })).toEqual({
      width: 200,
      height: 150,
    });
  });

  it('limita el lado mayor a 900px para no disparar el peso del JSON', () => {
    expect(cropCanvasSize({ x: 0, y: 0, width: 4000, height: 3000 })).toEqual({
      width: 900,
      height: 675,
    });
  });

  it('conserva la proporción al reducir', () => {
    const { width, height } = cropCanvasSize({ x: 0, y: 0, width: 3000, height: 1000 });
    expect(width / height).toBeCloseTo(3, 1);
  });

  it('nunca devuelve 0 aunque el recorte sea degenerado', () => {
    const size = cropCanvasSize({ x: 0, y: 0, width: 0.2, height: 0.2 });
    expect(size.width).toBeGreaterThanOrEqual(1);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });
});
