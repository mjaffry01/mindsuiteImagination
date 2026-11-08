import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Briefcase, Clock, MapPin, Search as SearchIcon, Send, X } from 'lucide-react';
import Icon from './Icon.jsx';
import DotField from './DotField.jsx';
import Globe from './Globe.jsx';
import { DISCIPLINES, careersContact, hero, openings, perks, steps } from '../data/careers.js';
import { leaders, team } from '../data/team.js';
import { useLanguage, useT } from '../i18n/index.jsx';

const peopleCount = leaders.length + team.length;
const teamSize = (group) => team.filter((p) => p.groups.includes(group)).length;

const mailto = (subject) =>
  `mailto:${careersContact.email}?subject=${encodeURIComponent(subject)}`;

const LOCALES = { en: 'en-GB', ar: 'ar-SA-u-nu-latn', fr: 'fr-FR' };
const formatDate = (iso, lang) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALES[lang] || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Side panel with the full role description; open state lives in the URL (#/careers/<id>). */
function RoleDrawer({ role, onClose }) {
  const ref = useRef(null);
  const { t, lang } = useLanguage();
  useEffect(() => {
    const dialog = ref.current;
    if (role && !dialog.open) dialog.showModal();
    if (!role && dialog.open) dialog.close();
  }, [role]);
  useEffect(() => {
    const dialog = ref.current;
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="role-drawer"
      aria-labelledby="role-title"
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {role && (
        <article>
          <header>
            <span className="role-discipline">{t(role.discipline)}</span>
            <h2 id="role-title">{role.title}</h2>
            <ul className="role-meta">
              <li><MapPin aria-hidden="true" />{role.location}</li>
              <li><Briefcase aria-hidden="true" />{t(role.workModel)} · {t(role.type)}</li>
              {role.experience && <li><Clock aria-hidden="true" />{role.experience}</li>}
            </ul>
            <button type="button" className="role-close" aria-label={t('Close')} onClick={onClose} autoFocus>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="role-body">
            {role.summary && <p className="role-summary">{role.summary}</p>}
            {[
              ['Responsibilities', role.responsibilities],
              ['Requirements', role.requirements],
              ['Nice to have', role.niceToHave],
            ]
              .filter(([, items]) => items?.length)
              .map(([title, items]) => (
                <section key={title}>
                  <h3>{t(title)}</h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
          <footer>
            {role.posted && <span>{t('Posted {date}', { date: formatDate(role.posted, lang) })}</span>}
            <a className="careers-btn primary" href={mailto(`Application: ${role.title}`)}>
              <Send aria-hidden="true" /> {t('Apply for this role')}
            </a>
          </footer>
        </article>
      )}
    </dialog>
  );
}

export default function Careers({ roleId, playing, onToggleMotion }) {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('All');
  const t = useT();

  // Arriving on the page starts at the top (unless the link opens a specific role).
  useEffect(() => {
    if (!roleId) window.scrollTo({ top: 0, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRole = openings.find((o) => o.id === roleId) || null;
  const closeRole = useCallback(() => {
    if (!location.hash.startsWith('#/careers/')) return;
    history.replaceState(null, '', '#/careers');
    dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return openings.filter(
      (o) =>
        (discipline === 'All' || o.discipline === discipline) &&
        (!q || [o.title, o.discipline, o.location, o.summary].join(' ').toLowerCase().includes(q))
    );
  }, [query, discipline]);

  const openCount = (name) => openings.filter((o) => o.discipline === name).length;
  const pickDiscipline = (name) => {
    setDiscipline(name);
    scrollToId('careers-openings');
  };

  return (
    <main className="careers-page">
      {/* Hero */}
      <section className="hero careers-hero globe-scene" aria-labelledby="careers-title">
        <Globe playing={playing} />
        <DotField />
        <button className="motion" type="button" aria-pressed={!playing} onClick={onToggleMotion}>
          {playing ? t('Pause motion') : t('Resume motion')}
        </button>
        <div className="hero-content careers-hero-inner">
          <div className="eyebrow">{t(hero.eyebrow)}</div>
          <h1 id="careers-title">
            {t(hero.title[0])}
            <br />
            <span className="cyan">{t(hero.title[1])}</span>
          </h1>
          <p>{t(hero.lead)}</p>
          <div className="careers-hero-actions">
            <button type="button" className="careers-btn primary" onClick={() => scrollToId('careers-openings')}>
              {t('See current openings')} <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className="careers-btn ghost" onClick={() => scrollToId('careers-why')}>
              {t('Working at MindSuite')}
            </button>
          </div>
          <ul className="careers-stats" aria-label={t('MindSuite at a glance')}>
            <li><strong>{peopleCount}</strong> {t('people listed')}</li>
            <li><strong>{DISCIPLINES.length}</strong> {t('disciplines')}</li>
            <li><strong>{openings.length}</strong> {openings.length === 1 ? t('open role') : t('open roles')}</li>
            <li><strong>{t('Hyderabad')}</strong> {t('India office')}</li>
          </ul>
        </div>
      </section>

      {/* Why MindSuite */}
      <section className="careers-section" id="careers-why" aria-labelledby="why-title">
        <div className="careers-inner">
          <span className="careers-kicker">{t('Why MindSuite')}</span>
          <h2 id="why-title">{t('What you can expect here.')}</h2>
          <ul className="perk-grid">
            {perks.map((p, i) => (
              <li key={p.title} className={`perk tone-${i % 4}`}>
                <span className="perk-icon"><Icon name={p.icon} /></span>
                <h3>{t(p.title)}</h3>
                <p>{t(p.text)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Disciplines */}
      <section className="careers-section alt" aria-labelledby="where-title">
        <div className="careers-inner">
          <span className="careers-kicker">{t('Where you could work')}</span>
          <h2 id="where-title">{t('One delivery team. Find your place in it.')}</h2>
          <ul className="discipline-grid">
            {DISCIPLINES.map((d, i) => (
              <li key={d.name}>
                <button type="button" className={`discipline-card tone-${i % 4}`} onClick={() => pickDiscipline(d.name)}>
                  <span className="discipline-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="perk-icon"><Icon name={d.icon} /></span>
                  <strong>{t(d.name)}</strong>
                  <small>{t(d.area)}</small>
                  <span className="discipline-foot">
                    <span>{t('{count} on the team', { count: teamSize(d.group) })}</span>
                    <span className={openCount(d.name) ? 'has-open' : undefined}>
                      {t('{count} open', { count: openCount(d.name) })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <a className="careers-link" href="#leadership">
            {t('Meet the team')} <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Openings */}
      <section className="careers-section" id="careers-openings" aria-labelledby="openings-title">
        <div className="careers-inner">
          <span className="careers-kicker">{t('Current openings')}</span>
          <h2 id="openings-title">{t('Find a role that fits your experience.')}</h2>

          <div className="openings-toolbar">
            <label className="openings-search">
              <SearchIcon aria-hidden="true" />
              <span className="visually-hidden">{t('Search job titles')}</span>
              <input
                type="search"
                placeholder={t('Search job titles, skills or locations')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="openings-filters" role="group" aria-label={t('Filter by discipline')}>
              {['All', ...DISCIPLINES.map((d) => d.name)].map((name) => (
                <button
                  type="button"
                  key={name}
                  aria-pressed={discipline === name}
                  onClick={() => setDiscipline(name)}
                >
                  {t(name)}
                  <span>{name === 'All' ? openings.length : openCount(name)}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length ? (
            <ul className="opening-list" aria-live="polite">
              {filtered.map((o) => (
                <li key={o.id}>
                  <a className="opening-card" href={`#/careers/${o.id}`}>
                    <div className="opening-main">
                      <span className="role-discipline">{t(o.discipline)}</span>
                      <h3>{o.title}</h3>
                      {o.summary && <p>{o.summary}</p>}
                    </div>
                    <ul className="role-meta">
                      <li><MapPin aria-hidden="true" />{o.location}</li>
                      <li><Briefcase aria-hidden="true" />{t(o.workModel)}</li>
                      {o.experience && <li><Clock aria-hidden="true" />{o.experience}</li>}
                    </ul>
                    <span className="opening-cta">
                      {t('View role')} <ArrowRight aria-hidden="true" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="openings-empty" role="status">
              <span className="perk-icon"><Icon name="Users" /></span>
              <h3>
                {openings.length
                  ? t('No openings match your search.')
                  : t('No open roles right now.')}
              </h3>
              <p>
                {openings.length
                  ? t('Try a broader term, or clear the discipline filter.')
                  : t('We still want to hear from people who would like to work on connected technology. Send your CV and the kind of role you are looking for, and we will be in touch when something fits.')}
              </p>
              <a className="careers-btn primary" href={mailto('CV: general application')}>
                <Send aria-hidden="true" /> {t('Send your CV')}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* How to apply */}
      <section className="careers-section alt" aria-labelledby="steps-title">
        <div className="careers-inner">
          <span className="careers-kicker">{t('Application steps')}</span>
          <h2 id="steps-title">{t('A clear starting point.')}</h2>
          <ol className="careers-steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="step-num">{i + 1}</span>
                <h3>{t(s.title)}</h3>
                <p>{t(s.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="careers-cta">
        <div className="careers-inner">
          <h2>{t('Don’t see your role?')}</h2>
          <p>{t('Tell us what you do best and where you would like to grow. We keep promising profiles on file for future openings.')}</p>
          <a className="careers-btn primary" href={mailto('CV: general application')}>
            <Send aria-hidden="true" /> {t('Send your CV to')} <bdi dir="ltr">{careersContact.email}</bdi>
          </a>
        </div>
      </section>

      <RoleDrawer role={openRole} onClose={closeRole} />
    </main>
  );
}
