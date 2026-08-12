import type { IconName } from '../core/types';

/**
 * Iconos SVG inline, portados del CV de referencia.
 *
 * Inline y no fuente de iconos: así el PDF los lleva como vectores dentro del
 * documento, sin depender de ninguna descarga (y sin licencias de terceros).
 * Heredan el color por `fill: currentColor` o por CSS de la plantilla.
 */

const PATHS: Record<IconName, string> = {
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z',
  briefcase:
    'M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-6 0h-4V5h4v2z',
  graduation:
    'M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 14.2v3.3c0 .8.4 1.5 1.1 1.9 1.6.9 3.7 1.4 5.9 1.4s4.3-.5 5.9-1.4c.7-.4 1.1-1.1 1.1-1.9v-3.3l-7 3.8-7-3.8z',
  globe:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15 15 0 0 0-1.2-3.1A8 8 0 0 1 18.9 8zM12 4.1c.6.9 1.1 2.1 1.5 3.9h-3c.4-1.8.9-3 1.5-3.9zM4.3 14a7.9 7.9 0 0 1 0-4h3.3a17 17 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.2.7 2.2 1.2 3.1A8 8 0 0 1 5.1 16zm2.9-8H5.1a8 8 0 0 1 4.1-3.1A15 15 0 0 0 8 8zM12 19.9c-.6-.9-1.1-2.1-1.5-3.9h3c-.4 1.8-.9 3-1.5 3.9zm1.9-5.9h-3.8a15 15 0 0 1 0-4h3.8a15 15 0 0 1 0 4zm.9 5.1c.5-.9.9-1.9 1.2-3.1h2.9a8 8 0 0 1-4.1 3.1zM16.4 14a17 17 0 0 0 0-4h3.3a7.9 7.9 0 0 1 0 4h-3.3z',
  monitor:
    'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l1 2h2v2H7v-2h2l1-2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v9h16V6H4z',
  star: 'M12 17.3 6.2 20.6l1.1-6.5-4.7-4.6 6.5-.9L12 2.7l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5z',
  key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  location:
    'M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
  phone:
    'M6.6 10.8c1.1 2.2 2.9 4 5.1 5.1l1.7-1.7c.2-.2.5-.3.8-.2 1 .3 2.1.5 3.2.5.4 0 .8.4.8.8V18c0 .4-.4.8-.8.8-8.3 0-15-6.7-15-15 0-.4.4-.8.8-.8h2.7c.4 0 .8.4.8.8 0 1.1.2 2.2.5 3.2.1.3 0 .6-.2.8l-1.7 1.7z',
  mail: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.2-8 5-8-5V6l8 5 8-5v2.2z',
  link: 'M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z',
};

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Categoría del establecimiento: estrellas o llaves, como en el CV original. */
export function Rating({
  count,
  icon,
  className,
}: {
  count: number;
  icon: 'star' | 'key';
  className?: string;
}) {
  const n = Math.max(0, Math.min(5, Math.round(count)));
  if (n === 0) return null;
  const label = `${n} ${icon === 'key' ? (n === 1 ? 'llave' : 'llaves') : n === 1 ? 'estrella' : 'estrellas'}`;
  return (
    <span className={className} title={label} aria-label={label} role="img">
      {Array.from({ length: n }, (_, i) => (
        <Icon key={i} name={icon} />
      ))}
    </span>
  );
}
