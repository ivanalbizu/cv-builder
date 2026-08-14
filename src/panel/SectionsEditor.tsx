import { commands } from '../core/commands';
import { docActivo, useCVStore } from '../core/store';
import type {
  EducationItem,
  ExperienceItem,
  Id,
  LanguageItem,
  Section,
  SectionType,
  SkillItem,
} from '../core/types';
import { ICON_NAMES } from '../cv/icons';
import { DragHandle, SortableItem, SortableList } from './Sortable';
import { Actions, Field, ItemCard, Panel, Row, TextAreaField, TextField } from './ui';
import s from './SectionsEditor.module.css';

const NEW_SECTIONS: { type: SectionType; label: string }[] = [
  { type: 'experience', label: 'Experiencia' },
  { type: 'education', label: 'Formación' },
  { type: 'skills', label: 'Competencias' },
  { type: 'languages', label: 'Idiomas' },
  { type: 'custom', label: 'Texto libre' },
];

/** Una línea por viñeta: es lo más rápido de editar y de pegar desde otro sitio. */
const toLines = (list: string[]) => list.join('\n');
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const toCsv = (list: string[]) => list.join(', ');
const fromCsv = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export function SectionsEditor() {
  const sections = useCVStore((st) => docActivo(st).data.sections);

  return (
    <>
      <SortableList
        ids={sections.map((section) => section.id)}
        onReorder={(id, to) => commands.reorderSection(id, to)}
      >
        {sections.map((section) => (
          <SortableItem key={section.id} id={section.id}>
            {({ handleProps }) => (
              <SectionPanel
                section={section}
                handle={<DragHandle label={`sección ${section.title}`} {...handleProps} />}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>

      <Panel title="Añadir sección">
        <Actions>
          {NEW_SECTIONS.map((entry) => (
            <button
              key={entry.type}
              className="btn btn-sm"
              onClick={() => commands.addSection(entry.type)}
            >
              + {entry.label}
            </button>
          ))}
        </Actions>
      </Panel>
    </>
  );
}

function SectionPanel({ section, handle }: { section: Section; handle: React.ReactNode }) {
  const count = section.type === 'custom' ? undefined : section.items.length;

  return (
    <Panel title={section.title || 'Sección'} badge={count}>
      <div className={s.sectionTools}>
        {handle}
        <span className={s.sectionHint}>Arrastra para reordenar</span>
        <button
          className="btn btn-ghost btn-sm btn-danger"
          onClick={() => commands.removeSection(section.id)}
        >
          Eliminar sección
        </button>
      </div>

      <Row>
        <TextField
          label="Título"
          value={section.title}
          onChange={(v) => commands.updateSection(section.id, { title: v })}
        />
        <Field label="Icono">
          {(id) => (
            <select
              id={id}
              className={s.select}
              value={section.icon}
              onChange={(e) =>
                commands.updateSection(section.id, { icon: e.target.value as Section['icon'] })
              }
            >
              {ICON_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </Row>

      {section.type === 'custom' ? (
        <TextAreaField
          label="Contenido"
          value={section.body}
          rows={6}
          onChange={(v) => commands.setCustomBody(section.id, v)}
        />
      ) : (
        <ItemList section={section} />
      )}
    </Panel>
  );
}

function ItemList({ section }: { section: Exclude<Section, { type: 'custom' }> }) {
  const items = section.items;

  return (
    <>
      <SortableList
        ids={items.map((item) => item.id)}
        onReorder={(id, to) => commands.reorderItem(section.id, id, to)}
      >
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {({ handleProps }) => (
              <ItemCard
                title={itemTitle(item)}
                handle={<DragHandle label={itemTitle(item)} {...handleProps} />}
                onRemove={() => commands.removeItem(section.id, item.id)}
              >
                {section.type === 'experience' && (
                  <ExperienceFields sectionId={section.id} item={item as ExperienceItem} />
                )}
                {section.type === 'education' && (
                  <EducationFields sectionId={section.id} item={item as EducationItem} />
                )}
                {section.type === 'languages' && (
                  <LanguageFields sectionId={section.id} item={item as LanguageItem} />
                )}
                {section.type === 'skills' && (
                  <SkillFields sectionId={section.id} item={item as SkillItem} />
                )}
              </ItemCard>
            )}
          </SortableItem>
        ))}
      </SortableList>

      <Actions>
        <button className="btn btn-sm" onClick={() => commands.addItem(section.id)}>
          + Añadir
        </button>
      </Actions>
    </>
  );
}

/** Cada tipo de item guarda su rótulo en un campo distinto. */
function itemTitle(item: { id: Id }): string {
  const fields = item as Partial<ExperienceItem & EducationItem & LanguageItem & SkillItem>;
  return fields.org || fields.title || fields.name || 'Sin título';
}

function ExperienceFields({ sectionId, item }: { sectionId: Id; item: ExperienceItem }) {
  const patch = (values: Partial<ExperienceItem>) =>
    commands.updateItem(sectionId, item.id, values);

  return (
    <>
      <TextField label="Empresa" value={item.org} onChange={(v) => patch({ org: v })} />
      <Row>
        <TextField label="Puesto" value={item.role} onChange={(v) => patch({ role: v })} />
        <TextField
          label="Ubicación"
          value={item.location ?? ''}
          onChange={(v) => patch({ location: v })}
        />
      </Row>
      <Row>
        <TextField
          label="Inicio"
          value={item.start}
          placeholder="Nov 2018"
          onChange={(v) => patch({ start: v })}
        />
        <TextField
          label="Fin"
          value={item.end ?? ''}
          placeholder="Jul 2026"
          onChange={(v) => patch({ end: v })}
        />
      </Row>

      <label className={s.checkbox}>
        <input
          type="checkbox"
          checked={item.current ?? false}
          onChange={(e) => patch({ current: e.target.checked })}
        />
        Puesto actual (muestra «Actualidad»)
      </label>

      <TextAreaField
        label="Viñetas"
        value={toLines(item.bullets)}
        rows={4}
        hint="Una por línea. En esta plantilla salen en negrita: escribe titulares, el detalle se cuenta en la entrevista."
        onChange={(v) => patch({ bullets: fromLines(v) })}
      />

      <TextField
        label="Software / etiquetas"
        value={toCsv(item.tags)}
        placeholder="Prestige, SAP, PMS"
        hint="Separadas por comas."
        onChange={(v) => patch({ tags: fromCsv(v) })}
      />

      <Row>
        <Field label="Categoría">
          {(id) => (
            <select
              id={id}
              className={s.select}
              value={item.rating ?? 0}
              onChange={(e) => patch({ rating: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? 'Ninguna' : n}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Símbolo">
          {(id) => (
            <select
              id={id}
              className={s.select}
              value={item.ratingIcon ?? 'star'}
              onChange={(e) => patch({ ratingIcon: e.target.value as 'star' | 'key' })}
            >
              <option value="star">Estrellas</option>
              <option value="key">Llaves</option>
            </select>
          )}
        </Field>
      </Row>
    </>
  );
}

function EducationFields({ sectionId, item }: { sectionId: Id; item: EducationItem }) {
  const patch = (values: Partial<EducationItem>) => commands.updateItem(sectionId, item.id, values);
  return (
    <>
      <TextField label="Titulación" value={item.title} onChange={(v) => patch({ title: v })} />
      <Row>
        <TextField
          label="Centro"
          value={item.org ?? ''}
          onChange={(v) => patch({ org: v })}
        />
        <TextField label="Año" value={item.year ?? ''} onChange={(v) => patch({ year: v })} />
      </Row>
    </>
  );
}

function LanguageFields({ sectionId, item }: { sectionId: Id; item: LanguageItem }) {
  const patch = (values: Partial<LanguageItem>) => commands.updateItem(sectionId, item.id, values);
  return (
    <>
      <Row>
        <TextField label="Idioma" value={item.name} onChange={(v) => patch({ name: v })} />
        <TextField
          label="Insignia"
          value={item.code ?? ''}
          placeholder="EN"
          hint="2 letras."
          onChange={(v) => patch({ code: v.toUpperCase().slice(0, 2) })}
        />
      </Row>
      <Row>
        <TextField label="Nivel" value={item.level} placeholder="B2" onChange={(v) => patch({ level: v })} />
        <TextField
          label="Titulación"
          value={item.note ?? ''}
          placeholder="First Certificate"
          onChange={(v) => patch({ note: v })}
        />
      </Row>
    </>
  );
}

function SkillFields({ sectionId, item }: { sectionId: Id; item: SkillItem }) {
  const patch = (values: Partial<SkillItem>) => commands.updateItem(sectionId, item.id, values);
  return (
    <Row>
      <TextField label="Competencia" value={item.name} onChange={(v) => patch({ name: v })} />
      <TextField label="Nota" value={item.note ?? ''} onChange={(v) => patch({ note: v })} />
    </Row>
  );
}
