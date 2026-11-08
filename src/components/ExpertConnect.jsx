import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Headset, Linkedin, Mail, MessageCircle, Phone, Send, X } from 'lucide-react';
import { contact, expertChannels } from '../data/company.js';
import { useT } from '../i18n/index.jsx';

const CHANNELS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp chat',
    detail: 'Message our experts',
    icon: MessageCircle,
    href: expertChannels.whatsapp,
    external: true,
  },
  {
    key: 'telegram',
    label: 'Telegram chat',
    detail: 'Message our experts',
    icon: Send,
    href: expertChannels.telegram,
    external: true,
  },
  { key: 'call', label: 'Call us', detail: contact.phone, ltr: true, icon: Phone, href: expertChannels.call },
  { key: 'email', label: 'Email', detail: contact.email, ltr: true, icon: Mail, href: expertChannels.email },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    detail: 'Follow MindSuite',
    icon: Linkedin,
    href: expertChannels.linkedin,
    external: true,
  },
];

/** Floating "Talk to an expert" button with WhatsApp, Telegram, call, email and LinkedIn. */
export default function ExpertConnect() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`expert${open ? ' is-open' : ''}`} ref={rootRef}>
      <div className="expert-panel" id="expert-panel" role="dialog" aria-label={t('Talk to an expert')} hidden={!open}>
        <header>
          <span className="expert-avatar" aria-hidden="true">
            <Headset />
          </span>
          <div>
            <strong>{t('Talk to a MindSuite expert')}</strong>
            <span>{t('Choose how you would like to connect.')}</span>
          </div>
        </header>
        <ul>
          {CHANNELS.map(({ key, label, detail, ltr, icon: ChannelIcon, href, external }) => (
            <li key={key}>
              <a
                className={`expert-channel ch-${key}`}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={() => setOpen(false)}
              >
                <span className="expert-channel-icon" aria-hidden="true">
                  <ChannelIcon />
                </span>
                <span className="expert-channel-text">
                  <strong>{t(label)}</strong>
                  <small>{ltr ? <bdi dir="ltr">{detail}</bdi> : t(detail)}</small>
                </span>
                <ArrowUpRight className="expert-channel-go" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        ref={toggleRef}
        className="expert-toggle"
        aria-expanded={open}
        aria-controls="expert-panel"
        aria-label={open ? t('Close') : t('Talk to an expert')}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="expert-toggle-icon" aria-hidden="true">
          {open ? <X /> : <Headset />}
        </span>
        {!open && <span className="expert-online" aria-hidden="true" />}
        <span className="expert-toggle-label" aria-hidden="true">
          {t('Talk to an expert')}
        </span>
      </button>
    </div>
  );
}
