import { useState } from 'react';
import logo from '../assets/logo.png';
import { useLanguage } from '../i18n/index.jsx';
import { printOfferings } from '../lib/offeringDocument.js';
import { offeringSlug, sharedUrl } from './useRoute.js';
import { offerings as allOfferings } from '../data/catalogue.js';
import { leaders, team } from '../data/team.js';

// Calculated from the site's own data, as on the home page.
const STATS = {
  offerings: allOfferings.length,
  deliverables: allOfferings.reduce((sum, o) => sum + o.deliverables.split(';').filter((d) => d.trim()).length, 0),
  team: leaders.length + team.length,
};

const fileBase = (list) => (list.length === 1 ? `MindSuite-${offeringSlug(list[0])}` : 'MindSuite-offerings');

/** PDF (through the browser's print window) and Word downloads for one or many offerings. */
export default function useOfferingDocs() {
  const { t, lang, dir } = useLanguage();
  const [preparing, setPreparing] = useState(false);
  const [failed, setFailed] = useState(false);

  const savePdf = (list) => {
    setFailed(false);
    printOfferings(list, { t, lang, dir, logoUrl: logo, stats: STATS, url: sharedUrl(list) }, fileBase(list)).catch(() => setFailed(true));
  };

  const saveWord = async (list) => {
    setPreparing(true);
    setFailed(false);
    try {
      const [{ buildWordDocument }, logoResponse] = await Promise.all([import('../lib/offeringWord.js'), fetch(logo)]);
      const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
      const blob = await buildWordDocument(list, { t, lang, dir, logoBytes, stats: STATS, url: sharedUrl(list) });
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: `${fileBase(list)}.docx` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Could not create the Word document', err);
      setFailed(true);
    } finally {
      setPreparing(false);
    }
  };

  return { savePdf, saveWord, preparing, failed };
}
