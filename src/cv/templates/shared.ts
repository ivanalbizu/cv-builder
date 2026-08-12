import type { ContactKind, ExperienceItem, Section } from '../../core/types';

/**
 * Piezas compartidas por todas las plantillas.
 *
 * Aquí solo va lógica de PRESENTACIÓN que no depende del layout: si una
 * plantilla necesitara formatear las fechas de otra manera, esto no es el
 * sitio. Nada de estilos ni de JSX: cada plantilla maqueta lo suyo.
 */

export const CONTACT_ICON: Record<ContactKind, 'location' | 'phone' | 'mail' | 'link'> = {
  location: 'location',
  phone: 'phone',
  email: 'mail',
  link: 'link',
};

/** `current` manda sobre `end`: un puesto actual no muestra fecha de fin. */
export function formatDates(item: ExperienceItem): string {
  const end = item.current ? 'Actualidad' : item.end;
  return [item.start, end].filter(Boolean).join(' — ');
}

/** Secciones cortas, aptas para una columna estrecha. */
export function isNarrowSection(section: Section): boolean {
  return section.type === 'languages' || section.type === 'skills';
}
