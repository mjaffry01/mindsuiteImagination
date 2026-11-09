import { memo, useEffect } from 'react';
import Icon from './Icon.jsx';
import ShareMenu from './ShareMenu.jsx';
import { families } from '../data/catalogue.js';
import { useT } from '../i18n/index.jsx';
import { startCatalogueStages, useCatalogueProgress } from '../lib/catalogueStages.js';

const ORDINALS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

/** "Assess risks; review code; define roadmap." → a bulleted list of the separate items. */
function ItemList({ text }) {
  const items = text
    .split(';')
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  // A single sentence reads better as plain text than as a one-bullet list.
  if (items.length < 2) return <p className="offering-text">{text}</p>;
  return (
    <ul className="offering-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function OfferingActions({ offering, added, onToggle }) {
  const t = useT();
  return (
    <>
      <button
        type="button"
        className="interest-button"
        aria-pressed={added}
        aria-label={t('Add {name} to your enquiry', { name: offering.name })}
        title={t('Collect offerings here, then request one proposal for all of them.')}
        onClick={() => onToggle(offering.id)}
      >
        <Icon name={added ? 'Check' : 'Plus'} />
        {added ? t('Added to enquiry') : t('Add to enquiry')}
      </button>
      <ShareMenu offering={offering} />
    </>
  );
}

export const Offering = memo(function Offering({ offering, family, added, onToggle }) {
  const t = useT();
  const n = offering.id.split('-')[1];
  const deliverables = offering.deliverables.split(';').filter((d) => d.trim()).length;
  return (
    <article
      className="offering"
      id={offering.id}
      data-family={family.index}
      aria-labelledby={`offering-title-${n}`}
    >
      <div className="offering-heading">
        <div className="offering-icon" aria-hidden="true">
          <Icon name={offering.icon} />
        </div>
        <div className="offering-title">
          <div className="offering-id">{offering.number}</div>
          <h4 id={`offering-title-${n}`}>{offering.name}</h4>
          {/* The "why" comes first: business value sits directly under the name. */}
          <p className="offering-value">
            <Icon name="TrendingUp" />
            <span>
              <span className="visually-hidden">{t('Business value:')} </span>
              {offering.value}
            </span>
          </p>
        </div>
        <div className="offering-actions">
          <OfferingActions offering={offering} added={added} onToggle={onToggle} />
        </div>
      </div>
      <p className="definition">{offering.definition}</p>
      <dl>
        <div>
          <dt>
            <Icon name="ScanLine" />
            {t('Typical scope')}
          </dt>
          <dd>
            <ItemList text={offering.scope} />
          </dd>
        </div>
        <div>
          <dt>
            <Icon name="PackageCheck" />
            {t('What you receive')}
            {deliverables > 1 && <span className="offering-count">{deliverables}</span>}
          </dt>
          <dd>
            <ItemList text={offering.deliverables} />
          </dd>
        </div>
      </dl>
      {/* Phones: the actions come after the details, where the reader's thumb already is. */}
      <div className="offering-foot">
        <OfferingActions offering={offering} added={added} onToggle={onToggle} />
      </div>
    </article>
  );
});

/** The continuous catalogue: five family sections, each with its service areas and offerings. */
export default function Catalogue({ interests, onToggle }) {
  const t = useT();
  const limit = useCatalogueProgress();
  useEffect(startCatalogueStages, []);

  let left = limit; // cards still allowed on the page in this pass
  return families.map((family) => {
    if (left <= 0) return null;
    let complete = true;
    const areas = family.areas.map((area) => {
      if (left <= 0) {
        complete = false;
        return null;
      }
      const shown = area.offerings.slice(0, left);
      left -= shown.length;
      if (shown.length < area.offerings.length) complete = false;
      return { area, shown };
    });
    return (
    <section
      key={family.id}
      className={`family-section ${family.theme}`}
      id={family.id}
      aria-labelledby={`heading-${family.id}`}
    >
      <header className="family-header">
        <div className="family-number">
          <span>
            {ORDINALS[family.index]} / {t(`${WORDS[families.length]} CONNECTED FAMILIES`)}
          </span>
          <span>{t('{count} offerings', { count: family.count })}</span>
        </div>
        <h2 id={`heading-${family.id}`}>{family.name}</h2>
        <p>{family.tagline}</p>
      </header>

      {areas.filter(Boolean).map(({ area, shown }) => (
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
          {shown.map((o) => (
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

      {complete && <p className="family-end">
        {t(
          'Definitions and typical scope are guidance. Final deliverables, acceptance criteria and ownership are agreed in the proposal.'
        )}
      </p>}
    </section>
    );
  });
}
