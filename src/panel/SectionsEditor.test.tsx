import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SectionsEditor } from './SectionsEditor';
import { commands } from '../core/commands';
import { docActivo, useCVStore } from '../core/store';
import { SEED_DOCUMENT } from '../core/seed';

/**
 * El reordenado por arrastre sustituyó a los botones ↑/↓, así que la promesa
 * de accesibilidad recae entera en el asa: tiene que ser un control enfocable
 * y con nombre, o quien no use ratón se queda sin poder reordenar.
 */

beforeEach(() => {
  useCVStore.getState().replaceDoc(structuredClone(SEED_DOCUMENT));
});

describe('SectionsEditor', () => {
  it('da a cada sección un asa enfocable y con nombre', () => {
    render(<SectionsEditor />);
    const handle = screen.getByRole('button', {
      name: 'Reordenar sección Experiencia profesional',
    });
    expect(handle.tagName).toBe('BUTTON');
    // Un <button> nativo entra en el orden de tabulación sin tabIndex explícito.
    expect(handle).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('da un asa a cada item, nombrada con su rótulo', () => {
    render(<SectionsEditor />);
    expect(
      screen.getByRole('button', { name: 'Reordenar Apartamentos Torre Aurora' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reordenar Hotel Mirasierra' })).toBeInTheDocument();
  });

  it('el botón de eliminar dice QUÉ elimina, no solo «eliminar»', () => {
    render(<SectionsEditor />);
    expect(
      screen.getByRole('button', { name: 'Eliminar Apartamentos Torre Aurora' }),
    ).toBeInTheDocument();
  });

  it('refleja los cambios del store: al reordenar, cambian los rótulos', () => {
    render(<SectionsEditor />);
    const experience = docActivo(useCVStore.getState()).data.sections[0]!;
    const items = (experience as { items: { id: string }[] }).items;

    // El comando muta el store fuera de React: `act` fuerza el repintado
    // antes de leer el DOM.
    act(() => commands.reorderItem(experience.id, items[0]!.id, 1));

    const handles = screen
      .getAllByRole('button', { name: /^Reordenar (Apartamentos|Hotel|Empresas)/ })
      .map((b) => b.getAttribute('aria-label'));
    expect(handles[0]).toBe('Reordenar Hotel Mirasierra');
  });

  it('ofrece crear una sección de cada tipo', () => {
    render(<SectionsEditor />);
    for (const label of ['+ Experiencia', '+ Formación', '+ Competencias', '+ Idiomas', '+ Texto libre']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });
});
