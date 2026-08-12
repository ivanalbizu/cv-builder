import { forwardRef, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Theme } from '../../core/types';
import { headerContrast, themeToCssVars } from '../../core/themes';
import './canvas.css';

interface A4CanvasProps {
  theme: Theme;
  zoom: number;
  children: ReactNode;
  /** Alto real de la hoja sin escalar; sirve para reservar sitio al escalar. */
  layoutHeightPx?: number;
  /** Alto de una página A4 en px, para dibujar las guías de corte. */
  pageHeightPx?: number;
  pages?: number;
}

/**
 * La hoja A4.
 *
 * Es el nodo que se imprime tal cual: lo que se ve aquí es exactamente lo que
 * sale en el PDF. Por eso el zoom vive en envoltorios aparte y las variables
 * del tema se inyectan en la hoja, no en `:root` — así el cromo de la app no
 * se re-tematiza sin querer.
 *
 * `.cv-zoom-box` existe porque `transform: scale()` **no** reserva espacio en
 * el layout: sin él, el scroll del viewport se quedaría corto o sobraría.
 */
export const A4Canvas = forwardRef<HTMLDivElement, A4CanvasProps>(function A4Canvas(
  { theme, zoom, children, layoutHeightPx = 0, pageHeightPx = 0, pages = 1 },
  ref,
) {
  const pageStyle = useMemo(() => themeToCssVars(theme) as CSSProperties, [theme]);

  const guides =
    pageHeightPx > 0 && pages > 1 ? Array.from({ length: pages - 1 }, (_, i) => i + 1) : [];

  return (
    <div className="cv-viewport">
      <div
        className="cv-zoom-box"
        style={{
          width: `calc(210mm * ${zoom})`,
          height: layoutHeightPx ? layoutHeightPx * zoom : undefined,
        }}
      >
        <div className="cv-zoom" style={{ transform: `scale(${zoom})` }}>
          <div className="cv-page-wrap">
            <div
              ref={ref}
              className="cv-page"
              data-density={theme.density}
              data-header={headerContrast(theme)}
              style={pageStyle}
            >
              {children}
            </div>
            {guides.map((n) => (
              <div
                key={n}
                className="cv-page-guide"
                data-label={`pág. ${n + 1}`}
                style={{ top: pageHeightPx * n }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
