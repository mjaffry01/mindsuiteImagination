import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../i18n/index.jsx';
import { offerings } from '../data/catalogue.js';

/**
 * Guided tour: a spotlight on one part of the site at a time with a short explanation.
 * Steps whose element is not on screen at this size (e.g. the desktop service map on a
 * phone) are skipped automatically. Esc closes; ← / → move between steps.
 */
const STEPS = [
  {
    title: 'Welcome to MindSuite',
    text: 'A one-minute tour of how to find the right services and ask us for a proposal.',
  },
  {
    target: '.site-header .site-nav',
    title: 'Jump to any section',
    text: 'Offerings, platforms, clients, team, careers and about us are always one click away.',
  },
  {
    target: ['.lang-switch', '.lang-select'],
    title: 'Choose your language',
    text: 'Read the whole site, including every offering, in English, Arabic or French.',
  },
  {
    target: ['.map-column', '.tab-offerings'],
    title: 'Your service map',
    text: 'It follows you as you scroll. Pick a family or an area to jump straight there.',
    phoneText: 'Tap Offerings any time to open your service map and jump to any family or area.',
    scrollTo: 'catalogue',
  },
  {
    target: ['.catalogue-search-launch', '.rail-btn[aria-haspopup="dialog"]', '.tab-search'],
    title: 'Search everything',
    text: 'Search all {count} offerings, or browse by service family and area.',
    scrollTo: 'catalogue',
  },
  {
    target: ['#offering-1 .offering-actions .interest-button', '#offering-1 .offering-foot .interest-button'],
    title: 'Add to enquiry',
    text: 'Collect the offerings you are interested in. You can then request one proposal for all of them.',
    scrollTo: 'offering-1',
  },
  {
    target: ['#offering-1 .offering-actions .share-toggle', '#offering-1 .offering-foot .share-toggle'],
    title: 'Share an offering',
    text: 'Send any offering to a colleague on LinkedIn, WhatsApp, email or Telegram.',
    scrollTo: 'offering-1',
  },
  {
    target: ['.enquiry-counter', '.tab-enquiry'],
    title: 'Your enquiry',
    text: 'Shows how many offerings you have collected. Open it to review them and request a proposal.',
  },
  {
    target: ['.assistant-pet', '.tab-guide'],
    title: 'Not sure where to start?',
    text: 'Describe what you want to improve and the guide suggests matching offerings.',
  },
  {
    target: ['.expert-toggle', '.tab-expert'],
    title: 'Talk to an expert',
    text: 'Prefer a conversation? Reach us on WhatsApp, Telegram, phone, email or LinkedIn.',
  },
  {
    title: 'You are ready',
    text: 'Explore our offerings, or come back to this tour any time from the footer.',
    finish: true,
  },
];

const PAD = 8; // space around the highlighted element

function findTarget(target) {
  for (const selector of [].concat(target || [])) {
    const el = document.querySelector(selector);
    if (!el) continue;
    // Size only: floating buttons that are still fading in after a scroll count as present.
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none') return el;
  }
  return null;
}

