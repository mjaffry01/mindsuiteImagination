import { useEffect } from 'react';
import { Cookie, Mail, MapPin, Trash2 } from 'lucide-react';
import DotField from './DotField.jsx';
import Globe from './Globe.jsx';
import { contact } from '../data/company.js';
import {
  GRIEVANCE_OFFICER,
  PRIVACY_EFFECTIVE,
  PRIVACY_EMAIL,
  PRIVACY_VERSION,
  STORAGE_ROWS,
  privacySections,
} from '../data/privacy.js';
import { isBackendConfigured } from '../lib/enquiry.js';
import { clearSiteStorage, openCookieSettings, useConsent } from '../lib/consent.js';
import { useLanguage } from '../i18n/index.jsx';

const LOCALES = { en: 'en-GB', ar: 'ar-SA-u-nu-latn', fr: 'fr-FR' };
const sections = privacySections({ server: isBackendConfigured(), remoteGuide: Boolean(import.meta.env.VITE_ASSISTANT_URL) });

/** Privacy and Cookies notice: what the site collects, why, and the visitor's choices. */
export default function Privacy({ playing, onToggleMotion }) {
  const { t, lang } = useLanguage();
  const { choice } = useConsent();
  const effective = new Date(`${PRIVACY_EFFECTIVE}T00:00:00`).toLocaleDateString(LOCALES[lang] || 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const block = (b, i) => {
    if (b.p) return <p key={i}>{t(b.p)}</p>;
    if (b.items)
      return (
        <ul key={i}>
          {b.items.map((item) => (
            <li key={item}>{t(item)}</li>
          ))}
        </ul>
      );
    if (b.storage)
      return (
        <div key={i} className="privacy-table-wrap">
          <table className="privacy-table">
            <thead>
              <tr>
                <th scope="col">{t('What is saved')}</th>
                <th scope="col">{t('Why')}</th>
                <th scope="col">{t('When')}</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_ROWS.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{t(row.name)}</th>
                  <td>{t(row.use)}</td>
                  <td>
                    <span className={`privacy-kind${row.kind === 'Essential' ? '' : ' is-optional'}`}>{t(row.kind)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    if (b.controls)
      return (
        <div key={i} className="privacy-controls">
          <p className="privacy-status" role="status">
            {!choice
              ? t('You haven’t made a choice yet, so display choices are not saved.')
              : choice.preferences
                ? t('Right now: display choices are remembered.')
                : t('Right now: only essentials are saved.')}
          </p>
          <button type="button" className="careers-btn primary" onClick={openCookieSettings}>
            <Cookie aria-hidden="true" /> {t('Cookie settings')}
          </button>
          <button type="button" className="careers-btn ghost" onClick={clearSiteStorage}>
            <Trash2 aria-hidden="true" /> {t('Clear everything saved')}
          </button>
        </div>
      );
    if (b.contact)
      return (
        <address key={i} className="privacy-contact">
          <strong>{t(GRIEVANCE_OFFICER)}</strong>
          <span>MindSuite Informatics Private Limited</span>
          <span className="privacy-contact-line">
            <MapPin aria-hidden="true" />
            <span>{contact.address.map((line) => t(line)).join(', ')}</span>
          </span>
          <a className="privacy-contact-line" href={`mailto:${PRIVACY_EMAIL}`}>
            <Mail aria-hidden="true" />
            <bdi dir="ltr">{PRIVACY_EMAIL}</bdi>
          </a>
        </address>
      );
    return null;
  };

  return (
    <main className="careers-page privacy-page" id="main-content" tabIndex={-1}>
      <section className="hero careers-hero privacy-hero globe-scene" aria-labelledby="privacy-title">
        <Globe playing={playing} />
        <DotField />
        <button className="motion" type="button" aria-pressed={!playing} onClick={onToggleMotion}>
          {playing ? t('Pause motion') : t('Resume motion')}
        </button>
        <div className="hero-content careers-hero-inner">
          <div className="eyebrow">{t('Privacy notice')}</div>
          <h1 id="privacy-title">{t('Privacy and Cookies')}</h1>
          <p>{t('How MindSuite handles your data on this website, in plain words. No cookies, no trackers, and nothing collected that you don’t send us.')}</p>
          <p className="privacy-meta">{t('Version {version} · effective {date}', { version: PRIVACY_VERSION, date: effective })}</p>
        </div>
      </section>

      <div className="careers-section privacy-body">
        <div className="careers-inner privacy-layout">
          <nav className="privacy-toc" aria-label={t('On this page')}>
            <span className="careers-kicker">{t('On this page')}</span>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#privacy-${s.id}`}>{t(s.title)}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="privacy-text">
            {sections.map((s, n) => (
              <section key={s.id} id={`privacy-${s.id}`} aria-labelledby={`privacy-${s.id}-title`}>
                <h2 id={`privacy-${s.id}-title`}>
                  <span className="privacy-num" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                  {t(s.title)}
                </h2>
                {s.blocks.map(block)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
