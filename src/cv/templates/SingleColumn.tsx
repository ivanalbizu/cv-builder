import type {
  ContactLink,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  Section,
  SkillItem,
  TemplateProps,
} from '../../core/types';
import { Icon, Rating } from '../icons';
import { CONTACT_ICON, formatDates, isNarrowSection } from './shared';
import s from './SingleColumn.module.css';

/**
 * Plantilla «Una columna».
 *
 * Componente PURO respecto a (`data`, `theme`) — CLAUDE.md §11: sin estado, sin
 * store, sin efectos. Así se renderiza igual en el navegador, en un test y en
 * un `page.pdf()` de Playwright (fase 3).
 */

function ContactRow({ link }: { link: ContactLink }) {
  const content = link.url ? <a href={link.url}>{link.label}</a> : link.label;
  return (
    <span>
      <Icon name={CONTACT_ICON[link.kind]} />
      {content}
    </span>
  );
}

function ExperienceEntry({ item }: { item: ExperienceItem }) {
  return (
    <li className={s.jobItem}>
      <div className={s.jobHead}>
        <h3 className={s.org}>
          {item.org || <span className={s.placeholder}>Empresa</span>}
          {item.rating ? (
            <>
              {' '}
              <Rating count={item.rating} icon={item.ratingIcon ?? 'star'} className={s.rating} />
            </>
          ) : null}
          {item.location ? <span className={s.city}> · {item.location}</span> : null}
        </h3>
        {formatDates(item) ? (
          <span className={`${s.dates} ${item.current ? s.datesCurrent : ''}`}>
            {formatDates(item)}
          </span>
        ) : null}
      </div>

      {item.role ? <p className={s.jobRole}>{item.role}</p> : null}

      {item.bullets.length > 0 || item.tags.length > 0 ? (
        <div className={s.jobBody}>
          {item.bullets.length > 0 ? (
            <ul className={s.bullets}>
              {item.bullets.map((bullet, i) => (
                <li key={i}>
                  <strong>{bullet}</strong>
                </li>
              ))}
            </ul>
          ) : null}

          {item.tags.length > 0 ? (
            <p className={s.jobTags}>
              <Icon name="monitor" />
              <span>
                <strong>Software:</strong> {item.tags.join(', ')}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function EducationEntry({ item }: { item: EducationItem }) {
  return (
    <div className={s.eduItem}>
      <h3>{item.title || <span className={s.placeholder}>Titulación</span>}</h3>
      {item.year || item.org ? (
        <p>
          {item.year ? <span className={s.year}>{item.year}</span> : null}
          {item.year && item.org ? ' · ' : null}
          {item.org}
        </p>
      ) : null}
    </div>
  );
}

function LanguageEntry({ item }: { item: LanguageItem }) {
  return (
    <li className={s.language}>
      <span className={s.flag}>{item.code || item.name.slice(0, 2).toUpperCase()}</span>
      <div>
        <h3>{item.name}</h3>
        {item.note ? <p>{item.note}</p> : null}
      </div>
      {item.level ? <span className={s.level}>{item.level}</span> : null}
    </li>
  );
}

function SkillChips({ items }: { items: SkillItem[] }) {
  return (
    <ul className={s.chips}>
      {items.map((item) => (
        <li key={item.id}>
          {item.name}
          {item.note ? <em> · {item.note}</em> : null}
        </li>
      ))}
    </ul>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>
        <Icon name={section.icon} />
        {section.title}
      </h2>

      {section.type === 'experience' && (
        <ul className={s.timeline}>
          {section.items.map((item) => (
            <ExperienceEntry key={item.id} item={item} />
          ))}
        </ul>
      )}

      {section.type === 'education' &&
        section.items.map((item) => <EducationEntry key={item.id} item={item} />)}

      {section.type === 'languages' && (
        <ul className={s.languages}>
          {section.items.map((item) => (
            <LanguageEntry key={item.id} item={item} />
          ))}
        </ul>
      )}

      {section.type === 'skills' && <SkillChips items={section.items} />}

      {section.type === 'custom' && <p className={s.customBody}>{section.body}</p>}
    </section>
  );
}

/**
 * Agrupa las secciones cortas del final (formación, idiomas, competencias) en
 * una rejilla 2fr/1fr, tal como en el CV de referencia. Se hace solo cuando
 * quedan exactamente dos seguidas: con una o con tres, a ancho completo.
 */
function layoutSections(sections: Section[]): (Section | Section[])[] {
  const isNarrow = (x: Section) => x.type === 'education' || isNarrowSection(x);

  const out: (Section | Section[])[] = [];
  for (let i = 0; i < sections.length; i += 1) {
    const current = sections[i]!;
    const next = sections[i + 1];
    const afterNext = sections[i + 2];
    if (isNarrow(current) && next && isNarrow(next) && !(afterNext && isNarrow(afterNext))) {
      out.push([current, next]);
      i += 1;
    } else {
      out.push(current);
    }
  }
  return out;
}

export function SingleColumn({ data }: TemplateProps) {
  const { basics, sections } = data;
  const photoShape = basics.photoOptions.shape === 'circle' ? s.photoCircle : s.photoRect;

  return (
    <>
      <header className={s.header}>
        {basics.photo ? (
          <img
            className={`${s.photo} ${photoShape}`}
            src={basics.photo}
            alt={basics.name}
            style={{
              objectFit: basics.photoOptions.fit,
              objectPosition: basics.photoOptions.position,
              background: basics.photoOptions.background,
            }}
          />
        ) : null}

        <div className={s.identity}>
          <h1 className={s.name}>{basics.name}</h1>
          {basics.title ? <p className={s.role}>{basics.title}</p> : null}
        </div>

        {basics.contact.length > 0 ? (
          <div className={s.contact}>
            {basics.contact.map((link) => (
              <ContactRow key={link.id} link={link} />
            ))}
          </div>
        ) : null}
      </header>

      <div className={s.body}>
        {basics.summary ? (
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <Icon name="user" />
              Perfil profesional
            </h2>
            <p className={s.summary}>{basics.summary}</p>
          </section>
        ) : null}

        {layoutSections(sections).map((entry) =>
          Array.isArray(entry) ? (
            <div className={s.grid} key={entry[0]!.id}>
              {entry.map((section) => (
                <SectionBlock key={section.id} section={section} />
              ))}
            </div>
          ) : (
            <SectionBlock key={entry.id} section={entry} />
          ),
        )}
      </div>
    </>
  );
}
