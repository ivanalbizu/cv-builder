import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { cropImage } from '../lib/crop';
import s from './PhotoCropper.module.css';

/**
 * Recorte de la foto (CLAUDE.md §6).
 *
 * Trabaja siempre sobre el ORIGINAL que se subió, no sobre el último recorte:
 * así se puede reencuadrar cuantas veces haga falta sin ir perdiendo píxeles
 * en cada pasada.
 */
export function PhotoCropper({
  source,
  shape,
  onCancel,
  onApply,
}: {
  source: string;
  shape: 'circle' | 'rect';
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  async function apply() {
    if (!area) return;
    setBusy(true);
    setError(null);
    try {
      onApply(await cropImage(source, area));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recortar la imagen');
      setBusy(false);
    }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Recortar foto">
      <div className={s.dialog}>
        <div className={s.stage}>
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={shape === 'circle' ? 'round' : 'rect'}
            showGrid={false}
            restrictPosition={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className={s.controls}>
          <label className={s.zoom}>
            Zoom
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <p className={s.note}>
            Se guarda como PNG para conservar la transparencia. El color de fondo se elige aparte.
          </p>

          {error ? <p className={s.error}>{error}</p> : null}

          <div className={s.actions}>
            <button className="btn btn-sm" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => void apply()} disabled={busy}>
              {busy ? 'Recortando…' : 'Aplicar recorte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
