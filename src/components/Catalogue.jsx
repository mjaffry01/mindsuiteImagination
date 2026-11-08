import { memo } from 'react';
import Icon from './Icon.jsx';
import { families } from '../data/catalogue.js';

const ORDINALS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

const Offering = memo(function Offering({ offering, family, added, onToggle }) {
  const n = offering.id.split('-')[1];
  return (
    <article
      className="offering"
      id={offering.id}
      data-family={family.index}
      aria-labelledby={`offering-title-${n}`}
    >
      <div className="offering-heading">
        <button
          type="button"
          className="interest-button"
          aria-pressed={added}
          aria-label={`I'm interested in ${offering.name}`}
          onClick={() => onToggle(offering.id)}
        >
          <Icon name={added ? 'Check' : 'Plus'} />
          {added ? 'Added' : "I'm interested"}
        </button>
        <div className="offering-icon" aria-hidden="true">
          <Icon name={offering.icon} />
        </div>
        <div>
          <div className="offering-id">{offering.number}</div>
          <h4 id={`offering-title-${n}`}>{offering.name}</h4>
        </div>
      </div>
      <p className="definition">{offering.definition}</p>
      <dl>
        <div>
          <dt>
            <Icon name="ScanLine" />
            Typical scope
          </dt>
          <dd>{offering.scope}</dd>
        </div>
        <div>
          <dt>
            <Icon name="PackageCheck" />
            What you receive
          </dt>
          <dd>{offering.deliverables}</dd>
        </div>
      </dl>
      <div className="business-value">
        <span>
          <Icon name="TrendingUp" />
          Business value
        </span>
        <p>{offering.value}</p>
      </div>
    </article>
  );
});

/** The continuous catalogue: five family sections, each with its service areas and offerings. */
export default function Catalogue({ interests, onToggle }) {
  return families.map((family) => (
    <section
      key={family.id}
      className={`family-section ${family.theme}`}
      id={family.id}
      aria-labelledby={`heading-${family.id}`}
    >
      <header className="family-header">
        <div className="family-number">
          <span>
            {ORDINALS[family.index]} / {WORDS[families.length]} CONNECTED FAMILIES
          </span>
          <span>{family.count} offerings</span>
        </div>
        <h2 id={`heading-${family.id}`}>{family.name}</h2>
        <p>{family.tagline}</p>
      </header>

      {family.areas.map((area) => (
        <section
          key={area.id}
          className="area-section"
          id={area.id}
          aria-labelledby={`heading-${area.id}`}
        >
          <div className="connection">
            <span>{family.name}</span>
            <span className="arrow" aria-hidden="true">→</span>
            <span>{area.stage}</span>
            <span className="arrow" aria-hidden="true">→</span>
            <span>{area.name}</span>
          </div>
          <h3 className="area-heading" id={`heading-${area.id}`}>
            <Icon name={area.icon} />
            {area.name}
          </h3>
          {area.offerings.map((o) => (
            <Offering
              key={o.id}
              offering={o}
              family={family}
              added={interests.has(o.id)}
              onToggle={onToggle}
            />
          ))}
        </section>
      ))}

      <p className="family-end">
        Definitions and typical scope are guidance. Final deliverables, acceptance criteria and ownership
        are agreed in the proposal.
      </p>
    </section>
  ));
}
