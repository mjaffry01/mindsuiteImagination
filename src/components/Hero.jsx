import { ChevronDown } from 'lucide-react';
import Globe from './Globe.jsx';
import DotField from './DotField.jsx';
import { areaCount, families, offerings } from '../data/catalogue.js';
import { clients } from '../data/company.js';

const STATS = [
  { value: families.length, label: 'service families' },
  { value: areaCount, label: 'service areas' },
  { value: offerings.length, label: 'defined offerings' },
];

export default function Hero({ playing, onToggleMotion }) {
  return (
    <div className="opening-screen">
      <section className="hero globe-scene" aria-labelledby="hero-title">
        <Globe playing={playing} />
        <DotField />
        <div className="hero-content">
          <div className="eyebrow">Build. Run. Protect. Transform.</div>
          <h1 id="hero-title">
            Architect <span className="lavender">Intelligence.</span>
            <br />
            Integrate <span className="cyan">Securely.</span>
            <br />
            Transform <span className="pink">Business.</span>
          </h1>
          <p>
            Explore MindSuite’s connected capabilities - from software and AI to cybersecurity, platform
            engineering, ERP and business systems, IT staffing, managed services, support and business
            transformation. Scroll to discover each offering, what it includes and the outcomes it delivers.
          </p>
          <a className="cta" href="#catalogue">
            Explore our offerings <span aria-hidden="true">↓</span>
          </a>
          {/* Shown on smaller screens, where the header has no room for the mission. */}
          <div className="mission hero-mission">
            <div className="eyebrow">Our mission</div>
            <p>
              <span>Our Customers’ Success.</span>
              <span>Our People’s Passion.</span>
              <span>Our World’s Progress.</span>
            </p>
          </div>
        </div>

        <a className="scroll-cue" href="#catalogue">
          <span>Scroll to explore</span>
          <ChevronDown aria-hidden="true" />
        </a>

        <button className="motion" type="button" aria-pressed={!playing} onClick={onToggleMotion}>
          {playing ? 'Pause motion' : 'Resume motion'}
        </button>
      </section>

      {/* Proof strip: scale of the catalogue and who we work with, right at the fold. */}
      <div className="proof-strip">
        <ul className="proof-stats" aria-label="Catalogue at a glance">
          {STATS.map((s) => (
            <li key={s.label}>
              <strong>{s.value}</strong> {s.label}
            </li>
          ))}
        </ul>
        <div className="proof-clients">
          <span className="proof-label">Trusted by</span>
          <ul aria-label="Clients">
            {clients.list.slice(0, 6).map((c) => (
              <li key={c.name}>
                {c.logo ? <img src={c.logo} alt={c.name} loading="lazy" /> : <span>{c.name}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
