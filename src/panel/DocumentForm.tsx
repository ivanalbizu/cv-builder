import { useRef, useState } from 'react';
import { commands } from '../core/commands';
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

  function exportJSON() {
    const doc = commands.toJSON();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = doc.data.basics.name.trim().toLowerCase().replace(/\s+/g, '-') || 'cv';
    link.href = url;
    link.download = `${slug}.cv.json`;
    link.click();
    URL.revokeObjectURL(url);
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
        Los cambios se guardan solos en este navegador. Exporta el JSON para llevártelo a otro
        equipo o guardar una versión.
      </p>
    </Panel>
  );
}
