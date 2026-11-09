import { about, clients, ecosystem } from '../data/company.js';
import Icon from './Icon.jsx';
import { areaCount, families, offerings } from '../data/catalogue.js';
import { useT } from '../i18n/index.jsx';

const pad = (n) => String(n).padStart(2, '0');

/** Arrow link; renders as plain text until a destination is set in company.js. */
function ArrowLink({ link, className = 'section-link' }) {
  const t = useT();
  if (!link) return null;
  const content = (
    <>
      {t(link.label)}
      <span aria-hidden="true">↗</span>
    </>
  );
  return link.href ? (
    <a className={className} href={link.href}>
      {content}
    </a>
  ) : (
    <span className={`${className} is-pending`} title={t('Link to be added')}>
      {content}
    </span>
  );
}

function SectionIntro({ id, eyebrow, title, children }) {
  const t = useT();
  const lines = Array.isArray(title) ? title : [title];
  return (
    <div className="section-intro">
      <div className="section-eyebrow">{t(eyebrow)}</div>
      <h2 id={id}>
        {lines.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {t(line)}
          </span>
        ))}
      </h2>
      {children}
    </div>
  );
}

/** Logo image when supplied, otherwise a neutral wordmark placeholder. */
function Logo({ name, src, className }) {
  return src ? (
    <img className={className} src={src} alt={name} loading="lazy" />
  ) : (
    <span className={`${className} logo-placeholder`} role="img" aria-label={name}>
      {name}
    </span>
  );
}

export function PlatformEcosystem() {
  const t = useT();
  return (
    <section className="company-section ecosystem-section" id="platforms" aria-labelledby="platforms-title">
      <div className="company-inner">
        <div className="section-head">
          <SectionIntro id="platforms-title" eyebrow={ecosystem.eyebrow} title={ecosystem.title} />
          <div className="section-aside">
            <p className="section-lead">{t(ecosystem.lead)}</p>
            <ArrowLink link={ecosystem.link} />
          </div>
        </div>
        <ul className="platform-list">
          {ecosystem.platforms.map((p, i) => (
            <li key={p.name}>
              <a className="platform-card" href={`#${p.area}`} aria-label={`${p.name}: ${t(p.caption)}`}>
                <span className="card-kicker">{pad(i + 1)} / {t('Platform')}</span>
                <Logo className="platform-logo" name={p.name} src={p.logo} />
                <strong>{t(p.caption)}</strong>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function About() {
  const t = useT();
  const facts = [
    { value: families.length, label: t('service families') },
    { value: offerings.length, label: t('defined offerings') },
    { value: areaCount, label: t('service areas') },
    ...about.facts.map((f) => ({ value: t(f.value), label: t(f.label) })),
  ];
  return (
    <section className="company-section about-section" id="about" aria-labelledby="about-title">
      <div className="company-inner">
        <div className="about-head">
          <SectionIntro id="about-title" eyebrow={about.eyebrow} title={about.title}>
            <p className="section-lead">{t(about.lead)}</p>
          </SectionIntro>
          <ul className="about-facts">
            {facts.map((f) => (
              <li key={f.label}>
                <strong>{f.value}</strong>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <h3 className="about-subhead">{t('Our mission')}</h3>
        <ul className="about-mission">
          {about.mission.map((m, i) => (
            <li key={m.title} className={`mission-${i}`}>
              <strong>{t(m.title)}</strong>
              <span>{t(m.text)}</span>
            </li>
          ))}
        </ul>

        <h3 className="about-subhead">{t('How we work')}</h3>
        <ul className="about-principles">
          {about.principles.map((p) => (
            <li key={p.title}>
              <span className="about-icon" aria-hidden="true">
                <Icon name={p.icon} />
              </span>
              <strong>{t(p.title)}</strong>
              <p>{t(p.text)}</p>
            </li>
          ))}
        </ul>

        <div className="about-journey">
          <span className="about-journey-label">{t('One delivery journey')}</span>
          <ol>
            {about.journey.map((step, i) => (
              <li key={step}>
                <span aria-hidden="true">{i + 1}</span>
                {t(step)}
              </li>
            ))}
          </ol>
        </div>

        <div className="about-actions">
          <a className="section-link" href="#leadership">
            {t('Meet the team')} <span aria-hidden="true">→</span>
          </a>
          <a className="section-link" href="#catalogue">
            {t('Explore our offerings')} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function Clients() {
  const t = useT();
  return (
    <section className="company-section clients-section" id="clients" aria-labelledby="clients-title">
      <div className="company-inner clients-layout">
        <SectionIntro id="clients-title" eyebrow={clients.eyebrow} title={clients.title}>
          <p className="section-lead">{t(clients.lead)}</p>
        </SectionIntro>
        <ul className="client-grid">
          {clients.list.map((c) => {
            const logo = <Logo className="client-logo" name={c.name} src={c.logo} />;
            return (
              <li key={c.name}>
                {c.url ? (
                  <a className="client-card" href={c.url} target="_blank" rel="noopener noreferrer">
                    {logo}
                  </a>
                ) : (
                  <div className="client-card">{logo}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
