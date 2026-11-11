import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import Hero from './components/Hero.jsx';
import MapColumn from './components/MapColumn.jsx';
import MobileMapDrawer from './components/MobileMapDrawer.jsx';
import MobileTabBar from './components/MobileTabBar.jsx';
import Catalogue from './components/Catalogue.jsx';
import Icon from './components/Icon.jsx';
import { About, Clients, PlatformEcosystem } from './components/CompanySections.jsx';
import Team from './components/Team.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import { PRIVACY_EMAIL } from './data/privacy.js';
import SiteHeader, { BackToTop } from './components/SiteHeader.jsx';
import useInterests from './hooks/useInterests.js';
import useReadingPosition from './hooks/useReadingPosition.js';
import useRoute, {
  familySlug,
  getRoute,
  initialTargetId,
  navigate,
  pathFor,
  sectionSlug,
  showSection,
} from './hooks/useRoute.js';
import { useActiveSection } from './components/SiteNav.jsx';
import ExpertConnect from './components/ExpertConnect.jsx';
import InterestToast from './components/InterestToast.jsx';
import { offeringById } from './data/catalogue.js';
import { useLanguage } from './i18n/index.jsx';
import { smoothScrollTo } from './lib/smoothScroll.js';
import { ensureCatalogue, useCatalogueDone } from './lib/catalogueStages.js';
import { revealOffering } from './lib/offeringDetails.js';
import { preferenceStorage } from './lib/consent.js';
import CookieBanner from './components/CookieBanner.jsx';