export default function GuidedTour({ open, onClose }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(null); // highlighted rectangle, or null for a centred card
  const [card, setCard] = useState({ top: 0, left: 0, placement: 'center' });
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const returnFocus = useRef(null);

  const step = STEPS[index];

  // Steps without a visible target at this screen size are skipped.
  const available = useCallback((i) => !STEPS[i].target || Boolean(findTarget(STEPS[i].target)), []);
  const go = useCallback(
    (dir) => {
      let i = index + dir;
      while (i > 0 && i < STEPS.length - 1 && !available(i)) {
        // Elements below the fold may need a scroll before they count as visible.
        const s = STEPS[i];
        if (s.scrollTo) document.getElementById(s.scrollTo)?.scrollIntoView({ block: s.scrollTo === 'catalogue' ? 'start' : 'center', behavior: 'instant' });
        if (available(i)) break;
        i += dir;
      }
      setIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
    },
    [index, available]
  );

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    setIndex(0);
    document.documentElement.classList.add('tour-open');
    return () => {
      document.documentElement.classList.remove('tour-open');
      returnFocus.current?.focus?.();
    };
  }, [open]);

  // Measure the target and place the card beside it.
  const measure = useCallback(() => {
    const el = step.target ? findTarget(step.target) : null;
    const vw = innerWidth;
    const vh = innerHeight;
    const cw = Math.min(360, vw - 24);
    const ch = cardRef.current?.offsetHeight || 190;
    if (!el) {
      setBox(null);
      setCard({ top: Math.max(12, (vh - ch) / 2), left: (vw - cw) / 2, width: cw, placement: 'center' });
      return;
    }
    const r = el.getBoundingClientRect();
    const top = Math.max(4, r.top - PAD);
    const left = Math.max(4, r.left - PAD);
    const b = {
      top,
      left,
      width: Math.min(vw - left - 4, r.right + PAD - left),
      height: Math.min(vh - top - 4, r.bottom + PAD - top),
    };
    setBox(b);
    const gap = 14;
    const clampLeft = (x) => Math.max(12, Math.min(vw - cw - 12, x));
    let pos;
    if (b.top + b.height + gap + ch <= vh - 12) pos = { top: b.top + b.height + gap, left: clampLeft(b.left + b.width / 2 - cw / 2), placement: 'below' };
    else if (b.top - gap - ch >= 12) pos = { top: b.top - gap - ch, left: clampLeft(b.left + b.width / 2 - cw / 2), placement: 'above' };
    else if (b.left + b.width + gap + cw <= vw - 12) pos = { top: Math.max(12, Math.min(vh - ch - 12, b.top + 24)), left: b.left + b.width + gap, placement: 'right' };
    else if (b.left - gap - cw >= 12) pos = { top: Math.max(12, Math.min(vh - ch - 12, b.top + 24)), left: b.left - gap - cw, placement: 'left' };
    else pos = { top: vh - ch - 12, left: (vw - cw) / 2, placement: 'bottom' };
    setCard({ ...pos, width: cw });
  }, [step]);

  // On each step: bring the target into view, then measure (again once scrolling settles).
  useLayoutEffect(() => {
    if (!open) return;
    if (step.scrollTo) {
      const anchor = document.getElementById(step.scrollTo);
      const el = findTarget(step.target);
      const r = el?.getBoundingClientRect();
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70;
      if (el?.closest('.offering-foot')) el.scrollIntoView({ block: 'center', behavior: 'instant' }); // bottom of a tall card
      else if (!el || r.top < header || r.bottom > innerHeight - 40) anchor?.scrollIntoView({ block: step.scrollTo === 'catalogue' ? 'start' : 'center', behavior: 'instant' });
    }
    measure();
    const timers = [60, 250].map((ms) => setTimeout(measure, ms));
    nextRef.current?.focus({ preventScroll: true });
    return () => timers.forEach(clearTimeout);
  }, [open, index, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        // Keep keyboard focus inside the card while the tour is open.
        const items = [...cardRef.current.querySelectorAll('button, a[href]')];
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!cardRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'ArrowRight' && !e.altKey) {
        document.documentElement.dir === 'rtl' ? go(-1) : index < STEPS.length - 1 ? go(1) : onClose();
      } else if (e.key === 'ArrowLeft' && !e.altKey) {
        document.documentElement.dir === 'rtl' ? (index < STEPS.length - 1 ? go(1) : onClose()) : go(-1);
      }
    };
    addEventListener('resize', onResize);
    addEventListener('scroll', onResize, { passive: true });
    document.addEventListener('keydown', onKey, true);
    return () => {
      removeEventListener('resize', onResize);
      removeEventListener('scroll', onResize);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, measure, go, index, onClose]);

  if (!open) return null;

  // Count only the steps that can be shown at this screen size.
  const visible = STEPS.map((_, i) => i).filter((i) => i === 0 || i === STEPS.length - 1 || available(i));
  const position = Math.max(1, visible.indexOf(index) + 1);
  const isLast = index === STEPS.length - 1;

  return (
    <div className="tour" role="presentation">
      {/* Clicking the dimmed page outside the card ends the tour. */}
      <div className="tour-backdrop" onClick={onClose} />
      {box ? (
        <div className="tour-spotlight" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} aria-hidden="true" />
      ) : (
        <div className="tour-dim" aria-hidden="true" />
      )}
      <section
        ref={cardRef}
        className={`tour-card is-${card.placement}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        style={{ top: card.top, left: card.left, width: card.width }}
      >
        <div className="tour-top">
          <span className="tour-count">{t('Step {n} of {total}', { n: position, total: visible.length })}</span>
          <button type="button" className="tour-close" aria-label={t('Close tour')} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <h2 id="tour-title" aria-live="polite">
          {t(step.title)}
        </h2>
        <p id="tour-text">{t(step.phoneText && matchMedia('(max-width: 900px)').matches ? step.phoneText : step.text, { count: offerings.length })}</p>
        <div className="tour-progress" aria-hidden="true">
          {visible.map((i) => (
            <span key={i} className={i === index ? 'is-on' : i < index ? 'is-done' : undefined} />
          ))}
        </div>
        <div className="tour-actions">
          {index > 0 ? (
            <button type="button" className="tour-back" onClick={() => go(-1)}>
              {t('Back')}
            </button>
          ) : (
            <button type="button" className="tour-back" onClick={onClose}>
              {t('Skip tour')}
            </button>
          )}
          {isLast ? (
            <a
              ref={nextRef}
              className="tour-next"
              href="#catalogue"
              onClick={() => {
                try {
                  localStorage.setItem('mindsuite-tour-done', '1');
                } catch {}
                onClose();
              }}
            >
              {t('Explore our offerings')}
            </a>
          ) : (
            <button type="button" ref={nextRef} className="tour-next" onClick={() => go(1)}>
              {index === 0 ? t('Start tour') : t('Next')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
