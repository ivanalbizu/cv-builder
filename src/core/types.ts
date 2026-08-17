/**
 * Modelo de datos del CV.
 *
 * Regla de oro del proyecto (ver CLAUDE.md §1): CONTENIDO ↔ TEMA ↔ PLANTILLA
 * son tres cosas separadas. Este fichero define solo el CONTENIDO (`CVData`)
 * y la descripción declarativa del TEMA (`Theme`). Ninguna plantilla debe
 * añadir campos aquí para resolver un problema de maquetación.
 */

export type DataURL = string;

/** Identificador estable de un elemento editable (item, sección, enlace). */
export type Id = string;

// ---------------------------------------------------------------------------
// Básicos / cabecera
// ---------------------------------------------------------------------------

export type ContactKind = 'location' | 'phone' | 'email' | 'link';

export interface ContactLink {
  id: Id;
  kind: ContactKind;
  label: string;
  /** `tel:`, `mailto:` o `https://`. Vacío = solo texto (p. ej. la ciudad). */
  url?: string;
}

/** Cómo se encaja la foto en su marco. Ver CLAUDE.md §2 «Imágenes». */
export interface PhotoOptions {
  /** `cover` llena el círculo; `contain` muestra el retrato completo. */
  fit: 'cover' | 'contain';
  shape: 'circle' | 'rect';
  /** Relleno para PNG con transparencia real (evita el cuadriculado). */
  background: string;
  /** Valor CSS de `object-position`, p. ej. `center` o `50% 30%`. */
  position: string;
}

export interface Basics {
  name: string;
  title: string;
  summary?: string;
  /**
   * Rótulo de la sección del perfil.
   *
   * Es un DATO y no texto fijo, como el de cualquier otra sección: era la única
   * cuyo título no se podía tocar. Así se puede escribir «Sobre mí», o
   * «Professional profile» en una variante en inglés. Vacío = sin rótulo.
   */
  summaryTitle?: string;
  photo?: DataURL | null;
  photoOptions: PhotoOptions;
  contact: ContactLink[];
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

export type SectionType = 'experience' | 'education' | 'skills' | 'languages' | 'custom';

/** Iconos disponibles para el título de sección (ver `cv/icons.tsx`). */
export type IconName =
  | 'user'
  | 'briefcase'
  | 'graduation'
  | 'globe'
  | 'monitor'
  | 'star'
  | 'key'
  | 'location'
  | 'phone'
  | 'mail'
  | 'link';

export interface ExperienceItem {
  id: Id;
  org: string;
  role: string;
  location?: string;
  start: string;
  end?: string;
  /** Si es `true` la plantilla ignora `end` y marca el puesto como actual. */
  current?: boolean;
  /** En la variante «titulares», solo la frase líder de cada punto. */
  bullets: string[];
  /** Etiquetas por puesto (p. ej. el software usado en esa empresa). */
  tags: string[];
  /** Categoría del establecimiento: 0–5. */
  rating?: number;
  ratingIcon?: 'star' | 'key';
}

export interface EducationItem {
  id: Id;
  title: string;
  org?: string;
  year?: string;
}

export interface SkillItem {
  id: Id;
  name: string;
  /** Nota corta opcional («avanzado», «diario»…). */
  note?: string;
}

export interface LanguageItem {
  id: Id;
  name: string;
  /** Código de 2 letras para la insignia redonda (EN, FR…). */
  code?: string;
  level: string;
  note?: string;
}

interface SectionBase {
  id: Id;
  title: string;
  icon: IconName;
}

export type Section =
  | (SectionBase & { type: 'experience'; items: ExperienceItem[] })
  | (SectionBase & { type: 'education'; items: EducationItem[] })
  | (SectionBase & { type: 'skills'; items: SkillItem[] })
  | (SectionBase & { type: 'languages'; items: LanguageItem[] })
  | (SectionBase & { type: 'custom'; body: string });

/** Cualquier sección que tenga lista de items (todas menos `custom`). */
export type ListSection = Extract<Section, { items: unknown[] }>;

export type SectionItem = ExperienceItem | EducationItem | SkillItem | LanguageItem;

export interface CVData {
  basics: Basics;
  /** El orden del array **es** el orden de render. */
  sections: Section[];
}

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

export interface ThemeColors {
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  surface: string;
  ink: string;
  inkSoft: string;
  rule: string;
}

export interface ThemeFonts {
  display: string;
  serif: string;
  sans: string;
}

export type Density = 'comfy' | 'compact';

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  density: Density;
}

/** Ajustes del usuario que ganan sobre el tema activo (acento de marca). */
export interface ThemeOverrides {
  primary?: string;
  accent?: string;
  density?: Density;
  fonts?: Partial<ThemeFonts>;
}

// ---------------------------------------------------------------------------
// Plantilla
// ---------------------------------------------------------------------------

export interface TemplateMeta {
  id: string;
  name: string;
  layout: 'single' | 'sidebar';
  description: string;
}

/**
 * Contrato de toda plantilla: función pura de (contenido, tema) → JSX.
 * Sin estado propio, sin acceso al store: así se puede renderizar en tests
 * y en servidor (Playwright) exactamente igual que en el navegador.
 */
export interface TemplateProps {
  data: CVData;
  theme: Theme;
}

// ---------------------------------------------------------------------------
// Documento completo (lo que se persiste y se exporta a JSON)
// ---------------------------------------------------------------------------

export interface CVDocument {
  version: 1;
  data: CVData;
  themeId: string;
  overrides: ThemeOverrides;
  templateId: string;
}
