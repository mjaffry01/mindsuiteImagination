import { useCallback, useEffect, useState } from 'react';
import Hero from './components/Hero.jsx';
import MapColumn from './components/MapColumn.jsx';
import Catalogue from './components/Catalogue.jsx';
import Assistant from './components/Assistant.jsx';
import Icon from './components/Icon.jsx';
import { InterestsDialog, SearchDialog } from './components/Dialogs.jsx';
import useInterests from './hooks/useInterests.js';
import useReadingPosition from './hooks/useReadingPosition.js';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [searchOpen, setSearchOpen] = useState(false);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const { interests, status, toggle, add, remove, clear } = useInterests();
  const current = useReadingPosition();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeInterests = useCallback(() => setInterestsOpen(false), []);

  // The catalogue renders after the browser's own hash lookup, so honour deep links
  // such as #family-1-area-1 once it is in the DOM.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, []);

  return (
    <>
      <Hero playing={playing} onToggleMotion={() => setPlaying((p) => !p)} />

      <div id="catalogue" className="catalogue-layout">
        <MapColumn current={current} playing={playing} onOpenSearch={openSearch} />
        <div className="catalogue-content">
          <button
            type="button"
            className="mobile-location"
            aria-haspopup="dialog"
            aria-controls="catalogue-navigation"
            aria-label="Browse service families, areas and search offerings"
            onClick={openSearch}
          >
            <strong>{current.family.name}</strong>
            <span>
              {current.area.name} → {current.name}
            </span>
          </button>
          <Catalogue interests={interests} onToggle={toggle} />
        </div>
      </div>

      <footer className="footer">
        <span>MindSuite · Connected capabilities. Clear outcomes.</span>
        <a href="#top">Back to top ↑</a>
      </footer>

      <button
        type="button"
        className="interests-launcher"
        aria-haspopup="dialog"
        aria-controls="interests-dialog"
        onClick={() => setInterestsOpen(true)}
      >
        <Icon name="ShoppingBag" />
        Your interests ({interests.size})
      </button>
      <InterestsDialog
        open={interestsOpen}
        onClose={closeInterests}
        interests={interests}
        onRemove={remove}
        onClear={clear}
      />
      <div className="interests-status" role="status" aria-live="polite">
        {status}
      </div>

      <SearchDialog open={searchOpen} onClose={closeSearch} />
      <Assistant interests={interests} onAdd={add} />
    </>
  );
}
