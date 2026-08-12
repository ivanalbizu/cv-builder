import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SingleColumn } from './SingleColumn';
import { SEED_DATA } from '../../core/seed';
import { getTheme } from '../../core/themes';
import type { CVData } from '../../core/types';

/**
 * La plantilla es pura: (data, theme) → JSX. Estos tests la ejercitan sin
 * store ni panel, que es justo lo que la hace renderizable en servidor.
 */

const theme = getTheme('clasico');
const renderCV = (data: CVData) => render(<SingleColumn data={data} theme={theme} />);

describe('SingleColumn', () => {
  it('pinta la cabecera con nombre, puesto y contacto', () => {
    renderCV(SEED_DATA);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Marcos Ibáñez Herrera');
    expect(screen.getByText('Recepcionista de Hotel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'marcos.ibanez@example.com' })).toHaveAttribute(
      'href',
      'mailto:marcos.ibanez@example.com',
    );
  });

  it('pinta un item por puesto, con sus fechas y su software', () => {
    renderCV(SEED_DATA);
    expect(screen.getByText('Apartamentos Torre Aurora')).toBeInTheDocument();
    expect(screen.getByText('Nov 2018 — Jul 2026')).toBeInTheDocument();
    expect(screen.getByText(/Prestige, SAP, PMS/)).toBeInTheDocument();
  });

  it('marca «Actualidad» cuando el puesto es el actual, ignorando la fecha de fin', () => {
    const data = structuredClone(SEED_DATA);
    const section = data.sections[0]!;
    if (section.type === 'experience') {
      section.items[0]!.current = true;
      section.items[0]!.end = 'Jul 2026';
    }
    renderCV(data);
    expect(screen.getByText('Nov 2018 — Actualidad')).toBeInTheDocument();
  });

  it('oculta el perfil profesional si no hay resumen', () => {
    const data = structuredClone(SEED_DATA);
    data.basics.summary = '';
    renderCV(data);
    expect(screen.queryByText('Perfil profesional')).not.toBeInTheDocument();
  });

  it('describe la categoría del hotel de forma accesible', () => {
    renderCV(SEED_DATA);
    expect(screen.getByRole('img', { name: '3 llaves' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: '3 estrellas' }).length).toBeGreaterThan(0);
  });

  it('agrupa formación e idiomas en la rejilla final', () => {
    const { container } = renderCV(SEED_DATA);
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).not.toBeNull();
    expect(within(grid as HTMLElement).getByText('Formación')).toBeInTheDocument();
    expect(within(grid as HTMLElement).getByText('Idiomas')).toBeInTheDocument();
  });

  it('aguanta un CV vacío sin romperse', () => {
    const empty: CVData = {
      basics: {
        name: '',
        title: '',
        photoOptions: { fit: 'cover', shape: 'circle', background: '#fff', position: 'center' },
        contact: [],
      },
      sections: [],
    };
    expect(() => renderCV(empty)).not.toThrow();
  });
});
