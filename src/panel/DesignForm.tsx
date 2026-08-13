import { commands } from '../core/commands';
import { useCVStore, useResolvedTheme } from '../core/store';
import { THEMES } from '../core/themes';
import { fontIdFromStack, fontsByRole, getFont } from '../core/fonts';
import type { Density } from '../core/types';
import { ContrastReport } from './ContrastReport';
import { TemplateGallery } from './TemplateGallery';
import { Actions, Field, Panel, Row } from './ui';
import s from './DesignForm.module.css';

const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compacta', hint: 'Titulares en negrita. Validada a 1 página.' },
  { value: 'comfy', label: 'Cómoda', hint: 'Más aire; puede pasar a 2 páginas.' },
];

export function DesignForm() {
  const themeId = useCVStore((st) => st.doc.themeId);
  const overrides = useCVStore((st) => st.doc.overrides);
  // Colores efectivos: si el usuario no ha tocado nada, muestran los del tema.
  const theme = useResolvedTheme();

  return (
    <>
      <Panel title="Plantilla">
        <TemplateGallery />
      </Panel>

      <Panel title="Tema">
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

      <Panel title="Tipografía">
        <Row>
          <Field label="Títulos" hint={getFont(fontIdFromStack(theme.fonts.display, 'serif'), 'serif').hint}>
            {(id) => (
              <select
                id={id}
                className={s.select}
                value={fontIdFromStack(theme.fonts.display, 'serif')}
                onChange={(e) => {
                  const f = getFont(e.target.value, 'serif');
                  // Display y serif van juntos: en las plantillas, ambos son
                  // «la fuente con carácter» y separarlos solo confunde.
                  commands.setFont('display', f.stack);
                  commands.setFont('serif', f.stack);
                }}
              >
                {fontsByRole('serif').map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Cuerpo" hint={getFont(fontIdFromStack(theme.fonts.sans, 'sans'), 'sans').hint}>
            {(id) => (
              <select
                id={id}
                className={s.select}
                value={fontIdFromStack(theme.fonts.sans, 'sans')}
                onChange={(e) => commands.setFont('sans', getFont(e.target.value, 'sans').stack)}
              >
                {fontsByRole('sans').map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Row>

        <p className={s.note}>
          Cambiar la fuente del <strong>cuerpo</strong> mueve la maqueta: vigila el contador de
          páginas. La de títulos es más segura, porque son líneas sueltas que no refluyen.
        </p>
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
