import { clients, ecosystem, leadership, process } from '../data/company.js';

const pad = (n) => String(n).padStart(2, '0');
const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Arrow link; renders as plain text until a destination is set in company.js. */
function ArrowLink({ link, className = 'section-link' }) {
  if (!link) return null;
  const content = (
    <>
      {link.label}
      <span aria-hidden="true">↗</span>
    </>
  );
  return link.href ? (
    <a className={className} href={link.href}>
      {content}
    </a>
  ) : (
    <span className={`${className} is-pending`} title="Link to be added">
      {content}
    </span>
  );
}

function SectionIntro({ id, eyebrow, title, children }) {
  const lines = Array.isArray(title) ? title : [title];
  return (
    <div className="section-intro">
      <div className="section-eyebrow">{eyebrow}</div>
      <h2 id={id}>
        {lines.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {line}
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

export function ProcessStages() {
  return (
    <section className="company-section process-section" id="how-we-work" aria-labelledby="process-title">
      <div className="company-inner">
        <SectionIntro id="process-title" eyebrow={process.eyebrow} title={process.title}>
          <p className="section-lead">{process.lead}</p>
        </SectionIntro>
        <ol className="stage-list">
          {process.stages.map((stage, i) => (
            <li key={stage.name} className={`stage tone-${i % 3}`}>
              <span className="stage-number">{pad(i + 1)}</span>
              <h3>{stage.name}</h3>
              <p>{stage.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PlatformEcosystem() {
  return (
    <section className="company-section ecosystem-section" id="platforms" aria-labelledby="platforms-title">
      <div className="company-inner">
        <div className="section-head">
          <SectionIntro id="platforms-title" eyebrow={ecosystem.eyebrow} title={ecosystem.title} />
          <div className="section-aside">
            <p className="section-lead">{ecosystem.lead}</p>
            <ArrowLink link={ecosystem.link} />
          </div>
        </div>
        <ul className="platform-list">
          {ecosystem.platforms.map((p, i) => (
            <li key={p.name}>
              <a className="platform-card" href={`#${p.area}`} aria-label={`${p.name}: ${p.caption}`}>
                <span className="card-kicker">{pad(i + 1)} / Platform</span>
                <Logo className="platform-logo" name={p.name} src={p.logo} />
                <strong>{p.caption}</strong>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Clients() {
  return (
    <section className="company-section clients-section" id="clients" aria-labelledby="clients-title">
      <div className="company-inner clients-layout">
        <SectionIntro id="clients-title" eyebrow={clients.eyebrow} title={clients.title}>
          <p className="section-lead">{clients.lead}</p>
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

export function Leadership() {
  return (
    <section className="company-section leadership-section" id="leadership" aria-labelledby="leadership-title">
      <div className="company-inner">
        <div className="section-head">
          <SectionIntro id="leadership-title" eyebrow={leadership.eyebrow} title={leadership.title} />
          <div className="section-aside">
            <p className="section-lead">{leadership.lead}</p>
            <ArrowLink link={leadership.link} />
          </div>
        </div>
        <ul className="leader-list">
          {leadership.leaders.map((l, i) => (
            <li key={l.name} className={`leader tone-${i % 3}`}>
              {l.photo ? (
                <img className="leader-photo" src={l.photo} alt={l.name} loading="lazy" />
              ) : (
                <span className="leader-photo leader-initials" aria-hidden="true">
                  {initials(l.name)}
                </span>
              )}
              <div className="leader-body">
                <span className="leader-area">{l.area}</span>
                <h3>{l.name}</h3>
                <p>{l.role}</p>
                {l.linkedin ? (
                  <a
                    className="leader-link"
                    href={l.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${l.name} on LinkedIn (opens in a new tab)`}
                  >
                    View LinkedIn profile <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="leader-link is-pending" title="Link to be added">
                    View LinkedIn profile <span aria-hidden="true">↗</span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
