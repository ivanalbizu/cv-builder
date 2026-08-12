import { commands } from '../core/commands';
import { useCVStore, useResolvedTheme } from '../core/store';
import { THEMES } from '../core/themes';
import { TEMPLATES } from '../cv/templates';
import type { Density } from '../core/types';
import { ContrastReport } from './ContrastReport';
import { Actions, Field, Panel, Row } from './ui';
import s from './DesignForm.module.css';

const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compacta', hint: 'Titulares en negrita. Validada a 1 página.' },
  { value: 'comfy', label: 'Cómoda', hint: 'Más aire; puede pasar a 2 páginas.' },
];

export function DesignForm() {
  const templateId = useCVStore((st) => st.doc.templateId);
  const themeId = useCVStore((st) => st.doc.themeId);
  const overrides = useCVStore((st) => st.doc.overrides);
  // Colores efectivos: si el usuario no ha tocado nada, muestran los del tema.
  const theme = useResolvedTheme();

  return (
    <>
      <Panel title="Plantilla" defaultOpen>
        <div className={s.templateGrid}>
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              className={`${s.templateCard} ${template.id === templateId ? s.active : ''}`}
              onClick={() => commands.setTemplate(template.id)}
              aria-pressed={template.id === templateId}
            >
              <span className={`${s.thumb} ${s[template.layout] ?? ''}`} aria-hidden="true" />
              <strong>{template.name}</strong>
              <span className={s.templateDesc}>{template.description}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Tema" defaultOpen>
        <Actions>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`btn btn-sm ${t.id === themeId ? 'btn-primary' : ''}`}
              onClick={() => commands.setTheme(t.id)}
              aria-pressed={t.id === themeId}
            >
              <span className={s.swatch} style={{ background: t.colors.primary }} />
              <span className={s.swatch} style={{ background: t.colors.accent }} />
              {t.name}
            </button>
          ))}
        </Actions>

        <Row>
          <Field label="Principal" hint="Cabecera y títulos.">
            {(id) => (
              <input
                id={id}
                type="color"
                className={s.color}
                value={theme.colors.primary}
                onChange={(e) => commands.setPrimary(e.target.value)}
              />
            )}
          </Field>
          <Field label="Acento" hint="Filetes, puntos y detalles.">
            {(id) => (
              <input
                id={id}
                type="color"
                className={s.color}
                value={theme.colors.accent}
                onChange={(e) => commands.setAccent(e.target.value)}
              />
            )}
          </Field>
        </Row>

        {overrides.primary || overrides.accent ? (
          <Actions>
            <button className="btn btn-sm" onClick={() => commands.resetColors()}>
              Volver a los colores del tema
            </button>
          </Actions>
        ) : null}

        <ContrastReport theme={theme} />
      </Panel>

      <Panel title="Densidad">
        <Actions>
          {DENSITIES.map((d) => (
            <button
              key={d.value}
              className={`btn btn-sm ${theme.density === d.value ? 'btn-primary' : ''}`}
              onClick={() => commands.setDensity(d.value)}
              aria-pressed={theme.density === d.value}
            >
              {d.label}
            </button>
          ))}
        </Actions>
        <p className={s.note}>{DENSITIES.find((d) => d.value === theme.density)?.hint}</p>
      </Panel>
    </>
  );
}
