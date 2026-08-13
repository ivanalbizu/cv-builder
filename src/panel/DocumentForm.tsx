import { useRef, useState } from 'react';
import { commands } from '../core/commands';
import { construirHtml, nombreArchivo } from '../lib/exportarHtml';
import type { CVDocument } from '../core/types';
import { Actions, Panel } from './ui';
import s from './DocumentForm.module.css';

/**
 * Guardar / cargar. El autoguardado en localStorage lo hace el middleware
 * `persist` del store; aquí van solo las acciones explícitas del usuario.
 */
export function DocumentForm() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  function descargar(contenido: BlobPart, nombre: string, tipo: string) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportarHtml() {
    setExportando(true);
    setError(null);
    try {
      const nombre = commands.getCV().basics.name;
      // El recuento de páginas lo publica la vista previa en <html data-pages>;
      // se reutiliza para que el archivo lleve o no pie de página igual que aquí.
      const pages = Number(document.documentElement.dataset.pages ?? '1');
      const html = await construirHtml({ nombre, pages });
      descargar(html, nombreArchivo(nombre), 'text/html;charset=utf-8');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar el HTML.');
    } finally {
      setExportando(false);
    }
  }

  function exportJSON() {
    const doc = commands.toJSON();
    const slug = doc.data.basics.name.trim().toLowerCase().replace(/\s+/g, '-') || 'cv';
    descargar(JSON.stringify(doc, null, 2), `${slug}.cv.json`, 'application/json');
  }

  async function importJSON(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const parsed = JSON.parse(await file.text()) as CVDocument;
      if (!parsed?.data?.basics || !Array.isArray(parsed.data.sections)) {
        throw new Error('El archivo no tiene la forma de un documento de CV Builder.');
      }
      commands.loadJSON(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  }

  return (
    <Panel title="Documento">
      <Actions>
        <button
          className="btn btn-sm"
          onClick={() => void exportarHtml()}
          disabled={exportando}
        >
          {exportando ? 'Preparando…' : 'Exportar HTML'}
        </button>
        <button className="btn btn-sm" onClick={exportJSON}>
          Exportar JSON
        </button>
        <button className="btn btn-sm" onClick={() => fileInput.current?.click()}>
          Importar JSON
        </button>
      </Actions>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void importJSON(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <Actions>
        <button
          className="btn btn-sm"
          onClick={() => {
            if (confirm('Se sustituirá el CV actual por el de ejemplo. ¿Continuar?')) {
              commands.loadSeed();
            }
          }}
        >
          Cargar ejemplo
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            if (confirm('Se borrará todo el contenido actual. ¿Continuar?')) commands.reset();
          }}
        >
          Empezar de cero
        </button>
      </Actions>

      {error ? <p className={s.error}>{error}</p> : null}

      <p className={s.note}>
        El <strong>HTML</strong> es un archivo autónomo: se abre en cualquier navegador sin
        conexión y al imprimirlo da el mismo PDF. Sirve para enviarlo o publicarlo. El{' '}
        <strong>JSON</strong> es para volver a editarlo aquí.
      </p>

      <p className={s.note}>
        Los cambios se guardan solos en este navegador. Exporta el JSON para llevártelo a otro
        equipo o guardar una versión.
      </p>
    </Panel>
  );
}
