import { ControlPanel } from '../panel/ControlPanel';
import { Preview } from './Preview';

/**
 * Layout de la app: panel de control a la izquierda, lienzo A4 a la derecha.
 * Ambos llevan clases globales (`control-panel`, `toolbar`) porque `print.css`
 * las necesita por nombre para apagarlas al imprimir.
 */
export function App() {
  return (
    <div className="app-shell">
      {/* El panel trae decenas de controles antes del lienzo. Sin este atajo,
          llegar al botón de imprimir con el teclado son ~50 tabulaciones. */}
      <a className="skip-link app-chrome" href="#lienzo">
        Saltar al CV
      </a>
      <ControlPanel />
      <Preview />
    </div>
  );
}
