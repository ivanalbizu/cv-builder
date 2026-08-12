import { useId, type ReactNode } from 'react';
import s from './ui.module.css';

/** Bloque plegable del panel. Abierto por defecto los que más se tocan. */
export function Panel({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  return (
    <details className={s.panel} open={defaultOpen}>
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

export function Row({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}

/** Tarjeta de un item editable, con sus botones de subir/bajar/eliminar. */
export function ItemCard({
  title,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: {
  title: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <strong className={s.cardTitle}>{title}</strong>
        <div className={s.cardTools}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            aria-label="Subir"
            title="Subir"
          >
            ↑
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            aria-label="Bajar"
            title="Bajar"
          >
            ↓
          </button>
          <button
            className="btn btn-ghost btn-sm btn-danger"
            onClick={onRemove}
            aria-label="Eliminar"
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
