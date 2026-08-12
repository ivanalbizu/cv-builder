import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';
import { SEED_DATA } from '../../core/seed';
import { getTheme } from '../../core/themes';
import type { CVData } from '../../core/types';

const theme = getTheme('clasico');
const renderCV = (data: CVData) => render(<Sidebar data={data} theme={theme} />);

const aside = (c: HTMLElement) => c.querySelector('aside') as HTMLElement;
const main = (c: HTMLElement) => c.querySelector('main') as HTMLElement;

describe('Sidebar', () => {
  it('manda las secciones cortas a la barra y las largas a la columna ancha', () => {
    const { container } = renderCV(SEED_DATA);
    expect(within(aside(container)).getByText('Idiomas')).toBeInTheDocument();
    expect(within(main(container)).getByText('Experiencia profesional')).toBeInTheDocument();
    expect(within(main(container)).getByText('Formación')).toBeInTheDocument();
  });

  it('pone identidad, foto y contacto en la barra', () => {
    const { container } = renderCV(SEED_DATA);
    const bar = aside(container);
    expect(within(bar).getByRole('heading', { level: 1 })).toHaveTextContent('Marcos Ibáñez Herrera');
    expect(within(bar).getByRole('img', { name: 'Marcos Ibáñez Herrera' })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: 'marcos.ibanez@example.com' })).toBeInTheDocument();
  });

  it('coloca las competencias en la barra, no en la columna ancha', () => {
    const data = structuredClone(SEED_DATA);
    data.sections.push({
      id: 's_skills',
      type: 'skills',
      title: 'Competencias',
      icon: 'monitor',
      items: [{ id: 'sk1', name: 'Upselling' }],
    });
    const { container } = renderCV(data);
    expect(within(aside(container)).getByText('Upselling')).toBeInTheDocument();
    expect(within(main(container)).queryByText('Upselling')).not.toBeInTheDocument();
  });

  it('comparte el formateo de fechas con las demás plantillas', () => {
    const data = structuredClone(SEED_DATA);
    const section = data.sections[0]!;
    if (section.type === 'experience') section.items[0]!.current = true;
    renderCV(data);
    expect(screen.getByText('Nov 2018 — Actualidad')).toBeInTheDocument();
  });

  it('no pinta la barra de contacto si no hay contactos', () => {
    const data = structuredClone(SEED_DATA);
    data.basics.contact = [];
    const { container } = renderCV(data);
    expect(within(aside(container)).queryByText('Contacto')).not.toBeInTheDocument();
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
