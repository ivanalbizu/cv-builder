import { newId } from '../lib/id';
import { SEED_DOCUMENT, emptyDocument } from './seed';
import { useCVStore } from './store';
import { DEFAULT_THEME_ID, getTheme } from './themes';
import type {
  Basics,
  CVData,
  CVDocument,
  ContactLink,
  Density,
  EducationItem,
  ExperienceItem,
  Id,
  LanguageItem,
  ListSection,
  Section,
  SectionItem,
  SectionType,
  SkillItem,
  ThemeFonts,
} from './types';

/**
 * Capa de comandos (headless core) — CLAUDE.md §5.3.
 *
 * Es **la única** forma de mutar el CV. La UI la llama y el agente (WebMCP,
 * fase 4) llamará exactamente a lo mismo: por eso cada comando es autónomo,
 * valida sus argumentos y no depende de ningún componente de React.
 *
 * Convenciones:
 *  - Devuelven el `id` creado cuando crean algo, para poder encadenar.
 *  - Ignoran silenciosamente los ids inexistentes (el agente puede equivocarse
 *    sin romper el documento); las lecturas están en `getCV`/`toJSON`.
 */

const store = () => useCVStore.getState();
const update = (recipe: (draft: CVDocument) => void) => store().update(recipe);

/**
 * Escritura CONTINUA: los cambios seguidos con la misma clave se funden en un
 * solo paso de deshacer.
 *
 * Es lo que distingue teclear —donde volver atrás letra a letra sería inútil—
 * de las acciones estructurales, que siempre merecen su propio paso. La clave
 * incluye el id de lo que se edita, para que pasar de un campo a otro corte la
 * fusión aunque se escriba deprisa.
 */
const editar = (clave: string, recipe: (draft: CVDocument) => void) =>
  store().update(recipe, { fusionar: clave });

// --- helpers ---------------------------------------------------------------

function findSection(doc: CVDocument, sectionId: Id): Section | undefined {
  return doc.data.sections.find((s) => s.id === sectionId);
}

/** Secciones con lista de items (todas menos `custom`). */
function findListSection(doc: CVDocument, sectionId: Id): ListSection | undefined {
  const section = findSection(doc, sectionId);
  return section && section.type !== 'custom' ? section : undefined;
}

function move<T>(arr: T[], from: number, to: number): void {
  if (from < 0 || from >= arr.length) return;
  const clamped = Math.min(arr.length - 1, Math.max(0, to));
  const [item] = arr.splice(from, 1);
  arr.splice(clamped, 0, item as T);
}

const DEFAULT_TITLES: Record<SectionType, string> = {
  experience: 'Experiencia profesional',
  education: 'Formación',
  skills: 'Competencias',
  languages: 'Idiomas',
  custom: 'Nueva sección',
};

const DEFAULT_ICONS: Record<SectionType, Section['icon']> = {
  experience: 'briefcase',
  education: 'graduation',
  skills: 'monitor',
  languages: 'globe',
  custom: 'star',
};

/** Item vacío del tipo que corresponda a la sección. */
function blankItem(type: Exclude<SectionType, 'custom'>, id: Id) {
  switch (type) {
    case 'experience':
      return { id, org: '', role: '', start: '', bullets: [], tags: [] } satisfies ExperienceItem;
    case 'education':
      return { id, title: '' } satisfies EducationItem;
    case 'skills':
      return { id, name: '' } satisfies SkillItem;
    case 'languages':
      return { id, name: '', level: '' } satisfies LanguageItem;
  }
}

// --- comandos --------------------------------------------------------------

