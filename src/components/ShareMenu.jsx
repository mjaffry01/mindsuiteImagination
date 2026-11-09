import { useEffect, useId, useRef, useState } from 'react';
import { Check, Link2, Linkedin, Mail, MessageCircle, MoreHorizontal, Send, Share2 } from 'lucide-react';
import { useT } from '../i18n/index.jsx';
import { offeringUrl } from '../hooks/useRoute.js';

const enc = encodeURIComponent;

/**
 * Share one offering: LinkedIn, WhatsApp, Email and Telegram, plus Copy link (and the
 * device's own share sheet where available). Links open the offering's own address,
 * e.g. …/offerings/software-health-check.
 */
export default function ShareMenu({ offering }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const url = offeringUrl(offering);
  const text = `${offering.name} — ${offering.value}`;
  const subject = `${offering.name} | MindSuite`;
  const channels = [
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${enc(`${text}\n${url}`)}` },
    { key: 'email', label: t('Email'), icon: Mail, href: `mailto:?subject=${enc(subject)}&body=${enc(`${text}\n\n${url}`)}`, sameTab: true },
    { key: 'telegram', label: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: fall back to a temporary text field.
      const field = Object.assign(document.createElement('textarea'), { value: url });
      document.body.append(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: subject, text, url });
      setOpen(false);
    } catch {}
  };

  return (
    <div className={`share${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={toggleRef}
        className="share-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('Share {name}', { name: offering.name })}
        title={t('Share')}
        onClick={() => setOpen((o) => !o)}
      >
        <Share2 aria-hidden="true" focusable="false" />
      </button>
      {open && (
        <div className="share-menu" id={menuId} role="menu" aria-label={t('Share {name}', { name: offering.name })}>
          {channels.map(({ key, label, icon: ChannelIcon, href, sameTab }) => (
            <a
              key={key}
              role="menuitem"
              className={`share-item sh-${key}`}
              href={href}
              {...(sameTab ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
              onClick={() => setOpen(false)}
            >
              <ChannelIcon aria-hidden="true" focusable="false" />
              {label}
            </a>
          ))}
          <button type="button" role="menuitem" className="share-item" onClick={copy}>
            {copied ? <Check aria-hidden="true" focusable="false" /> : <Link2 aria-hidden="true" focusable="false" />}
            {copied ? t('Link copied') : t('Copy link')}
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button type="button" role="menuitem" className="share-item" onClick={nativeShare}>
              <MoreHorizontal aria-hidden="true" focusable="false" />
              {t('More apps…')}
            </button>
          )}
          <span className="visually-hidden" role="status" aria-live="polite">
            {copied ? t('Link copied') : ''}
          </span>
        </div>
      )}
    </div>
  );
}
