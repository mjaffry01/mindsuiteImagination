import { Bot, Headset, PanelLeftOpen, Search as SearchIcon, ShoppingBag } from 'lucide-react';
import { useT } from '../i18n/index.jsx';

const toggleGuide = () => dispatchEvent(new Event('mindsuite:toggle-guide'));
const toggleExpert = () => dispatchEvent(new Event('mindsuite:toggle-expert'));

/** Phones and small tablets: the main actions in one bar at the bottom, within thumb reach. */
export default function MobileTabBar({ enquiryCount, onOpenMap, onOpenSearch, onOpenEnquiry }) {
  const t = useT();
  return (
    <nav className="mobile-tabs" aria-label={t('Quick actions')}>
      <button type="button" className="tab-offerings" aria-haspopup="dialog" onClick={onOpenMap}>
        <PanelLeftOpen aria-hidden="true" />
        {t('Offerings')}
      </button>
      <button type="button" className="tab-search" aria-haspopup="dialog" onClick={onOpenSearch}>
        <SearchIcon aria-hidden="true" />
        {t('Search')}
      </button>
      <button type="button" className="tab-guide" aria-haspopup="dialog" onClick={toggleGuide}>
        <Bot aria-hidden="true" />
        {t('Guide')}
      </button>
      <button
        type="button"
        className="tab-enquiry"
        aria-haspopup="dialog"
        aria-label={t('Your enquiry: {count} offerings', { count: enquiryCount })}
        onClick={onOpenEnquiry}
      >
        <span className="tab-icon">
          <ShoppingBag aria-hidden="true" />
          {enquiryCount > 0 && <span className="tab-badge">{enquiryCount}</span>}
        </span>
        {t('Enquiry')}
      </button>
      <button type="button" className="tab-expert" aria-haspopup="dialog" onClick={toggleExpert}>
        <Headset aria-hidden="true" />
        {t('Talk to us')}
      </button>
    </nav>
  );
}
