import { FileDown, FileText } from 'lucide-react';
import ShareMenu from './ShareMenu.jsx';
import useOfferingDocs from '../hooks/useOfferingDocs.js';
import { useT } from '../i18n/index.jsx';

/** Share, PDF and Word for a set of offerings: the enquiry list and the shared page. */
export default function OfferingDocActions({ offerings }) {
  const t = useT();
  const { savePdf, saveWord, preparing, failed } = useOfferingDocs();
  const empty = offerings.length === 0;
  return (
    <div className="doc-actions">
      <ShareMenu offerings={offerings} label={t('Share')} disabled={empty} />
      <button type="button" className="doc-button" disabled={empty} onClick={() => savePdf(offerings)}>
        <FileDown aria-hidden="true" /> PDF
      </button>
      <button type="button" className="doc-button" disabled={empty || preparing} onClick={() => saveWord(offerings)}>
        <FileText aria-hidden="true" /> {preparing ? t('Preparing…') : 'Word'}
      </button>
      <p className="doc-error" role="status">
        {failed ? t('The document could not be created. Please try again.') : ''}
      </p>
    </div>
  );
}
