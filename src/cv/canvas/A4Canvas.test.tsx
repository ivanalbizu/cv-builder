import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { A4Canvas } from './A4Canvas';
import { getTheme, resolveTheme } from '../../core/themes';

/**
 * El lienzo es el puente entre el TEMA (datos) y el CSS de la plantilla:
 * su trabajo es inyectar las custom properties y decidir el contraste de
 * cabecera. Si esto se rompe, todas las plantillas salen mal a la vez.
 */

const page = (container: HTMLElement) => container.querySelector('.cv-page') as HTMLElement;

describe('A4Canvas', () => {
  it('inyecta los colores del tema como custom properties en la hoja', () => {
    const theme = getTheme('clasico');
    const { container } = render(
      <A4Canvas theme={theme} zoom={1}>
        <p>contenido</p>
      </A4Canvas>,
    );
    expect(page(container).style.getPropertyValue('--primary')).toBe('#123a51');
    expect(page(container).style.getPropertyValue('--accent')).toBe('#b58a3e');
  });

  it('no toca :root — el cromo de la app no debe re-tematizarse', () => {
    render(
      <A4Canvas theme={getTheme('lujo')} zoom={1}>
        <p>contenido</p>
      </A4Canvas>,
    );
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  });

  it('con un principal oscuro deja la cabecera en blanco', () => {
    const { container } = render(
      <A4Canvas theme={getTheme('clasico')} zoom={1}>
        <p>contenido</p>
      </A4Canvas>,
    );
    expect(page(container).dataset.header).toBe('dark');
  });

  it('con un principal claro cambia a tinta oscura (auto-contraste)', () => {
    const theme = resolveTheme(getTheme('clasico'), { primary: '#ffd400' });
    const { container } = render(
      <A4Canvas theme={theme} zoom={1}>
        <p>contenido</p>
      </A4Canvas>,
    );
    expect(page(container).dataset.header).toBe('light');
  });

  it('expone la densidad para que el CSS ajuste tamaños y márgenes', () => {
    const theme = resolveTheme(getTheme('clasico'), { density: 'comfy' });
    const { container } = render(
      <A4Canvas theme={theme} zoom={1}>
        <p>contenido</p>
      </A4Canvas>,
    );
    expect(page(container).dataset.density).toBe('comfy');
  });

  it('dibuja una guía de corte por cada página extra', () => {
    const { container } = render(
      <A4Canvas theme={getTheme('clasico')} zoom={1} pageHeightPx={1000} pages={3}>
        <p>contenido</p>
      </A4Canvas>,
    );
    const guides = container.querySelectorAll('.cv-page-guide');
    expect(guides).toHaveLength(2);
    expect((guides[0] as HTMLElement).style.top).toBe('1000px');
  });

  it('el zoom vive fuera de la hoja: la maqueta impresa no se toca', () => {
    const { container } = render(
      <A4Canvas theme={getTheme('clasico')} zoom={0.5}>
        <p>contenido</p>
      </A4Canvas>,
    );
    expect((container.querySelector('.cv-zoom') as HTMLElement).style.transform).toBe('scale(0.5)');
    expect(page(container).style.transform).toBe('');
  });
});
