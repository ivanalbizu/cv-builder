import { commands } from '../core/commands';
import { docActivo, useCVStore, useResolvedTheme } from '../core/store';
import { THEMES } from '../core/themes';
import { fontIdFromStack, fontsByRole, getFont } from '../core/fonts';
import type { Density } from '../core/types';
import { ContrastReport } from './ContrastReport';
import { MarcaColores } from './MarcaColores';
import { TemplateGallery } from './TemplateGallery';
import { Actions, Field, Grupo, Panel, Row } from './ui';
import s from './DesignForm.module.css';

/**
 * Aspecto del CV, en DOS bloques y no en cuatro.
 *
 * Antes había uno por cada cosa: plantilla, tema, tipografía y densidad. Pero
 * en el modelo `Theme` es `{ colors, fonts, density }` — o sea que tres de
 * aquellos cuatro paneles eran facetas del MISMO objeto, mientras que la
 * plantilla, que sí es independiente (vive en `templateId`), aparecía como una
 * más. La interfaz había partido lo que va junto y equiparado lo que no.
 *
 * Con dos bloques el panel refleja la separación de CLAUDE.md §1:
 * CONTENIDO ↔ TEMA ↔ PLANTILLA.
 */

const DENSITIES: { value: Density; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compacta', hint: 'Titulares en negrita. Validada a 1 página.' },
  { value: 'comfy', label: 'Cómoda', hint: 'Más aire; puede pasar a 2 páginas.' },
];

export function DesignForm() {
  const themeId = useCVStore((st) => docActivo(st).themeId);
  const overrides = useCVStore((st) => docActivo(st).overrides);
  // Colores efectivos: si el usuario no ha tocado nada, muestran los del tema.
  const theme = useResolvedTheme();

  return (
    <>
      <Panel title="Plantilla">
        <TemplateGallery />
      </Panel>

      <Panel title="Tema">
        <Grupo titulo="Preajustes">
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
          <p className={s.note}>
            Cada tema trae su propia pareja tipográfica. Elegir uno reemplaza colores y fuentes.
          </p>
        </Grupo>

        <Grupo titulo="Colores">
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
        </Grupo>

        <Grupo titulo="Colores de una marca">
          <MarcaColores />
        </Grupo>

        <Grupo titulo="Tipografía">
          <Row>
            <Field
              label="Títulos"
              hint={getFont(fontIdFromStack(theme.fonts.display, 'serif'), 'serif').hint}
            >
              {(id) => (
                <select
                  id={id}
                  className={s.select}
                  value={fontIdFromStack(theme.fonts.display, 'serif')}
                  onChange={(e) => {
                    const f = getFont(e.target.value, 'serif');
                    // Display y serif van juntos: en las plantillas ambos son
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

            <Field
              label="Cuerpo"
              hint={getFont(fontIdFromStack(theme.fonts.sans, 'sans'), 'sans').hint}
            >
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
        </Grupo>

        <Grupo titulo="Densidad">
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
          <p className={s.note}>
            {DENSITIES.find((d) => d.value === theme.density)?.hint} Es el ajuste al que recurrir
            cuando el CV se sale de una página.
          </p>
        </Grupo>
      </Panel>
    </>
  );
}