// Loaded on demand, so the first screen downloads only what it needs.
const Careers = lazy(() => import('./components/Careers.jsx'));
const SharedOfferings = lazy(() => import('./components/SharedOfferings.jsx'));
const Privacy = lazy(() => import('./components/Privacy.jsx'));
const GuidedTour = lazy(() => import('./components/GuidedTour.jsx'));
const Assistant = lazy(() => import('./components/Assistant.jsx'));
const InterestsDialog = lazy(() => import('./components/Dialogs.jsx').then((m) => ({ default: m.InterestsDialog })));
const SearchDialog = lazy(() => import('./components/Dialogs.jsx').then((m) => ({ default: m.SearchDialog })));

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [searchOpen, setSearchOpen] = useState(false);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [mounted, setMounted] = useState({ search: false, interests: false });
  useEffect(() => {
    if (searchOpen || interestsOpen)
      setMounted((m) => ({ search: m.search || searchOpen, interests: m.interests || interestsOpen }));
  }, [searchOpen, interestsOpen]);
  const { interests, status, toggle, add, addMany, remove, clear } = useInterests();
  const current = useReadingPosition();
  const catalogueDone = useCatalogueDone();
  const { t, lang } = useLanguage();

  // "Add to enquiry" on a card: toggle it, and when it was added offer the next step.
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
  const route = useRoute();
  // The Privacy page shows only the privacy address, in its footer and expert panel too.
  const pageEmail = route.page === 'privacy' ? PRIVACY_EMAIL : undefined;
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const onScroll = () => setPastHero(scrollY > innerHeight * 0.5);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  // On small or short screens the floating helpers wait until the visitor leaves the opening
  // screen, so they never cover the headline, text or main button (see .at-hero in CSS).
  useEffect(() => {
    document.documentElement.classList.toggle('at-hero', !pastHero && route.page === 'main');
  }, [pastHero, route.page]);

  // Service map can collapse to a thin icon rail; the choice is remembered per browser.
  const [mapCollapsed, setMapCollapsed] = useState(() => {
    try {
      return preferenceStorage.getItem('mindsuite-map-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleMap = useCallback(() => {
    setMapCollapsed((c) => {
      preferenceStorage.setItem('mindsuite-map-collapsed', c ? '0' : '1');
      return !c;
    });
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false); // phones: the left pane as a drawer
  const closeMapDrawer = useCallback(() => setMapDrawerOpen(false), []);
  // The drawer and search jump to catalogue sections, so from Careers they switch page first.
  const onMainPage = (action) => () => {
    if (getRoute().page !== 'main') navigate('main');
    action();
  };
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeInterests = useCallback(() => setInterestsOpen(false), []);
  // Guided tour: starts from the top of the main page (from Careers it switches page first).
  const closeTour = useCallback(() => setTourOpen(false), []);
  const startTour = () => {
    setSearchOpen(false);
    setInterestsOpen(false);
    if (getRoute().page !== 'main') navigate('main');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => setTourOpen(true), 120);
  };


  // In-page links (#catalogue, #family-1-area-2, #offering-12, #top …) just scroll; the
  // address then follows what is on screen (see below). "#/careers" links switch page.
  useEffect(() => {
    const scrollToId = (id) => {
      if (id === 'top') return smoothScrollTo(null);
      ensureCatalogue();
      revealOffering(id);
      const target = document.getElementById(id);
      if (!target) return;
      smoothScrollTo(target);
      if (id === 'main-content') target.focus({ preventScroll: true });
    };
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest?.('a[href^="#"]');
      if (!link || link.target === '_blank') return;
      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      if (!id) return;
      e.preventDefault();
      const page = id.match(/^\/careers(?:\/([\w-]+))?/);
      if (page) return navigate('careers', page[1] || null);
      if (id === '/privacy') return navigate('privacy');
      // A link to a part of the page already open (such as the privacy contents) just scrolls.
      if (getRoute().page !== 'main' && document.getElementById(id)) return smoothScrollTo(document.getElementById(id));
      if (getRoute().page !== 'main') {
        // From Careers to a section of the main page: switch page, then scroll once it renders.
        navigate('main');
        setTimeout(() => scrollToId(id), 150);
        return;
      }
      // Let dialogs that close on this click finish closing before scrolling.
      setTimeout(() => scrollToId(id), 0);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Opening an address such as /ai-for-business or /team (or an older #section link) jumps
  // to that section; ?lang= and old #anchors are then dropped from the address.
  const [addressReady, setAddressReady] = useState(false);
  useEffect(() => {
    const id = initialTargetId();
    const target = id ? document.getElementById(id) : null;
    const jump = () => target?.scrollIntoView({ behavior: 'instant', block: 'start' });
    jump();
    const { page, roleId } = getRoute();
    if (page === 'careers') history.replaceState({ page, roleId }, '', pathFor(roleId ? `careers/${roleId}` : 'careers'));
    else if (page === 'privacy') history.replaceState({ page }, '', pathFor('privacy'));
    else history.replaceState({ page }, '', page === 'shared' ? location.pathname + location.search : location.pathname); // a shared link keeps its list of offerings
    // Jump again once late layout (fonts, images) has settled, then let the address follow.
    const t = setTimeout(() => {
      jump();
      // Give the reading position a moment to catch up before the address follows it.
      setTimeout(() => setAddressReady(true), 250);
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // While reading the main page, the address names the section: /software-product,
  // /ai-for-business … inside the catalogue, then /platforms, /clients, /team.
  const activeSection = useActiveSection();
  const readingFamily = current.family;
  // A shared offering link keeps its own address until the visitor reads on to another offering.
  const sharedOffering = useRef(initialTargetId()?.startsWith('offering-') ? initialTargetId() : null);
  useEffect(() => {
    if (!addressReady || route.page !== 'main') return;
    if (sharedOffering.current) {
      if (current.id === sharedOffering.current) return;
      sharedOffering.current = null;
    }
    const slug = activeSection === 'catalogue' ? familySlug(readingFamily) : sectionSlug(activeSection) || '';
    showSection(slug);
  }, [addressReady, route.page, activeSection, readingFamily, current]);

  // The browser tab names what is on screen, in the visitor's language.
  useEffect(() => {
    const named = { platforms: 'Platforms', clients: 'Clients', about: 'About us', leadership: 'Team' };
    let title;
    if (route.page === 'careers') title = `${t('Careers')} | MindSuite`;
    if (route.page === 'privacy') title = `${t('Privacy and Cookies')} | MindSuite`;
    else if (route.page === 'shared') title = `${t('Offerings shared with you')} | MindSuite`;
    else if (sharedOffering.current) title = `${current.name} | MindSuite`;
    else if (activeSection === 'catalogue') title = `${readingFamily.name} | MindSuite`;
    else if (named[activeSection]) title = `${t(named[activeSection])} | MindSuite`;
    else title = t('MindSuite Imagination — Our offerings');
    document.title = title;
  }, [route.page, activeSection, readingFamily, current, lang, t]);

  return (
    <>
      {/* First stop for keyboard users: jump past the header to the page content. */}
      <a className="skip-link" href="#main-content">
        {t('Skip to main content')}
      </a>
      <SiteHeader enquiryCount={interests.size} onOpenEnquiry={() => openInterests('list')} />
      {route.page === 'careers' ? (
        <Suspense fallback={<main className="careers-page" id="main-content" />}>
          <Careers roleId={route.roleId} playing={playing} onToggleMotion={() => setPlaying((p) => !p)} />
        </Suspense>
      ) : route.page === 'privacy' ? (
        <Suspense fallback={<main className="careers-page" id="main-content" />}>
          <Privacy playing={playing} onToggleMotion={() => setPlaying((p) => !p)} />
        </Suspense>
      ) : route.page === 'shared' ? (
        <Suspense fallback={<main className="shared-page" id="main-content" />}>
          <SharedOfferings
            interests={interests}
            onToggle={toggleWithPrompt}
            onAddMany={addMany}
            onOpenEnquiry={() => openInterests('list')}
          />
        </Suspense>
      ) : (
        <main id="main-content" tabIndex={-1}>
      <Hero playing={playing} onToggleMotion={() => setPlaying((p) => !p)} onStartTour={() => startTour()} />

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
            aria-expanded={mapDrawerOpen}
            aria-controls="service-map-drawer"
            aria-label={t('Browse service families, areas and search offerings')}
            onClick={() => setMapDrawerOpen(true)}
          >
            <PanelLeftOpen className="mobile-location-icon" aria-hidden="true" />
            <span className="mobile-location-text">
              <small>{t('Your service map')}</small>
              <strong>
                {current.family.name} · {current.area.name}
              </strong>
            </span>
          </button>
          <Catalogue key={lang} interests={interests} onToggle={toggleWithPrompt} />
        </div>
      </div>

      {/* These follow the catalogue, so they appear once it is complete and never jump. */}
      {catalogueDone && (
        <>
          <PlatformEcosystem />
          <Clients />
          <Team />
          <About />
        </>
      )}
        </main>
      )}

      {(route.page !== 'main' || catalogueDone) && <SiteFooter onStartTour={() => startTour()} email={pageEmail} />}
      {mapDrawerOpen && <MobileMapDrawer current={current} onClose={closeMapDrawer} onOpenSearch={openSearch} />}
      <MobileTabBar
        enquiryCount={interests.size}
        onOpenMap={onMainPage(() => setMapDrawerOpen(true))}
        onOpenSearch={onMainPage(openSearch)}
        onOpenEnquiry={() => openInterests('list')}
      />
      {tourOpen && (
        <Suspense fallback={null}>
          <GuidedTour open={tourOpen} onClose={closeTour} />
        </Suspense>
      )}

      <button
        type="button"
        className={`interests-launcher${pastHero || interests.size ? '' : ' is-tucked'}`}
        aria-haspopup="dialog"
        aria-controls="interests-dialog"
        onClick={() => openInterests('list')}
      >
        <Icon name="ClipboardList" />
        {t('Your enquiry ({count})', { count: interests.size })}
      </button>
      {mounted.interests && (
        <Suspense fallback={null}>
          <InterestsDialog
            open={interestsOpen}
            onClose={closeInterests}
            interests={interests}
            onRemove={remove}
            onClear={clear}
            startStep={interestsStep}
          />
        </Suspense>
      )}
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
      <CookieBanner />
      <ExpertConnect email={pageEmail} />
      {mounted.search && (
        <Suspense fallback={null}>
          <SearchDialog
            open={searchOpen}
            onClose={closeSearch}
            currentFamilyId={current.family.id}
            interests={interests}
            onToggle={toggle}
            onAddMany={addMany}
            onOpenInterests={() => {
              setSearchOpen(false);
              openInterests('list');
            }}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <Assistant interests={interests} onAdd={add} />
      </Suspense>
    </>
  );
}
