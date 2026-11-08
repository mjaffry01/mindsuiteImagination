import { ArrowUp, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import logo from '../assets/logo.png';
import { SECTIONS, sectionHref } from './SiteNav.jsx';
import { contact } from '../data/company.js';

const iconProps = { 'aria-hidden': true, focusable: 'false' };

/** Site footer: brand and tagline, contact details, section links and a closing bar. */
export default function SiteFooter() {
  const tel = contact.phone.replace(/[^\d+]/g, '');
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a href="#top" className="footer-logo" aria-label="MindSuite — back to top">
            <img src={logo} alt="MindSuite" width="773" height="165" />
          </a>
          <p className="footer-tagline">
            {contact.tagline.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <a
            className="footer-social"
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="MindSuite on LinkedIn (opens in a new tab)"
          >
            <Linkedin {...iconProps} />
            MindSuite on LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="footer-col">
          <h2 className="footer-heading">Get in touch</h2>
          <address className="footer-contact">
            <a href={`mailto:${contact.email}`}>
              <span className="footer-icon"><Mail {...iconProps} /></span>
              <span>
                <small>Email</small>
                {contact.email}
              </span>
            </a>
            <a href={`tel:${tel}`}>
              <span className="footer-icon"><Phone {...iconProps} /></span>
              <span>
                <small>Phone</small>
                {contact.phone}
              </span>
            </a>
            <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
              <span className="footer-icon"><MapPin {...iconProps} /></span>
              <span>
                <small>Office</small>
                {contact.address.map((line) => (
                  <span className="footer-line" key={line}>{line}</span>
                ))}
              </span>
            </a>
          </address>
        </div>

        <nav className="footer-col" aria-label="Footer">
          <h2 className="footer-heading">Explore</h2>
          <ul className="footer-links">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={sectionHref(s)}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="footer-bar">
        <span>© {year} MindSuite. Connected capabilities. Clear outcomes.</span>
        <a href="#top" className="footer-top">
          Back to top <ArrowUp {...iconProps} />
        </a>
      </div>
    </footer>
  );
}
