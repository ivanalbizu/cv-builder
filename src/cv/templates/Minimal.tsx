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
import { CONTACT_ICON, formatDates } from './shared';
import s from './Minimal.module.css';

/**
 * Plantilla «Minimalista».
 *
 * Sin bloques de color: el tema solo aporta la tinta. Está pensada para
 * sectores conservadores y para quien imprime en blanco y negro, donde una
 * cabecera de color sólido acaba siendo una mancha gris.
 *
 * A diferencia de las otras dos, aquí **todas** las secciones caben en el
 * mismo esquema —rótulo a la izquierda, contenido a la derecha—, así que el
 * layout no depende del tipo de sección.
 *
 * Componente PURO respecto a (`data`, `theme`), como las demás.
 */

function ContactRow({ link }: { link: ContactLink }) {
  return (
    <span>
      <Icon name={CONTACT_ICON[link.kind]} />
      {link.url ? <a href={link.url}>{link.label}</a> : link.label}
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
        {formatDates(item) ? <span className={s.dates}>{formatDates(item)}</span> : null}
      </div>

      {item.role ? <p className={s.jobRole}>{item.role}</p> : null}

      {item.bullets.length > 0 ? (
        <ul className={s.bullets}>
          {item.bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {item.tags.length > 0 ? (
        <p className={s.jobTags}>
          <strong>Software:</strong> {item.tags.join(' · ')}
        </p>
      ) : null}
    </li>
  );
}

/** Cuerpo de una sección; el rótulo lo pone `SectionBlock`. */
function SectionBody({ section }: { section: Section }) {
  switch (section.type) {
    case 'experience':
      return (
        <ul className={s.items}>
          {section.items.map((item) => (
            <ExperienceEntry key={item.id} item={item} />
          ))}
        </ul>
      );

    case 'education':
      return (
        <div className={s.items}>
          {section.items.map((item: EducationItem) => (
            <div className={s.eduItem} key={item.id}>
              <h3>{item.title || <span className={s.placeholder}>Titulación</span>}</h3>
              {item.year || item.org ? (
                <p>
                  {item.year ? <span className={s.year}>{item.year}</span> : null}
                  {item.year && item.org ? ' · ' : null}
                  {item.org}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      );

    case 'languages':
      return (
        <ul className={s.inline}>
          {section.items.map((item: LanguageItem) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              {item.level ? ` · ${item.level}` : null}
              {item.note ? <em> ({item.note})</em> : null}
            </li>
          ))}
        </ul>
      );

    case 'skills':
      return (
        <ul className={s.inline}>
          {section.items.map((item: SkillItem) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      );

    case 'custom':
      return <p className={s.customBody}>{section.body}</p>;
  }
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <section className={`${s.section} ${s.sectionGrid}`}>
      <h2 className={s.sectionTitle}>{section.title}</h2>
      <SectionBody section={section} />
    </section>
  );
}

export function Minimal({ data }: TemplateProps) {
  const { basics, sections } = data;
  const photoShape = basics.photoOptions.shape === 'circle' ? s.photoCircle : s.photoRect;

  return (
    <div className={s.page}>
      <header className={s.header}>
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
      </header>

      {basics.summary ? <p className={s.summary}>{basics.summary}</p> : null}

      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
