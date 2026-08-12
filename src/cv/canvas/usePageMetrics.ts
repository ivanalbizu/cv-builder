import { useEffect, useState } from 'react';

export interface PageMetrics {
  /** Alto de una página A4 en píxeles CSS, medido del DOM (no calculado). */
  pageHeightPx: number;
  /** Alto real del contenido de la hoja. */
  contentHeightPx: number;
  /** Nº de páginas que ocuparía al imprimir. */
  pages: number;
  /** El contenido se sale de la última página por poco (<8mm de sobra). */
  tight: boolean;
}

const MM_PER_PAGE = 297;

/** Mide 1mm en píxeles CSS creando una regla efímera fuera de pantalla. */
function measureMillimetre(doc: Document): number {
  const ruler = doc.createElement('div');
  ruler.style.cssText = 'position:absolute;visibility:hidden;height:100mm;pointer-events:none';
  doc.body.appendChild(ruler);
  const px = ruler.getBoundingClientRect().height / 100;
  ruler.remove();
  return px || 3.7795; // 96dpi por defecto si el navegador no colabora
}

/**
 * Detección de desbordamiento de página (CLAUDE.md §5.4).
 *
 * Se mide el alto real del contenido contra el alto de A4 tomado del propio
 * DOM: así el aviso «se sale de una página» coincide con lo que hará Chrome
 * al imprimir, sin hardcodear conversiones mm→px.
 */
export function usePageMetrics(ref: React.RefObject<HTMLElement>, deps: unknown[] = []): PageMetrics {
  const [metrics, setMetrics] = useState<PageMetrics>({
    pageHeightPx: 0,
    contentHeightPx: 0,
    pages: 1,
    tight: false,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const mm = measureMillimetre(node.ownerDocument);
      const pageHeightPx = mm * MM_PER_PAGE;
      // `scrollHeight` incluye lo que rebosa aunque la hoja tenga overflow
      // oculto; es justo lo que necesitamos para contar páginas.
      const contentHeightPx = node.scrollHeight;
      const pages = Math.max(1, Math.ceil(contentHeightPx / pageHeightPx - 0.002));
      const remainder = pages * pageHeightPx - contentHeightPx;
      setMetrics({ pageHeightPx, contentHeightPx, pages, tight: remainder < mm * 8 });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // Las fuentes cambian el alto al terminar de cargar: volver a medir.
    node.ownerDocument.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);

  return metrics;
}
