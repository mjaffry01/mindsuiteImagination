import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Linkedin, Maximize2, X } from 'lucide-react';
import { GROUPS, intro, leaders, team } from '../data/team.js';
import { useT } from '../i18n/index.jsx';

const PREVIEW = 15; // people shown under "All" before "Show everyone"

const initials = (name) =>
  name
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const groupClass = (group) => `grp-${GROUPS.indexOf(group)}`;

/** Photo when available (and loadable), otherwise tinted initials. */
function Avatar({ person, className }) {
  const [failed, setFailed] = useState(false);
  if (person.photo && !failed) {
    return (
      <img
        className={className}
        src={person.photo}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={`${className} avatar-initials`} aria-hidden="true">
      {initials(person.name)}
    </span>
  );
}

function LeaderCard({ leader, index, onOpen }) {
  const t = useT();
  return (
    <li className={`leader-card tone-${index % 4}`}>
      <button
        type="button"
        className="leader-portrait"
        onClick={() => onOpen(leader, index)}
        aria-label={t('Enlarge photo of {name}', { name: leader.name })}
        title={t('Click to enlarge')}
      >
        <Avatar person={leader} className="leader-portrait-img" />
        <span className="leader-zoom" aria-hidden="true">
          <Maximize2 />
        </span>
      </button>
      <div className="leader-info">
        <span className="leader-area">{t(leader.area)}</span>
        <h4>{leader.name}</h4>
        <p>{t(leader.role)}</p>
        <a
          className="leader-linkedin"
          href={leader.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('{name} on LinkedIn (opens in a new tab)', { name: leader.name })}
        >
          <Linkedin aria-hidden="true" />
          LinkedIn
          <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}

/** Large photo view for a leader; closes with ✕, Esc or a click outside the photo card. */
function LeaderLightbox({ leader, tone, onClose }) {
  const t = useT();
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (leader && !dialog.open) dialog.showModal();
    if (!leader && dialog.open) dialog.close();
  }, [leader]);
  useEffect(() => {
    const dialog = ref.current;
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`leader-lightbox tone-${tone}`}
      aria-label={leader ? t('{name}, photo', { name: leader.name }) : t('Leader photo')}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {leader && (
        <figure>
          <Avatar person={leader} className="leader-lightbox-img" />
          <figcaption>
            <span className="leader-area">{t(leader.area)}</span>
            <strong>{leader.name}</strong>
            <span>{t(leader.role)}</span>
            <a href={leader.linkedin} target="_blank" rel="noopener noreferrer" className="leader-linkedin">
              <Linkedin aria-hidden="true" />
              LinkedIn
              <ArrowUpRight aria-hidden="true" />
            </a>
          </figcaption>
          <button type="button" className="leader-lightbox-close" aria-label={t('Close')} onClick={onClose} autoFocus>
            <X aria-hidden="true" />
          </button>
        </figure>
      )}
    </dialog>
  );
}

function PersonCard({ person, delay }) {
  const t = useT();
  return (
    <li className={`person-card ${groupClass(person.groups[0])}`} style={{ animationDelay: `${delay}ms` }}>
      <Avatar person={person} className="person-avatar" />
      <div className="person-text">
        <strong>{person.name}</strong>
        <span>{t(person.role)}</span>
        <span className="person-tags">
          {person.groups.map((g) => (
            <em key={g} className={groupClass(g)}>
              {t(g)}
            </em>
          ))}
        </span>
      </div>
      <a
        className="person-linkedin"
        href={person.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('{name} on LinkedIn (opens in a new tab)', { name: person.name })}
        title={t('View LinkedIn profile')}
      >
        <Linkedin aria-hidden="true" />
      </a>
    </li>
  );
}

/** Leadership and the delivery team together: portraits up top, a filterable team grid below. */
export default function Team() {
  const [group, setGroup] = useState('All');
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(null); // { leader, index } while the large photo is open
  const closeZoom = useCallback(() => setZoomed(null), []);

  const filtered = group === 'All' ? team : team.filter((p) => p.groups.includes(group));
  const visible = group === 'All' && !expanded ? filtered.slice(0, PREVIEW) : filtered;
  const counts = Object.fromEntries(GROUPS.map((g) => [g, team.filter((p) => p.groups.includes(g)).length]));

  return (
    <section className="team-section" id="leadership" aria-labelledby="team-title">
      <div className="team-glow" aria-hidden="true" />
      <div className="company-inner">
        <header className="team-intro">
          <div>
            <span className="section-eyebrow">{t(intro.eyebrow)}</span>
            <h2 id="team-title">{t(intro.title)}</h2>
            <p className="section-lead">{t(intro.lead)}</p>
          </div>
          <ul className="team-stats" aria-label={t('Team at a glance')}>
            <li>
              <strong>{leaders.length}</strong> {t('leaders')}
            </li>
            <li>
              <strong>{team.length}</strong> {t('delivery team')}
            </li>
            <li>
              <strong>{GROUPS.length}</strong> {t('practices')}
            </li>
          </ul>
        </header>

        <h3 className="team-subhead">
          <span>{t('Leadership')}</span> {t('Executive team')}
        </h3>
        <ul className="leader-grid">
          {leaders.map((l, i) => (
            <LeaderCard key={l.name} leader={l} index={i} onOpen={(leader, index) => setZoomed({ leader, index })} />
          ))}
        </ul>
        <LeaderLightbox
          leader={zoomed?.leader}
          tone={(zoomed?.index ?? 0) % 4}
          onClose={closeZoom}
        />

        <div className="team-subhead-row">
          <h3 className="team-subhead" id="delivery-team">
            <span>{t('Delivery team')}</span> {t('Consulting, engineering, operations and platform delivery')}
          </h3>
          <div className="team-filters" role="group" aria-label={t('Filter the delivery team')}>
            {['All', ...GROUPS].map((g) => (
              <button
                type="button"
                key={g}
                className={g === 'All' ? undefined : groupClass(g)}
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
              >
                {t(g)}
                <span>{g === 'All' ? team.length : counts[g]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Re-keyed on filter change so the cards replay their entrance animation. */}
        <ul className="person-grid" key={group} aria-live="polite">
          {visible.map((p, i) => (
            <PersonCard key={p.name} person={p} delay={Math.min(i, 14) * 30} />
          ))}
        </ul>

        {group === 'All' && filtered.length > PREVIEW && (
          <div className="team-more">
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
              {expanded ? t('Show fewer') : t('Show everyone · {count} more', { count: filtered.length - PREVIEW })}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
