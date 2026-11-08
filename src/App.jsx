import { useCallback, useEffect, useRef, useState } from 'react';
import Hero from './components/Hero.jsx';
import MapColumn from './components/MapColumn.jsx';
import Catalogue from './components/Catalogue.jsx';
import Assistant from './components/Assistant.jsx';
import Icon from './components/Icon.jsx';
import { Clients, PlatformEcosystem } from './components/CompanySections.jsx';
import Team from './components/Team.jsx';
import { InterestsDialog, SearchDialog } from './components/Dialogs.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import SiteHeader, { BackToTop } from './components/SiteHeader.jsx';
import useInterests from './hooks/useInterests.js';
import useReadingPosition from './hooks/useReadingPosition.js';
import useRoute from './hooks/useRoute.js';
import Careers from './components/Careers.jsx';
import ExpertConnect from './components/ExpertConnect.jsx';
import InterestToast from './components/InterestToast.jsx';
import { offeringById } from './data/catalogue.js';
import { useLanguage } from './i18n/index.jsx';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [searchOpen, setSearchOpen] = useState(false);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const { interests, status, toggle, add, addMany, remove, clear } = useInterests();
  const current = useReadingPosition();
  const { t, lang } = useLanguage();

  // "I'm interested" on a card: toggle it, and when it was added offer the next step.
  const [interestsStep, setInterestsStep] = useState('list');
  const [toast, setToast] = useState(null);
  const interestsRef = useRef(interests);
  interestsRef.current = interests;
  const toggleWithPrompt = useCallback(
    (id) => {
      const adding = !interestsRef.current.has(id);
      toggle(id);
      if (adding) {
        setToast({ key: Date.now(), name: offeringById.get(id).name, count: interestsRef.current.size + 1 });
      }
    },
    [toggle]
  );
  const dismissToast = useCallback(() => setToast(null), []);
  const openInterests = useCallback((step = 'list') => {
    setToast(null);
    setInterestsStep(step);
    setInterestsOpen(true);
  }, []);

  // Keep the opening screen clear: the empty interests button appears once the visitor scrolls on.
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const onScroll = () => setPastHero(scrollY > innerHeight * 0.5);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  // Service map can collapse to a thin icon rail; the choice is remembered per browser.
  const [mapCollapsed, setMapCollapsed] = useState(() => {
    try {
      return localStorage.getItem('mindsuite-map-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleMap = useCallback(() => {
    setMapCollapsed((c) => {
      try {
        localStorage.setItem('mindsuite-map-collapsed', c ? '0' : '1');
      } catch {}
      return !c;
    });
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeInterests = useCallback(() => setInterestsOpen(false), []);

  const route = useRoute();

  // The main page renders after the browser's own hash lookup (and again when coming back
  // from Careers), so honour anchors such as #family-1-area-1 once they are in the DOM.
  useEffect(() => {
    if (route.page !== 'main') return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (!target) return;
    const jump = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
    jump();
    // Jump again once late layout (fonts, images) has settled.
    const t = setTimeout(jump, 120);
    return () => clearTimeout(t);
  }, [route.page]);

  return (
    <>
      <SiteHeader />
      {route.page === 'careers' ? (
        <Careers roleId={route.roleId} playing={playing} onToggleMotion={() => setPlaying((p) => !p)} />
      ) : (
        <>
      <Hero playing={playing} onToggleMotion={() => setPlaying((p) => !p)} />

      <div id="catalogue" className={`catalogue-layout${mapCollapsed ? ' is-rail' : ''}`}>
        <MapColumn
          current={current}
          playing={playing}
          onOpenSearch={openSearch}
          collapsed={mapCollapsed}
          onToggle={toggleMap}
        />
        <div className="catalogue-content">
          <button
            type="button"
            className="mobile-location"
            aria-haspopup="dialog"
            aria-controls="catalogue-navigation"
            aria-label={t('Browse service families, areas and search offerings')}
            onClick={openSearch}
          >
            <strong>{current.family.name}</strong>
            <span>
              {current.area.name} → {current.name}
            </span>
          </button>
          <Catalogue key={lang} interests={interests} onToggle={toggleWithPrompt} />
        </div>
      </div>

      <PlatformEcosystem />
      <Clients />
      <Team />
        </>
      )}

      <SiteFooter />

      <button
        type="button"
        className={`interests-launcher${pastHero || interests.size ? '' : ' is-tucked'}`}
        aria-haspopup="dialog"
        aria-controls="interests-dialog"
        onClick={() => openInterests('list')}
      >
        <Icon name="ShoppingBag" />
        {t('Your interests ({count})', { count: interests.size })}
      </button>
      <InterestsDialog
        open={interestsOpen}
        onClose={closeInterests}
        interests={interests}
        onRemove={remove}
        onClear={clear}
        startStep={interestsStep}
      />
      <InterestToast
        toast={toast}
        onRequest={() => openInterests('form')}
        onView={() => openInterests('list')}
        onDismiss={dismissToast}
      />
      <div className="interests-status" role="status" aria-live="polite">
        {status ? t(status.text, status.vars) : ''}
      </div>

      <BackToTop />
      <ExpertConnect />
      <SearchDialog
        open={searchOpen}
        onClose={closeSearch}
        interests={interests}
        onToggle={toggle}
        onAddMany={addMany}
        onOpenInterests={() => {
          setSearchOpen(false);
          openInterests('list');
        }}
      />
      <Assistant interests={interests} onAdd={add} />
    </>
  );
}
