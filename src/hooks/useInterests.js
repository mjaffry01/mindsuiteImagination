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
  const [status, setStatus] = useState('');

  const commit = useCallback((updater, message) => {
    setInterests((prev) => {
      const next = updater(new Set(prev));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
    setStatus(message);
  }, []);

  const current = useRef(interests);
  current.current = interests;

  const toggle = useCallback(
    (id) => {
      const adding = !current.current.has(id);
      commit(
        (s) => (adding ? s.add(id) : s.delete(id), s),
        `${offeringById.get(id).name} ${adding ? 'added to' : 'removed from'} your interests.`
      );
    },
    [commit]
  );

  const add = useCallback(
    (id) => commit((s) => s.add(id), `${offeringById.get(id).name} added to your interests.`),
    [commit]
  );
  const remove = useCallback(
    (id) => commit((s) => (s.delete(id), s), `${offeringById.get(id).name} removed.`),
    [commit]
  );
  const clear = useCallback(() => commit(() => new Set(), 'All interests cleared.'), [commit]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === null) setInterests(load(e.newValue));
    };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);

  return { interests, status, toggle, add, remove, clear };
}
