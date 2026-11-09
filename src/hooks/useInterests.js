import { useCallback, useEffect, useRef, useState } from 'react';
import { offeringById } from '../data/catalogue.js';

const STORAGE_KEY = 'mindsuite-interests-v1';

function load(value) {
  try {
    const saved = JSON.parse(value || '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => offeringById.has(id)) : []);
  } catch {
    return new Set();
  }
}

/** Selected offering ids, persisted to localStorage and synced across tabs. */
export default function useInterests() {
  const [interests, setInterests] = useState(() => {
    try {
      return load(localStorage.getItem(STORAGE_KEY));
    } catch {
      return new Set();
    }
  });
  // Screen-reader announcement as { text, vars }: the app translates it when rendering.
  const [status, setStatus] = useState(null);

  const commit = useCallback((updater, message) => {
    setInterests((prev) => {
      const next = updater(new Set(prev));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
    setStatus(typeof message === 'string' ? { text: message } : message);
  }, []);

  const current = useRef(interests);
  current.current = interests;

  const toggle = useCallback(
    (id) => {
      const adding = !current.current.has(id);
      commit(
        (s) => (adding ? s.add(id) : s.delete(id), s),
        {
          text: adding ? '{name} added to your enquiry.' : '{name} removed from your enquiry.',
          vars: { name: offeringById.get(id).name },
        }
      );
    },
    [commit]
  );

  const add = useCallback(
    (id) => commit((s) => s.add(id), { text: '{name} added to your enquiry.', vars: { name: offeringById.get(id).name } }),
    [commit]
  );
  const addMany = useCallback(
    (ids) =>
      commit((s) => (ids.forEach((id) => s.add(id)), s), { text: '{count} offerings added to your enquiry.', vars: { count: ids.length } }),
    [commit]
  );
  const remove = useCallback(
    (id) => commit((s) => (s.delete(id), s), { text: '{name} removed.', vars: { name: offeringById.get(id).name } }),
    [commit]
  );
  const clear = useCallback(() => commit(() => new Set(), 'Enquiry list cleared.'), [commit]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === null) setInterests(load(e.newValue));
    };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);

  return { interests, status, toggle, add, addMany, remove, clear };
}
