import { useEffect, useRef, useState } from 'react';

/** Page sections reachable from the header menu and the footer. */
export const SECTIONS = [
  { id: 'catalogue', label: 'Capabilities' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'clients', label: 'Clients' },
  { id: 'leadership', label: 'Team' },
  { id: 'careers', label: 'Careers', href: '#/careers', page: true },
];

export const sectionHref = (s) => s.href || `#${s.id}`;

/** Id of the section the visitor is currently in ('' while on the opening screen). */
function useActiveSection() {
  const [active, setActive] = useState('');
  useEffect(() => {
    let queued = false;
    const update = () => {
      queued = false;
      if (location.hash.startsWith('#/careers')) {
        setActive('careers');
        return;
      }
      const onPage = SECTIONS.filter((x) => !x.page);
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
      const line = header + Math.min(innerHeight * 0.3, 240);
      let current = '';
      for (const s of onPage) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // At the very bottom, the last (short) section counts as reached.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
        current = onPage[onPage.length - 1].id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    addEventListener('hashchange', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      removeEventListener('hashchange', onScroll);
    };
  }, []);
  return active;
}

/** Inline links on wide screens; a "Menu" button with a dropdown on narrower ones. */
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = useActiveSection();

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
            <a
              href={sectionHref(s)}
              aria-current={active === s.id ? 'location' : undefined}
              onClick={() => setOpen(false)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
