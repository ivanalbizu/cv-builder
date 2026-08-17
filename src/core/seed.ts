import avatarEjemplo from '../assets/avatar-ejemplo.png?inline';
import { DEFAULT_THEME_ID } from './themes';
import type { CVData, CVDocument } from './types';

/**
 * Semilla de ejemplo: un CV **ficticio** de recepcionista de hotel.
 *
 * Persona, empresas y centros de estudios son inventados; el email usa el
 * dominio reservado `example.com` (RFC 2606) y el teléfono es un placeholder.
 * Este repo es público: no metas aquí datos de una persona real. Para trabajar
 * con un CV de verdad, usa «Importar JSON» en el panel y guarda ese archivo
 * fuera del repositorio.
 *
 * Las longitudes de los textos están calcadas del CV real que inspiró el
 * proyecto: la maqueta está validada a 1 página con estas medidas, así que si
 * alargas mucho un bloque, revisa el contador de páginas de la vista previa.
 *
 * La foto es un PNG **RGBA con transparencia real** (no JPEG): así `contain`
 * sobre fondo blanco rellena limpio, sin el cuadriculado aplanado que nos
 * mordió en el proyecto de referencia (CLAUDE.md §2 «Imágenes»).
 */
export const SEED_DATA: CVData = {
  basics: {
    name: 'Marcos Ibáñez Herrera',
    title: 'Recepcionista de Hotel',
    summaryTitle: 'Perfil profesional',
    summary:
      'Recepcionista y auditor de noche con más de 10 años de experiencia en hoteles de 3 y 4 ' +
      'estrellas, hoteles boutique y apartamentos turísticos. Facilidad de integración y ' +
      'colaboración en equipos de trabajo, reservas en todos los canales (OTAs incluidas), ' +
      'servicios de Upselling y Cross-Selling, con plena autonomía y clara orientación al ' +
      'huésped. Trayectoria previa de 17 años en cocina y sala. Inglés (B2) y francés (DELF), ' +
      'con titulación oficial.',
    photo: avatarEjemplo,
    photoOptions: {
      fit: 'contain',
      shape: 'circle',
      background: '#ffffff',
      position: 'center',
    },
    contact: [
      { id: 'c_loc', kind: 'location', label: 'Cádiz' },
      { id: 'c_tel', kind: 'phone', label: '600 12 34 56', url: 'tel:+34600123456' },
      {
        id: 'c_mail',
        kind: 'email',
        label: 'marcos.ibanez@example.com',
        url: 'mailto:marcos.ibanez@example.com',
      },
    ],
  },
  sections: [
    {
      id: 's_exp',
      type: 'experience',
      title: 'Experiencia profesional',
      icon: 'briefcase',
      items: [
        {
          id: 'e_aurora',
          org: 'Apartamentos Torre Aurora',
          role: 'Recepcionista',
          location: 'Sevilla',
          start: 'Nov 2018',
          end: 'Jul 2026',
          rating: 3,
          ratingIcon: 'key',
          bullets: [
            'Gestión integral de la recepción',
            'Gestión de remesas',
            'Parte diario de pisos',
            'Atención al huésped e incidencias',
          ],
          tags: ['Prestige', 'SAP', 'PMS'],
        },
        {
          id: 'e_mirasierra',
          org: 'Hotel Mirasierra',
          role: 'Auditor de noche',
          location: 'Sevilla',
          start: 'Mar 2017',
          end: 'Oct 2018',
          rating: 3,
          ratingIcon: 'star',
          bullets: [
            'Auditoría de noche y cierre diario',
            'Facturación y gestión de reservas',
            'Reputación online y apoyo a la operativa',
          ],
          tags: ['OfiHotel'],
        },
        {
          id: 'e_costamarina',
          org: 'Hotel Costa Marina',
          role: 'Auditor de noche',
          location: 'Puerto Banús',
          start: 'Abr 2016',
          end: 'Nov 2016',
          rating: 4,
          ratingIcon: 'star',
          bullets: [
            'Auditoría de noche en un gran hotel de apartamentos',
            'Servicio de conserjería, upselling y cross-selling',
          ],
          tags: ['Hotelwin (K-Root)'],
        },
        {
          id: 'e_alcazaba',
          org: 'Hotel Boutique Alcazaba',
          role: 'Recepcionista',
          location: 'Sevilla',
          start: 'Jun 2014',
          end: 'Ene 2016',
          rating: 3,
          ratingIcon: 'star',
          bullets: [
            'Recepción en turnos rotativos (hotel boutique)',
            'Ciclo completo de estancia y reservas',
            'Monitor de Segway – Actividades Turísticas',
          ],
          tags: ['Masteryield'],
        },
        {
          id: 'e_anterior',
          org: 'Empresas hoteleras y de restauración',
          role: 'Cocinero y camarero',
          start: 'Sep 1998',
          end: 'Dic 2013',
          bullets: [
            'Más de 17 años como cocinero y camarero en restaurantes, hoteles y hospitales, ' +
              'con un conocimiento profundo de la operativa de sala, cocina y atención al cliente.',
          ],
          tags: [],
        },
      ],
    },
    {
      id: 's_form',
      type: 'education',
      title: 'Formación',
      icon: 'graduation',
      items: [
        {
          id: 'f_recep',
          title: 'Curso de Recepcionista de Hotel',
          org: 'Academia Zenit, Sevilla',
          year: '2014',
        },
        {
          id: 'f_audio',
          title: 'Técnico Superior en Realización y Producción en Medios Audiovisuales',
          org: 'IES Vega del Sur, Tomares',
          year: '1994',
        },
      ],
    },
    {
      id: 's_idiomas',
      type: 'languages',
      title: 'Idiomas',
      icon: 'globe',
      items: [
        { id: 'l_en', name: 'Inglés', code: 'EN', level: 'B2', note: 'First Certificate' },
        { id: 'l_fr', name: 'Francés', code: 'FR', level: 'B2', note: 'DELF' },
      ],
    },
  ],
};

export const SEED_DOCUMENT: CVDocument = {
  version: 1,
  data: SEED_DATA,
  themeId: DEFAULT_THEME_ID,
  overrides: {},
  templateId: 'single-column',
};

/** Documento vacío, para «Empezar de cero» desde el panel. */
export function emptyDocument(): CVDocument {
  return {
    version: 1,
    data: {
      basics: {
        name: 'Tu nombre',
        title: 'Puesto al que optas',
        summary: '',
        photo: null,
        photoOptions: { fit: 'cover', shape: 'circle', background: '#ffffff', position: 'center' },
        contact: [],
      },
      sections: [
        {
          id: 'blank_exp',
          type: 'experience',
          title: 'Experiencia profesional',
          icon: 'briefcase',
          items: [],
        },
      ],
    },
    themeId: DEFAULT_THEME_ID,
    overrides: {},
    templateId: 'single-column',
  };
}
