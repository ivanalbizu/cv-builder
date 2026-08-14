import { useRef, useState } from 'react';
import { commands } from '../core/commands';
import { docActivo, useCVStore } from '../core/store';
import type { ContactKind } from '../core/types';
import { fileToDataURL, photoWarning } from '../lib/image';
import { PhotoCropper } from './PhotoCropper';
import { Actions, Field, Panel, Row, TextAreaField, TextField } from './ui';
import s from './BasicsForm.module.css';

const CONTACT_KINDS: { value: ContactKind; label: string; prefix: string }[] = [
  { value: 'location', label: 'Ubicación', prefix: '' },
  { value: 'phone', label: 'Teléfono', prefix: 'tel:' },
  { value: 'email', label: 'Email', prefix: 'mailto:' },
  { value: 'link', label: 'Enlace', prefix: 'https://' },
];

export function BasicsForm() {
  const basics = useCVStore((s) => docActivo(s).data.basics);
  const fileInput = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(
    basics.photo ? photoWarning(basics.photo) : null,
  );
  const [cropping, setCropping] = useState(false);
  /**
   * Original de la subida, para poder reencuadrar sin ir perdiendo píxeles en
   * cada pasada. Vive solo en memoria a propósito: guardarlo en el documento
   * duplicaría el peso del JSON exportado. Tras recargar la página se recorta
   * sobre la foto actual, que es lo único que sobrevive.
   */
  const [original, setOriginal] = useState<string | null>(null);

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setWarning(photoWarning(dataUrl));
    setOriginal(dataUrl);
    commands.setPhoto(dataUrl);
  }

  return (
    <>
      <Panel title="Datos personales">
        <TextField
          label="Nombre"
          value={basics.name}
          onChange={(v) => commands.setBasics({ name: v })}
        />
        <TextField
          label="Puesto"
          value={basics.title}
          onChange={(v) => commands.setBasics({ title: v })}
          placeholder="Recepcionista de Hotel"
        />
        <TextAreaField
          label="Perfil profesional"
          value={basics.summary ?? ''}
          onChange={(v) => commands.setBasics({ summary: v })}
          rows={6}
          hint="Déjalo vacío para ocultar la sección entera."
        />
      </Panel>

      <Panel title="Contacto" badge={basics.contact.length || undefined}>
        {basics.contact.map((link, index) => (
          <div className={s.contactRow} key={link.id}>
            <select
              className={s.select}
              value={link.kind}
              onChange={(e) => commands.updateContact(link.id, { kind: e.target.value as ContactKind })}
              aria-label="Tipo"
            >
              {CONTACT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              className={s.input}
              value={link.label}
              placeholder="Texto visible"
              onChange={(e) => commands.updateContact(link.id, { label: e.target.value })}
              aria-label="Texto"
            />
            <button
              className="btn btn-ghost btn-sm btn-danger"
              onClick={() => commands.removeContact(link.id)}
              aria-label={`Eliminar contacto ${index + 1}`}
            >
              ✕
            </button>
            <input
              className={`${s.input} ${s.urlInput}`}
              value={link.url ?? ''}
              placeholder="tel: / mailto: / https:// — vacío = solo texto"
              onChange={(e) => commands.updateContact(link.id, { url: e.target.value })}
              aria-label="Enlace"
            />
          </div>
        ))}

        <Actions>
          {CONTACT_KINDS.map((k) => (
            <button
              key={k.value}
              className="btn btn-sm"
              onClick={() => commands.addContact({ kind: k.value, label: '', url: k.prefix })}
            >
              + {k.label}
            </button>
          ))}
        </Actions>
      </Panel>

      <Panel title="Foto">
        <div className={s.photoTop}>
          {basics.photo ? (
            <img
              className={s.thumb}
              src={basics.photo}
              alt=""
              style={{
                objectFit: basics.photoOptions.fit,
                background: basics.photoOptions.background,
                borderRadius: basics.photoOptions.shape === 'circle' ? '50%' : '8px',
              }}
            />
          ) : (
            <div className={`${s.thumb} ${s.thumbEmpty}`}>Sin foto</div>
          )}
          <Actions>
            <button className="btn btn-sm" onClick={() => fileInput.current?.click()}>
              Subir imagen
            </button>
            {basics.photo ? (
              <>
                <button className="btn btn-sm" onClick={() => setCropping(true)}>
                  Recortar
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    commands.setPhoto(null);
                    setOriginal(null);
                    setWarning(null);
                  }}
                >
                  Quitar
                </button>
              </>
            ) : null}
          </Actions>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void onPickPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {cropping && basics.photo ? (
          <PhotoCropper
            source={original ?? basics.photo}
            shape={basics.photoOptions.shape}
            onCancel={() => setCropping(false)}
            onApply={(dataUrl) => {
              commands.setPhoto(dataUrl);
              // Un recorte siempre sale en PNG, así que el aviso de JPEG ya no aplica.
              setWarning(null);
              setCropping(false);
            }}
          />
        ) : null}

        {warning ? <p className={s.warning}>{warning}</p> : null}

        <Row>
          <Field label="Encaje">
            {(id) => (
              <select
                id={id}
                className={s.select}
                value={basics.photoOptions.fit}
                onChange={(e) =>
                  commands.setPhotoOptions({ fit: e.target.value as 'cover' | 'contain' })
                }
              >
                <option value="contain">Contener (retrato completo)</option>
                <option value="cover">Cubrir (llena el marco)</option>
              </select>
            )}
          </Field>
          <Field label="Forma">
            {(id) => (
              <select
                id={id}
                className={s.select}
                value={basics.photoOptions.shape}
                onChange={(e) =>
                  commands.setPhotoOptions({ shape: e.target.value as 'circle' | 'rect' })
                }
              >
                <option value="circle">Círculo</option>
                <option value="rect">Rectángulo</option>
              </select>
            )}
          </Field>
        </Row>

        <Row>
          <Field label="Fondo" hint="Rellena el hueco de los PNG transparentes.">
            {(id) => (
              <input
                id={id}
                type="color"
                className={s.color}
                value={basics.photoOptions.background}
                onChange={(e) => commands.setPhotoOptions({ background: e.target.value })}
              />
            )}
          </Field>
          <TextField
            label="Posición"
            value={basics.photoOptions.position}
            onChange={(v) => commands.setPhotoOptions({ position: v })}
            hint="CSS object-position, p. ej. «50% 30%»."
          />
        </Row>
      </Panel>
    </>
  );
}
