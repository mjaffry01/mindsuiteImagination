import { useEffect, useRef, useState } from 'react';

/** Page sections reachable from the header menu and the footer. */
export const SECTIONS = [
  { id: 'how-we-work', label: 'How we work' },
  { id: 'catalogue', label: 'Capabilities' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'clients', label: 'Clients' },
  { id: 'leadership', label: 'Leadership' },
];

/** Inline links on wide screens; a "Menu" button with a dropdown on narrower ones. */
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current.querySelector('.site-nav-toggle').focus();
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
    <nav className={`site-nav${open ? ' is-open' : ''}`} aria-label="Page sections" ref={ref}>
      <button
        type="button"
        className="site-nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav-links"
        onClick={() => setOpen((o) => !o)}
      >
        Menu <span aria-hidden="true">{open ? '×' : '☰'}</span>
      </button>
      <ul id="site-nav-links">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} onClick={() => setOpen(false)}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function FooterNav() {
  return (
    <nav className="footer-nav" aria-label="Footer">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`}>
          {s.label}
        </a>
      ))}
      <a href="#top">Back to top ↑</a>
    </nav>
  );
}
