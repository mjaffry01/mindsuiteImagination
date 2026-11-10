import { useEffect, useRef } from 'react';
import { Cookie, X } from 'lucide-react';
import { closeCookieSettings, setConsent, useConsent } from '../lib/consent.js';
import { useT } from '../i18n/index.jsx';

/**
 * Asks once whether the browser may remember display preferences. The site sets no cookies,
 * so this is the only choice there is to make. "Cookie settings" in the footer reopens it.
 */
export default function CookieBanner() {
  const t = useT();
  const { choice, settingsOpen } = useConsent();
  const ref = useRef(null);
  const show = !choice || settingsOpen;

  // Reopened from the footer: move focus here so keyboard users land on the choice.
  useEffect(() => {
    if (settingsOpen) ref.current?.focus();
  }, [settingsOpen]);

  if (!show) return null;
  return (
    <section ref={ref} className="cookie-banner" aria-labelledby="cookie-title" tabIndex={-1}>
      <Cookie className="cookie-icon" aria-hidden="true" />
      <div className="cookie-text">
        <h2 id="cookie-title">{t('Cookies and your privacy')}</h2>
        <p>
          {t('This site uses no cookies, analytics or trackers. With your permission, your browser can remember display choices, such as the hexagon order and smooth scrolling, for your next visit.')}{' '}
          <a href="#/privacy">{t('Privacy and Cookies')}</a>
        </p>
        {choice && (
          <p className="cookie-current">
            {choice.preferences ? t('Right now: display choices are remembered.') : t('Right now: only essentials are saved.')}
          </p>
        )}
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-allow" onClick={() => setConsent(true)}>
          {t('Allow')}
        </button>
        <button type="button" className="cookie-essential" onClick={() => setConsent(false)}>
          {t('Essential only')}
        </button>
      </div>
      {choice && (
        <button type="button" className="cookie-close" aria-label={t('Close')} onClick={closeCookieSettings}>
          <X aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
