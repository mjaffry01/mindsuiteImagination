import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search as SearchIcon, X } from 'lucide-react';
import Icon from './Icon.jsx';
import { focusTarget } from '../lib/focus.js';
import { families, offerings } from '../data/catalogue.js';
import { useT } from '../i18n/index.jsx';

const CLOSE_MS = 180; // matches the slide-out animation
const SWIPE_PX = 60;

/**
 * The service map on phones and small tablets: a panel that slides in from the left over a
 * dimmed page. Closes with the X, Esc, a tap on the dimmed page or a swipe towards the edge.
 */
export default function MobileMapDrawer({ current, onClose, onOpenSearch }) {
  const t = useT();
  const ref = useRef(null);
  const swipeFrom = useRef(null);
  const [closing, setClosing] = useState(false);
  const [openFamily, setOpenFamily] = useState(current.family.id);

  const closeNow = useCallback(() => {
    if (ref.current?.open) ref.current.close(); // also returns focus to the bar
    onClose();
  }, [onClose]);

  const slideClosed = useCallback(() => {
    setClosing(true);
    setTimeout(closeNow, CLOSE_MS);
  }, [closeNow]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('map-drawer-open');
    // Rotating to a wide screen brings back the full sidebar, so the drawer has no job left.
    const wide = matchMedia('(min-width: 901px)');
    const onWide = () => wide.matches && closeNow();
    wide.addEventListener('change', onWide);
    return () => {
      wide.removeEventListener('change', onWide);
      document.documentElement.classList.remove('map-drawer-open');
    };
  }, [closeNow]);

  const onTouchEnd = (e) => {
    if (swipeFrom.current === null) return;
    const moved = e.changedTouches[0].clientX - swipeFrom.current;
    swipeFrom.current = null;
    const towardsEdge = document.documentElement.dir === 'rtl' ? moved > SWIPE_PX : moved < -SWIPE_PX;
    if (towardsEdge) slideClosed();
  };

  const jumpTo = (id) => {
    closeNow();
    focusTarget(id);
  };

  return (
    <dialog
      id="service-map-drawer"
      ref={ref}
      className={closing ? 'is-closing' : undefined}
      aria-labelledby="service-map-drawer-title"
      onCancel={(e) => {
        e.preventDefault();
        slideClosed();
      }}
      onClick={(e) => e.target === ref.current && slideClosed()}
      onTouchStart={(e) => {
        swipeFrom.current = e.touches[0].clientX;
      }}
      onTouchEnd={onTouchEnd}
    >
      <div className="drawer-panel">
        <header className="drawer-header">
          <h2 id="service-map-drawer-title">{t('Your service map')}</h2>
          <button type="button" className="drawer-close" aria-label={t('Close')} onClick={slideClosed}>
            <X aria-hidden="true" />
          </button>
        </header>

        <button
          type="button"
          className="drawer-search"
          aria-haspopup="dialog"
          aria-controls="catalogue-navigation"
          onClick={() => {
            closeNow();
            onOpenSearch();
          }}
        >
          <SearchIcon aria-hidden="true" />
          {t('Search all {count} offerings', { count: offerings.length })}
        </button>

        <nav className="drawer-list" aria-label={t('Service families')}>
          <div className="drawer-label">{t('Service families')}</div>
          {families.map((f) => {
            const expanded = openFamily === f.id;
            return (
              <section key={f.id} className={f.id === current.family.id ? 'is-current' : undefined}>
                <button
                  type="button"
                  className="drawer-family"
                  aria-expanded={expanded}
                  aria-controls={`drawer-${f.id}`}
                  onClick={() => setOpenFamily(expanded ? null : f.id)}
                >
                  <Icon name={f.icon} />
                  <span>{f.name}</span>
                  <ChevronDown className="drawer-chevron" aria-hidden="true" />
                </button>
                {expanded && (
                  <ul id={`drawer-${f.id}`}>
                    <li>
                      <a className="drawer-go" href={`#${f.id}`} onClick={() => jumpTo(f.id)}>
                        {t('Go to this family')}
                      </a>
                    </li>
                    {f.areas.map((a) => (
                      <li key={a.id}>
                        <a
                          href={`#${a.id}`}
                          aria-current={a.id === current.area.id ? 'location' : undefined}
                          onClick={() => jumpTo(a.id)}
                        >
                          <span>{a.name}</span>
                          <small>{a.offerings.length}</small>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>

        <footer className="drawer-reading">
          <small>{t('Reading now')}</small>
          <strong>{current.name}</strong>
          <span>{t('{n} of {total} offerings', { n: current.index + 1, total: offerings.length })}</span>
        </footer>
      </div>
    </dialog>
  );
}
