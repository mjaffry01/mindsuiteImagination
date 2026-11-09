import { ChevronDown } from 'lucide-react';
import Globe from './Globe.jsx';
import DotField from './DotField.jsx';
import { offerings } from '../data/catalogue.js';
import { clients } from '../data/company.js';
import { leaders, team } from '../data/team.js';
import { useT } from '../i18n/index.jsx';

// Calculated from the site's own data, so they stay true as the content changes.
const deliverableCount = offerings.reduce((sum, o) => sum + o.deliverables.split(';').filter((d) => d.trim()).length, 0);
const STATS = [
  { value: offerings.length, label: 'defined offerings' },
  { value: deliverableCount, label: 'named deliverables' },
  { value: leaders.length + team.length, label: 'team members' },
  { value: clients.list.length, label: 'client businesses' },
];

export default function Hero({ playing, onToggleMotion, onStartTour }) {
  const t = useT();
  return (
    <div className="opening-screen">
      <section className="hero globe-scene" aria-labelledby="hero-title">
        <Globe playing={playing} />
        <DotField />
        <div className="hero-content">
          <div className="eyebrow">{t('Build. Run. Protect. Transform.')}</div>
          <h1 id="hero-title">
            {t('Architect')} <span className="lavender">{t('Intelligence.')}</span>
            <br />
            {t('Integrate')} <span className="cyan">{t('Securely.')}</span>
            <br />
            {t('Transform')} <span className="pink">{t('Business.')}</span>
          </h1>
          <p>
            {t(
              'Explore MindSuite’s connected capabilities - from software and AI to cybersecurity, platform engineering, ERP and business systems, IT staffing, managed services, support and business transformation. Scroll to discover each offering, what it includes and the outcomes it delivers.'
            )}
          </p>
          <a className="cta" href="#catalogue">
            {t('Explore our offerings')} <span aria-hidden="true">↓</span>
          </a>
          <button type="button" className="cta cta-tour" onClick={onStartTour}>
            {t('Take a quick tour')}
          </button>
          {/* Shown on smaller screens, where the header has no room for the mission. */}
          <div className="mission hero-mission">
            <div className="eyebrow">{t('Our mission')}</div>
            <p>
              <span>{t('Our Customers’ Success.')}</span>
              <span>{t('Our People’s Passion.')}</span>
              <span>{t('Our World’s Progress.')}</span>
            </p>
          </div>
        </div>

        <a className="scroll-cue" href="#catalogue">
          <span>{t('Scroll to explore')}</span>
          <ChevronDown aria-hidden="true" />
        </a>

        <button className="motion" type="button" aria-pressed={!playing} onClick={onToggleMotion}>
          {playing ? t('Pause motion') : t('Resume motion')}
        </button>
      </section>

      {/* Proof strip: scale of the catalogue and who we work with, right at the fold. */}
      <div className="proof-strip">
        <ul className="proof-stats" aria-label={t('Catalogue at a glance')}>
          {STATS.map((s) => (
            <li key={s.label}>
              <strong>{s.value}</strong> {t(s.label)}
            </li>
          ))}
        </ul>
        <div className="proof-clients">
          <span className="proof-label">{t('Trusted by')}</span>
          <ul aria-label={t('Clients')}>
            {clients.list.slice(0, 6).map((c) => (
              <li key={c.name}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label={t('{name} (opens in a new tab)', { name: c.name })}>
                    {c.logo ? <img src={c.logo} alt="" loading="lazy" /> : <span>{c.name}</span>}
                  </a>
                ) : c.logo ? (
                  <img src={c.logo} alt={c.name} loading="lazy" />
                ) : (
                  <span>{c.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
