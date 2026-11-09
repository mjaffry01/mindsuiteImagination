import { useEffect, useMemo } from 'react';
import { Check, ClipboardList, Plus } from 'lucide-react';
import { Offering } from './Catalogue.jsx';
import OfferingDocActions from './OfferingDocActions.jsx';
import { offeringById } from '../data/catalogue.js';
import { navigate } from '../hooks/useRoute.js';
import { useLanguage } from '../i18n/index.jsx';

/** The offerings in a shared link (…/shared?o=12,45,88); unknown or repeated numbers are ignored. */
function offeringsFromAddress() {
  const numbers = new URLSearchParams(location.search).get('o')?.split(',') ?? [];
  const found = [...new Set(numbers)].map((n) => offeringById.get(`offering-${n.trim()}`)).filter(Boolean);
  return found;
}

export default function SharedOfferings({ interests, onToggle, onAddMany, onOpenEnquiry }) {
  const { t, lang } = useLanguage();
  // Recomputed for the language so names and descriptions follow the visitor's choice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(offeringsFromAddress, [lang]);
  const allAdded = list.length > 0 && list.every((o) => interests.has(o.id));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (!list.length) {
    return (
      <main className="shared-page" id="main-content" tabIndex={-1}>
        <header className="shared-hero">
          <h1>{t('This link has no valid offerings.')}</h1>
          <button type="button" className="enq-primary" onClick={() => navigate('main')}>
            {t('Browse all offerings')}
          </button>
        </header>
      </main>
    );
  }

  return (
    <main className="shared-page" id="main-content" tabIndex={-1}>
      <header className="shared-hero">
        <div className="eyebrow">{t('Offerings shared with you')}</div>
        <h1>{t(list.length === 1 ? '{count} MindSuite offering' : '{count} MindSuite offerings', { count: list.length })}</h1>
        <div className="shared-actions">
          <button
            type="button"
            className="enq-primary"
            disabled={allAdded}
            onClick={() => onAddMany(list.map((o) => o.id))}
          >
            {allAdded ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {allAdded ? t('Added to your enquiry') : t('Add all to my enquiry')}
          </button>
          <button type="button" className="doc-button" onClick={onOpenEnquiry}>
            <ClipboardList aria-hidden="true" /> {t('Request a proposal')}
          </button>
          <OfferingDocActions offerings={list} />
        </div>
      </header>
      <section className="family-section light shared-list" aria-label={t('Offerings shared with you')}>
        {list.map((o) => (
          <Offering key={o.id} offering={o} family={o.family} added={interests.has(o.id)} onToggle={onToggle} />
        ))}
        <button type="button" className="doc-button shared-browse" onClick={() => navigate('main')}>
          {t('Browse all offerings')}
        </button>
      </section>
    </main>
  );
}
