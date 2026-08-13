import { useId, type ReactNode } from 'react';
import s from './ui.module.css';

/**
 * Bloque plegable del panel.
 *
 * Todos arrancan cerrados. Con varios abiertos, el panel llega lleno de
 * campos y no se ve de un vistazo qué secciones tiene el CV; cerrados, la
 * primera pantalla es el índice del documento.
 *
 * `open` no se controla desde React a propósito: `<details>` mantiene su
 * estado en el DOM y React no lo reaplica en cada render (comprobado: teclear
 * en un campo no cierra el bloque). Añadir estado aquí solo traería renders
 * extra a cambio de nada.
 */
export function Panel({
  title,
  children,
  badge,
}: {
  title: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <details className={s.panel}>
      <summary className={s.summary}>
        <span>{title}</span>
        {badge ? <span className={s.badge}>{badge}</span> : null}
      </summary>
      <div className={s.panelBody}>{children}</div>
    </details>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: (id: string) => ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint ? <p className={s.hint}>{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input
          id={id}
          className={s.input}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea
          id={id}
          className={s.textarea}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

/**
 * Grupo de controles dentro de un bloque.
 *
 * `fieldset`/`legend` y no un `div` con un `<h3>`: es la etiqueta semántica
 * para agrupar controles de formulario, y hace que un lector de pantalla
 * anuncie «Colores» al entrar en cada campo del grupo.
 */
export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className={s.grupo}>
      <legend className={s.leyenda}>{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}

/**
 * Tarjeta de un item editable.
 *
 * El asa de arrastre la inyecta quien la usa (`handle`), porque el reordenado
 * lo gobierna `SortableList` y esta tarjeta no debe saber de dnd-kit.
 */
export function ItemCard({
  title,
  handle,
  onRemove,
  children,
}: {
  title: string;
  handle?: ReactNode;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        {handle}
        <strong className={s.cardTitle}>{title}</strong>
        <div className={s.cardTools}>
          <button
            className="btn btn-ghost btn-sm btn-danger"
            onClick={onRemove}
            aria-label={`Eliminar ${title}`}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </div>
      <div className={s.cardBody}>{children}</div>
    </div>
  );
}
