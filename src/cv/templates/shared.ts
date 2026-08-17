import type { Basics, ContactKind, ExperienceItem, Section } from '../../core/types';

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

/**
 * Rótulo efectivo del perfil.
 *
 * El respaldo existe por los documentos guardados antes de que el campo fuera
 * editable: sin él, un CV de hace meses perdería su título al abrirlo. Una
 * cadena vacía es una elección deliberada —quitar el rótulo—, así que se
 * respeta y no se rellena.
 */
export function tituloPerfil(basics: Basics): string {
  return basics.summaryTitle ?? 'Perfil profesional';
}
