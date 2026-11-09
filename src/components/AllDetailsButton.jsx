import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { offerings } from '../data/catalogue.js';
import { setAllOfferingDetails, useOpenOfferings } from '../lib/offeringDetails.js';
import { useT } from '../i18n/index.jsx';

/** One button to open every offering's details, or close them all. */
export default function AllDetailsButton() {
  const t = useT();
  const allOpen = useOpenOfferings().size >= offerings.length;
  const label = allOpen ? t('Hide all details') : t('Show all details');
  return (
    <button
      type="button"
      className="all-details"
      aria-label={label}
      title={label}
      aria-pressed={allOpen}
      onClick={() => setAllOfferingDetails(!allOpen)}
    >
      {allOpen ? <ChevronsDownUp aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
    </button>
  );
}
