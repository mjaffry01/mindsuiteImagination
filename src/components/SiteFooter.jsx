import { ArrowUp, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import logo from '../assets/logo.png';
import { SECTIONS, sectionHref } from './SiteNav.jsx';
import { contact } from '../data/company.js';
import { useT } from '../i18n/index.jsx';
import { openCookieSettings } from '../lib/consent.js';

const iconProps = { 'aria-hidden': true, focusable: 'false' };

/** Site footer: brand and tagline, contact details, section links and a closing bar. */
export default function SiteFooter({ onStartTour }) {
  const tel = contact.phone.replace(/[^\d+]/g, ''); // e.g. +919100005500
  const year = new Date().getFullYear();
  const t = useT();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a href="#top" className="footer-logo" aria-label={t('MindSuite — back to top')}>
            <img src={logo} alt="MindSuite" width="773" height="165" />
          </a>
          <p className="footer-tagline">
            {contact.tagline.map((line) => (
              <span key={line}>{t(line)}</span>
            ))}
          </p>
          <a
            className="footer-social"
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('MindSuite on LinkedIn (opens in a new tab)')}
          >
            <Linkedin {...iconProps} />
            {t('MindSuite on LinkedIn')} <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="footer-col">
          <h2 className="footer-heading">{t('Get in touch')}</h2>
          <address className="footer-contact">
            <a href={`mailto:${contact.email}`}>
              <span className="footer-icon"><Mail {...iconProps} /></span>
              <span>
                <small>{t('Email')}</small>
                <bdi dir="ltr">{contact.email}</bdi>
              </span>
            </a>
            <a href={`tel:${tel}`}>
              <span className="footer-icon"><Phone {...iconProps} /></span>
              <span>
                <small>{t('Phone')}</small>
                <bdi dir="ltr">{contact.phone}</bdi>
              </span>
            </a>
            <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
              <span className="footer-icon"><MapPin {...iconProps} /></span>
              <span>
                <small>{t('Office')}</small>
                {contact.address.map((line) => (
                  <span className="footer-line" key={line}>{t(line)}</span>
                ))}
              </span>
            </a>
          </address>
        </div>

        <nav className="footer-col" aria-label={t('Footer')}>
          <h2 className="footer-heading">{t('Explore')}</h2>
          <ul className="footer-links">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={sectionHref(s)}>{t(s.label)}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="footer-bar">
        <span>© {year} MindSuite. {t('Connected capabilities. Clear outcomes.')}</span>
        <span className="footer-legal">
          <a href="#/privacy">{t('Privacy and Cookies')}</a>
          <button type="button" className="footer-cookies" onClick={openCookieSettings}>
            {t('Cookie settings')}
          </button>
        </span>
        <button type="button" className="footer-tour" onClick={onStartTour}>
          {t('Take a tour')}
        </button>
        <a href="#top" className="footer-top">
          {t('Back to top')} <ArrowUp {...iconProps} />
        </a>
      </div>
    </footer>
  );
}
