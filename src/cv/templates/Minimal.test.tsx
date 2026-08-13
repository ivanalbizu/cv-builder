import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Minimal } from './Minimal';
import { SEED_DATA } from '../../core/seed';
import { getTheme } from '../../core/themes';
import type { CVData } from '../../core/types';

const theme = getTheme('clasico');
const renderCV = (data: CVData) => render(<Minimal data={data} theme={theme} />);

describe('Minimal', () => {
  it('pinta identidad y contacto sin bloques de color', () => {
    renderCV(SEED_DATA);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Marcos Ibáñez Herrera');
    expect(screen.getByRole('link', { name: 'marcos.ibanez@example.com' })).toBeInTheDocument();
  });

  it('rotula todas las secciones con el mismo esquema, sea cual sea su tipo', () => {
    // Es lo que la distingue de las otras dos: aquí el layout no depende del
    // tipo de sección, así que una sección nueva encaja sin tocar la plantilla.
    const data = structuredClone(SEED_DATA);
    data.sections.push({
      id: 's_custom',
      type: 'custom',
      title: 'Disponibilidad',
      icon: 'star',
      body: 'Incorporación inmediata.',
    });

    renderCV(data);
    for (const titulo of ['Experiencia profesional', 'Formación', 'Idiomas', 'Disponibilidad']) {
      expect(screen.getByRole('heading', { name: titulo, level: 2 })).toBeInTheDocument();
    }
    expect(screen.getByText('Incorporación inmediata.')).toBeInTheDocument();
  });

  it('pone los idiomas en línea, no en tarjetas', () => {
    renderCV(SEED_DATA);
    // Formato compacto «Inglés · B2 (First Certificate)».
    expect(screen.getByText(/First Certificate/)).toBeInTheDocument();
  });

  it('comparte el formateo de fechas con las demás plantillas', () => {
    const data = structuredClone(SEED_DATA);
    const section = data.sections[0]!;
    if (section.type === 'experience') section.items[0]!.current = true;
    renderCV(data);
    expect(screen.getByText('Nov 2018 — Actualidad')).toBeInTheDocument();
  });

  it('oculta el perfil si no hay resumen', () => {
    const data = structuredClone(SEED_DATA);
    data.basics.summary = '';
    const { container } = renderCV(data);
    expect(container.textContent).not.toContain('Recepcionista y auditor de noche');
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
