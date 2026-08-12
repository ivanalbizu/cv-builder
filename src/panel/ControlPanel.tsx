import { BasicsForm } from './BasicsForm';
import { DesignForm } from './DesignForm';
import { DocumentForm } from './DocumentForm';
import { SectionsEditor } from './SectionsEditor';
import s from './ControlPanel.module.css';

/**
 * Panel de control (CLAUDE.md §6). Ningún formulario toca el store: todos
 * llaman a la capa de comandos, igual que hará el agente.
 *
 * La clase global `control-panel` es el gancho que usa `print.css` para
 * apagarlo al imprimir.
 */
export function ControlPanel() {
  return (
    <aside className={`${s.panel} control-panel app-chrome`}>
      <header className={s.head}>
        <h1 className={s.title}>CV Builder</h1>
        <p className={s.subtitle}>Contenido · Tema · Plantilla</p>
      </header>

      <div className={s.scroll}>
        <BasicsForm />
        <SectionsEditor />
        <DesignForm />
        <DocumentForm />
      </div>
    </aside>
  );
}
