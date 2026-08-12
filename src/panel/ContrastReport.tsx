import { accentTextColor, headerContrast } from '../core/themes';
import type { Theme } from '../core/types';
import { contrastRatio, wcagLevel, type WcagLevel } from '../lib/contrast';
import s from './ContrastReport.module.css';

/**
 * Informe de contraste de los colores elegidos.
 *
 * Existe por dos razones distintas:
 *  1. Avisar si una combinación no se lee. Un CV ilegible no cumple su función,
 *     por bonito que sea.
 *  2. Explicar por qué el texto del cargo puede salir más oscuro que el color
 *     que se ha elegido en el selector. Sin decirlo, parece un fallo.
 */

const ETIQUETA: Record<WcagLevel, string> = {
  AAA: 'AAA',
  AA: 'AA',
  insuficiente: 'insuficiente',
};

function Fila({ label, ratio, large }: { label: string; ratio: number; large?: boolean }) {
  const level = wcagLevel(ratio, large ? 'large' : 'normal');
  return (
    <li className={s.fila}>
      <span className={s.etiqueta}>{label}</span>
      <span className={s.ratio}>{ratio.toFixed(1)}:1</span>
      <span className={`${s.nivel} ${s[level]}`}>{ETIQUETA[level]}</span>
    </li>
  );
}

export function ContrastReport({ theme }: { theme: Theme }) {
  const cabeceraClara = headerContrast(theme) === 'light';
  const tinta = cabeceraClara ? '#22303a' : '#ffffff';
  const acentoTexto = accentTextColor(theme);
  const seOscurecio = acentoTexto.toLowerCase() !== theme.colors.accent.toLowerCase();

  return (
    <div className={s.wrap}>
      <ul className={s.lista}>
        <Fila label="Nombre sobre cabecera" ratio={contrastRatio(tinta, theme.colors.primary)} large />
        <Fila label="Títulos de sección" ratio={contrastRatio(theme.colors.primary, '#ffffff')} />
        <Fila label="Cargo y niveles" ratio={contrastRatio(acentoTexto, '#ffffff')} />
      </ul>

      {cabeceraClara ? (
        <p className={s.nota}>
          El color principal es claro, así que la cabecera usa tinta oscura para poder leerse.
        </p>
      ) : null}

      {seOscurecio ? (
        <p className={s.nota}>
          <span className={s.muestra} style={{ background: theme.colors.accent }} />
          <span className={s.muestra} style={{ background: acentoTexto }} />
          El acento se oscurece <strong>solo cuando hace de texto</strong> (cargo, año, nivel): a su
          tamaño no llegaría al mínimo legible. Filetes, iconos y puntos conservan tu color.
        </p>
      ) : null}
    </div>
  );
}
