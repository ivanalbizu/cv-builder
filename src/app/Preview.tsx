import { useCallback, useEffect, useRef } from 'react';
import { A4Canvas } from '../cv/canvas/A4Canvas';
import { usePageMetrics } from '../cv/canvas/usePageMetrics';
import { getTemplate } from '../cv/templates';
import { commands } from '../core/commands';
import { useCVStore, useResolvedTheme } from '../core/store';
import styles from './Preview.module.css';

const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5];

export function Preview() {
  const doc = useCVStore((s) => s.doc);
  const zoom = useCVStore((s) => s.zoom);
  const theme = useResolvedTheme();
  const pageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Re-medir cuando cambie cualquier cosa que altere el alto de la hoja.
  const metrics = usePageMetrics(pageRef, [doc, theme]);
  const { Component } = getTemplate(doc.templateId);

  /** Ajusta el zoom para que la hoja quepa a lo ancho del área disponible. */
  const fitToWidth = useCallback(() => {
    const viewport = viewportRef.current?.querySelector<HTMLElement>('.cv-viewport');
    const page = pageRef.current;
    if (!viewport || !page) return;
    const available = viewport.clientWidth - 48; // el padding del viewport
    const pageWidth = page.getBoundingClientRect().width / (zoom || 1);
    if (pageWidth > 0) commands.setZoom(Math.min(1, available / pageWidth));
  }, [zoom]);

  /**
   * Publica el recuento de páginas en el elemento raíz.
   *
   * Va en `<html>` y no en la hoja porque el pie de página vive en `@page`, que
   * es contexto de página y solo hereda custom properties del raíz. `print.css`
   * lo lee para numerar únicamente cuando hay más de una página.
   */
  useEffect(() => {
    document.documentElement.dataset.pages = String(metrics.pages);
  }, [metrics.pages]);

  // Encajar al abrir, para no aterrizar en una hoja cortada.
  useEffect(() => {
    fitToWidth();
    // Solo al montar: después manda el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap} ref={viewportRef}>
      <div className={`${styles.toolbar} toolbar`}>
        <div className={styles.zoomGroup}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => commands.setZoom(prevStep(zoom))}
            aria-label="Alejar"
          >
            −
          </button>
          <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => commands.setZoom(nextStep(zoom))}
            aria-label="Acercar"
          >
            +
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fitToWidth}>
            Ajustar
          </button>
        </div>

        <PageBadge pages={metrics.pages} tight={metrics.tight} />

        <button className="btn btn-primary" onClick={() => commands.exportPDF()}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <A4Canvas
        ref={pageRef}
        theme={theme}
        zoom={zoom}
        layoutHeightPx={metrics.contentHeightPx}
        pageHeightPx={metrics.pageHeightPx}
        pages={metrics.pages}
      >
        <Component data={doc.data} theme={theme} />
      </A4Canvas>

      <p className={`${styles.hint} toolbar`}>
        En el diálogo de impresión: <strong>A4</strong>, márgenes{' '}
        <strong>«Ninguno»</strong> y activa <strong>«Gráficos de fondo»</strong>.
      </p>
    </div>
  );
}

function PageBadge({ pages, tight }: { pages: number; tight: boolean }) {
  if (pages > 1) {
    return (
      <span className={`${styles.badge} ${styles.badgeWarn}`}>
        {pages} páginas · el contenido se sale de la primera
      </span>
    );
  }
  if (tight) {
    return <span className={`${styles.badge} ${styles.badgeWarn}`}>1 página, al límite</span>;
  }
  return <span className={`${styles.badge} ${styles.badgeOk}`}>1 página</span>;
}

function nextStep(zoom: number): number {
  return ZOOM_STEPS.find((z) => z > zoom + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]!;
}

function prevStep(zoom: number): number {
  return [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001) ?? ZOOM_STEPS[0]!;
}