export const commands = {
  // ---- contenido: básicos -------------------------------------------------

  setBasics(patch: Partial<Omit<Basics, 'contact' | 'photoOptions'>>): void {
    editar(`basics:${Object.keys(patch).join(',')}`, (doc) => {
      Object.assign(doc.data.basics, patch);
    });
  },

  setPhoto(photo: string | null): void {
    update((doc) => {
      doc.data.basics.photo = photo;
    });
  },

  setPhotoOptions(patch: Partial<Basics['photoOptions']>): void {
    editar(`photo:${Object.keys(patch).join(',')}`, (doc) => {
      Object.assign(doc.data.basics.photoOptions, patch);
    });
  },

  addContact(link: Omit<ContactLink, 'id'>): Id {
    const id = newId('c');
    update((doc) => {
      doc.data.basics.contact.push({ ...link, id });
    });
    return id;
  },

  updateContact(id: Id, patch: Partial<Omit<ContactLink, 'id'>>): void {
    editar(`contact:${id}:${Object.keys(patch).join(',')}`, (doc) => {
      const link = doc.data.basics.contact.find((c) => c.id === id);
      if (link) Object.assign(link, patch);
    });
  },

  removeContact(id: Id): void {
    update((doc) => {
      doc.data.basics.contact = doc.data.basics.contact.filter((c) => c.id !== id);
    });
  },

  // ---- contenido: secciones ----------------------------------------------

  addSection(type: SectionType, title?: string): Id {
    const id = newId('s');
    update((doc) => {
      const base = { id, title: title ?? DEFAULT_TITLES[type], icon: DEFAULT_ICONS[type] };
      doc.data.sections.push(
        type === 'custom' ? { ...base, type, body: '' } : { ...base, type, items: [] },
      );
    });
    return id;
  },

  updateSection(id: Id, patch: { title?: string; icon?: Section['icon'] }): void {
    editar(`section:${id}:${Object.keys(patch).join(',')}`, (doc) => {
      const section = findSection(doc, id);
      if (section) Object.assign(section, patch);
    });
  },

  removeSection(id: Id): void {
    update((doc) => {
      doc.data.sections = doc.data.sections.filter((s) => s.id !== id);
    });
  },

  reorderSection(id: Id, toIndex: number): void {
    update((doc) => {
      move(
        doc.data.sections,
        doc.data.sections.findIndex((s) => s.id === id),
        toIndex,
      );
    });
  },

  // ---- contenido: items ---------------------------------------------------

  /** Añade un item (vacío o con valores) a una sección con lista. */
  addItem(sectionId: Id, values?: Record<string, unknown>): Id | null {
    const section = findListSection(store().doc, sectionId);
    if (!section) return null;
    const id = newId(section.type[0]);
    update((doc) => {
      const target = findListSection(doc, sectionId);
      if (!target) return;
      // El tipo de item lo determina la sección, así que el cast es seguro:
      // `blankItem` devuelve justo la variante que `target.items` acepta.
      const item = { ...blankItem(target.type, id), ...values };
      (target.items as unknown[]).push(item);
    });
    return id;
  },

  updateItem(sectionId: Id, itemId: Id, patch: Record<string, unknown>): void {
    editar(`item:${itemId}:${Object.keys(patch).join(',')}`, (doc) => {
      const section = findListSection(doc, sectionId);
      const item = section?.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, patch);
    });
  },

  removeItem(sectionId: Id, itemId: Id): void {
    update((doc) => {
      const section = findListSection(doc, sectionId);
      if (!section) return;
      section.items = section.items.filter((i) => i.id !== itemId) as typeof section.items;
    });
  },

  reorderItem(sectionId: Id, itemId: Id, toIndex: number): void {
    update((doc) => {
      const section = findListSection(doc, sectionId);
      if (!section) return;
      // `items` es una unión de arrays; reordenar no cambia el tipo de los
      // elementos, así que tratarlos como `SectionItem[]` es seguro.
      const items = section.items as SectionItem[];
      move(
        items,
        items.findIndex((i) => i.id === itemId),
        toIndex,
      );
    });
  },

  setCustomBody(sectionId: Id, body: string): void {
    editar(`custom:${sectionId}`, (doc) => {
      const section = findSection(doc, sectionId);
      if (section?.type === 'custom') section.body = body;
    });
  },

  // ---- plantilla y tema ---------------------------------------------------

  setTemplate(id: string): void {
    update((doc) => {
      doc.templateId = id;
    });
  },

  /**
   * Cambiar de tema descarta color Y tipografía: el tema manda de nuevo.
   *
   * Las fuentes se descartan por el mismo motivo que los colores. Desde que
   * cada tema trae su propia pareja tipográfica, conservar una elección previa
   * dejaba el tema a medio aplicar y su vista previa dejaba de decir la verdad.
   */
  setTheme(themeId: string): void {
    update((doc) => {
      doc.themeId = getTheme(themeId).id;
      doc.overrides = { ...doc.overrides, primary: undefined, accent: undefined, fonts: undefined };
    });
  },

  setPrimary(hex: string): void {
    editar('color:primary', (doc) => {
      doc.overrides.primary = hex;
    });
  },

  setAccent(hex: string): void {
    editar('color:accent', (doc) => {
      doc.overrides.accent = hex;
    });
  },

  /** Vuelve a los colores del tema activo, conservando fuentes y densidad. */
  resetColors(): void {
    update((doc) => {
      doc.overrides.primary = undefined;
      doc.overrides.accent = undefined;
    });
  },

  setFont(slot: keyof ThemeFonts, family: string): void {
    update((doc) => {
      doc.overrides.fonts = { ...doc.overrides.fonts, [slot]: family };
    });
  },

  setDensity(density: Density): void {
    update((doc) => {
      doc.overrides.density = density;
    });
  },

  // ---- documento ----------------------------------------------------------

  getCV(): CVData {
    return store().doc.data;
  },

  toJSON(): CVDocument {
    // Copia profunda: el documento del store es inmutable (immer) y no
    // queremos que quien lo reciba pueda alterarlo por referencia.
    return structuredClone(store().doc);
  },

  loadJSON(input: CVDocument | CVData): void {
    const doc: CVDocument =
      'version' in input
        ? input
        : {
            version: 1,
            data: input,
            themeId: DEFAULT_THEME_ID,
            overrides: {},
            templateId: 'single-column',
          };
    store().replaceDoc(structuredClone(doc));
  },

  loadSeed(): void {
    store().replaceDoc(structuredClone(SEED_DOCUMENT));
  },

  reset(): void {
    store().replaceDoc(emptyDocument());
  },

  setZoom(zoom: number): void {
    store().setZoom(zoom);
  },

  // ---- historial ----------------------------------------------------------

  /** Deshace el último cambio. Sin nada que deshacer, no hace nada. */
  undo(): void {
    store().undo();
  },

  redo(): void {
    store().redo();
  },

  /** Qué hay disponible; lo usan los botones y el agente para decidir. */
  historial(): { puedeDeshacer: boolean; puedeRehacer: boolean } {
    const { pasado, futuro } = store();
    return { puedeDeshacer: pasado.length > 0, puedeRehacer: futuro.length > 0 };
  },

  /**
   * Exporta a PDF por la impresión nativa del navegador (CLAUDE.md §2).
   * El `@media print` de `cv/print.css` deja solo la hoja; el usuario elige
   * A4 · márgenes «Ninguno» · «Gráficos de fondo».
   */
  exportPDF(): void {
    if (typeof window !== 'undefined') window.print();
  },
} as const;

export type CVCommands = typeof commands;
