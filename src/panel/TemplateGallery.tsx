import { useMemo } from 'react';
import { commands } from '../core/commands';
import { useCVStore, useResolvedTheme } from '../core/store';
import { headerContrast, themeToCssVars } from '../core/themes';
import { TEMPLATES } from '../cv/templates';
import type { CVData, Theme } from '../core/types';
import s from './TemplateGallery.module.css';

/**
 * Galería de plantillas con vista previa REAL.
 *
 * Cada miniatura es la plantilla de verdad, con el CV y el tema del usuario,
 * renderizada a tamaño A4 y encogida con `transform: scale()`. Antes había
 * maquetas dibujadas con gradientes: bonitas, pero mentían — no enseñaban ni
 * la tipografía, ni los colores elegidos, ni cuánto contenido cabe.
 *
 * Esto solo es posible porque las plantillas son funciones puras de
 * (`data`, `theme`) (CLAUDE.md §11): se pueden instanciar tantas veces como
 * haga falta, fuera del lienzo, sin tocar el store.
 *
 * El coste de renderizar N CVs completos se paga solo cuando el bloque
 * «Plantilla» se abre, porque los `<details>` del panel arrancan cerrados.
 */

/** Ancho de la miniatura; la escala sale de dividir por los 210mm de la hoja. */
const ANCHO_MINIATURA = 132;
const MM_A_PX = 96 / 25.4;
const ESCALA = ANCHO_MINIATURA / (210 * MM_A_PX);

function Miniatura({ data, theme, Component }: { data: CVData; theme: Theme } & {
  Component: (typeof TEMPLATES)[number]['Component'];
}) {
  const vars = useMemo(() => themeToCssVars(theme), [theme]);

  return (
    /**
     * `inert` y no `aria-hidden` + `pointer-events: none`.
     *
     * La miniatura es el CV de verdad, con sus enlaces `mailto:` y `tel:`
     * dentro de un `<button>`. Con `pointer-events: none` el ratón quedaba
     * cubierto, pero los enlaces seguían siendo enfocables: axe lo cazó por
     * partida doble (`aria-hidden-focus` y `nested-interactive`). `inert` los
     * saca del árbol de accesibilidad Y del orden de tabulación de una vez.
     */
    <span className={s.marco} ref={(el) => el && (el.inert = true)}>
      <span
        className={s.hoja}
        data-density={theme.density}
        data-header={headerContrast(theme)}
        style={{ ...vars, transform: `scale(${ESCALA})` }}
      >
        <Component data={data} theme={theme} />
      </span>
    </span>
  );
}

export function TemplateGallery() {
  const templateId = useCVStore((st) => st.doc.templateId);
  const data = useCVStore((st) => st.doc.data);
  const theme = useResolvedTheme();

  return (
    <ul className={s.galeria}>
      {TEMPLATES.map((t) => {
        const activa = t.id === templateId;
        return (
          <li key={t.id}>
            <button
              type="button"
              className={`${s.tarjeta} ${activa ? s.activa : ''}`}
              onClick={() => commands.setTemplate(t.id)}
              aria-pressed={activa}
            >
              <Miniatura data={data} theme={theme} Component={t.Component} />
              <span className={s.nombre}>{t.name}</span>
              <span className={s.descripcion}>{t.description}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
