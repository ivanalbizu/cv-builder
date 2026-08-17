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
import { CONTACT_ICON, formatDates, isNarrowSection, tituloPerfil } from './shared';
import s from './Sidebar.module.css';

/**
 * Plantilla «Barra lateral» (grid 34% / 1fr, CLAUDE.md §2).
 *
 * Reparte las secciones por ancho: idiomas y competencias caben en la columna
 * estrecha; experiencia, formación y textos libres necesitan la ancha. El
 * reparto se deduce del TIPO de sección, así que el usuario reordena en el
 * panel como siempre y cada bloque cae donde le toca.
 *
 * Componente PURO respecto a (`data`, `theme`), igual que SingleColumn.
 */

function ContactRow({ link }: { link: ContactLink }) {
  return (
    <span>
      <Icon name={CONTACT_ICON[link.kind]} />
      {link.url ? <a href={link.url}>{link.label}</a> : link.label}
    </span>
  );
}

function AsideSection({ section }: { section: Section }) {
  return (
    <section>
      <h2 className={s.asideTitle}>
        <Icon name={section.icon} />
        {section.title}
      </h2>

      {section.type === 'languages' && (
        <ul className={s.languages}>
          {section.items.map((item: LanguageItem) => (
            <li className={s.language} key={item.id}>
              <div>
                <strong>{item.name}</strong>
                {item.note ? <em> · {item.note}</em> : null}
              </div>
              {item.level ? <span className={s.level}>{item.level}</span> : null}
            </li>
          ))}
        </ul>
      )}

      {section.type === 'skills' && (
        <ul className={s.skills}>
          {section.items.map((item: SkillItem) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </section>
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
    </li>
  );
}

function MainSection({ section }: { section: Section }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>
        <Icon name={section.icon} />
        {section.title}
      </h2>

      {section.type === 'experience' && (
        <ul className={s.jobs}>
          {section.items.map((item) => (
            <ExperienceEntry key={item.id} item={item} />
          ))}
        </ul>
      )}

      {section.type === 'education' &&
        section.items.map((item: EducationItem) => (
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

      {section.type === 'custom' && <p className={s.customBody}>{section.body}</p>}
    </section>
  );
}

export function Sidebar({ data }: TemplateProps) {
  const { basics, sections } = data;
  const photoShape = basics.photoOptions.shape === 'circle' ? s.photoCircle : s.photoRect;

  const aside = sections.filter(isNarrowSection);
  const main = sections.filter((section) => !isNarrowSection(section));

  return (
    <div className={s.page}>
      <aside className={s.aside}>
        {basics.photo ? (
          <div className={s.photoWrap}>
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
          </div>
        ) : null}

        <div className={s.identity}>
          <h1 className={s.name}>{basics.name}</h1>
          {basics.title ? <p className={s.role}>{basics.title}</p> : null}
        </div>

        {basics.contact.length > 0 ? (
          <section>
            <h2 className={s.asideTitle}>
              <Icon name="mail" />
              Contacto
            </h2>
            <div className={s.contact}>
              {basics.contact.map((link) => (
                <ContactRow key={link.id} link={link} />
              ))}
            </div>
          </section>
        ) : null}

        {aside.map((section) => (
          <AsideSection key={section.id} section={section} />
        ))}
      </aside>

      <main className={s.main}>
        {basics.summary ? (
          <section className={s.section}>
            {tituloPerfil(basics) ? (
              <h2 className={s.sectionTitle}>
                <Icon name="user" />
                {tituloPerfil(basics)}
              </h2>
            ) : null}
            <p className={s.summary}>{basics.summary}</p>
          </section>
        ) : null}

        {main.map((section) => (
          <MainSection key={section.id} section={section} />
        ))}
      </main>
    </div>
  );
}
