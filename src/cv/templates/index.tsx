import type { ComponentType } from 'react';
import type { TemplateMeta, TemplateProps } from '../../core/types';
import { SingleColumn } from './SingleColumn';
import { Sidebar } from './Sidebar';
import { Minimal } from './Minimal';

/**
 * Registro de plantillas. Añadir una plantilla = añadir una entrada aquí;
 * el panel y el lienzo se enteran solos.
 */
export interface TemplateEntry extends TemplateMeta {
  Component: ComponentType<TemplateProps>;
}

export const TEMPLATES: TemplateEntry[] = [
  {
    id: 'single-column',
    name: 'Una columna',
    layout: 'single',
    description: 'Cabecera a todo lo ancho y timeline de experiencia. Validada a 1 página A4.',
    Component: SingleColumn,
  },
  {
    id: 'sidebar',
    name: 'Barra lateral',
    layout: 'sidebar',
    description: 'Columna estrecha con foto, contacto e idiomas; experiencia a la derecha.',
    Component: Sidebar,
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    layout: 'single',
    description: 'Solo tipografía y filetes. Para sectores sobrios o impresión en blanco y negro.',
    Component: Minimal,
  },
];

export const DEFAULT_TEMPLATE_ID = 'single-column';

export function getTemplate(id: string): TemplateEntry {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}
