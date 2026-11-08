import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { areaCount, families, offeringById, offerings, searchOfferings } from '../data/catalogue.js';

/** Keeps a native <dialog> in sync with React state. */
function useModal(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);
  return ref;
}

/** Focus the destination after the browser's hash scroll, so keyboard users land there. */
export function focusTarget(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

function JumpLink({ id, onClose, children }) {
  return (
    <a
      href={`#${id}`}
      onClick={() => {
        onClose();
        focusTarget(id);
      }}
    >
      {children}
    </a>
  );
}

export function SearchDialog({ open, onClose }) {
  const ref = useModal(open, onClose);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const matches = searchOfferings(query);
  const searching = Boolean(query.trim());

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  let count = `Browse ${families.length} families and ${areaCount} service areas, or search all ${offerings.length} offerings.`;
  if (searching) {
    count = matches.length
      ? `${matches.length} matching ${matches.length === 1 ? 'offering' : 'offerings'}`
      : 'No offerings found. Try a broader term, such as identity, cloud or security.';
  }

  return (
    <dialog id="catalogue-navigation" aria-labelledby="navigation-title" ref={ref}>
      <header className="navigation-header">
        <div className="navigation-title">
          <h2 id="navigation-title">Explore offerings</h2>
          <button type="button" className="navigation-close" onClick={onClose}>
            Close
          </button>
        </div>
        <label htmlFor="offering-search">Search all offerings</label>
        <div className="search-field">
          <input
            id="offering-search"
            ref={inputRef}
            type="search"
            placeholder="Try ransomware, SSO or ERP"
            autoComplete="off"
            aria-controls="offering-results"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setQuery('');
                inputRef.current.focus();
              }}
            >
              Clear
            </button>
          )}
        </div>
        <p className="search-count" role="status" aria-live="polite">
          {count}
        </p>
      </header>

      {!searching && (
        <nav className="catalogue-menu" aria-label="Service families and areas">
          {families.map((f) => (
            <section key={f.id}>
              <h3>
                <JumpLink id={f.id} onClose={onClose}>
                  <Icon name={f.areas[0].offerings[0].icon} />
                  {f.name}
                </JumpLink>
              </h3>
              <ul>
                {f.areas.map((a) => (
                  <li key={a.id}>
                    <JumpLink id={a.id} onClose={onClose}>
                      {a.name}
                      <span className="menu-count">{a.offerings.length}</span>
                    </JumpLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      )}

      <ul id="offering-results" className="search-results">
        {searching &&
          matches.map((o) => (
            <li key={o.id}>
              <JumpLink id={o.id} onClose={onClose}>
                <strong>
                  <Icon name={o.icon} />
                  {o.name}
                </strong>
                <span>
                  {o.family.name} / {o.area.name}
                </span>
                <p>{o.definition}</p>
              </JumpLink>
            </li>
          ))}
      </ul>
    </dialog>
  );
}

export function InterestsDialog({ open, onClose, interests, onRemove, onClear }) {
  const ref = useModal(open, onClose);
  const closeRef = useRef(null);
  const listRef = useRef(null);
  const selected = [...interests].map((id) => offeringById.get(id)).filter(Boolean);

  return (
    <dialog id="interests-dialog" aria-labelledby="interests-title" ref={ref}>
      <div className="interests-header">
        <div>
          <h2 id="interests-title">Your interests</h2>
          <p className="interests-count">{selected.length} selected</p>
        </div>
        <button type="button" className="interests-close" autoFocus ref={closeRef} onClick={onClose}>
          Close
        </button>
      </div>
      <p className="interests-empty" hidden={selected.length > 0}>
        Choose “I’m interested” beside any offering to collect it here.
      </p>
      <ul className="interests-list" ref={listRef}>
        {selected.map((o) => (
          <li key={o.id}>
            <div>
              <JumpLink id={o.id} onClose={onClose}>
                {o.name}
              </JumpLink>
              <p>{o.family.name}</p>
            </div>
            <button
              type="button"
              aria-label={`Remove ${o.name}`}
              onClick={() => {
                onRemove(o.id);
                requestAnimationFrame(() =>
                  (listRef.current?.querySelector('button') || closeRef.current)?.focus()
                );
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="interests-clear"
        disabled={selected.length === 0}
        onClick={() => {
          onClear();
          closeRef.current.focus();
        }}
      >
        Clear all
      </button>
    </dialog>
  );
}
