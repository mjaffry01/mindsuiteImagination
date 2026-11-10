import { useSyncExternalStore } from 'react';

/**
 * The visitor's privacy choice, and storage for optional settings.
 *
 * The site sets no cookies. Two things are always saved in the browser because the visitor
 * asks for them directly: their shortlist and their language (plus this choice itself).
 * Display preferences below are saved only after the visitor allows it; until then, and
 * after "Essential only", they last for the current visit and are forgotten afterwards.
 */
const CHOICE_KEY = 'mindsuite-consent-v1';
const VERSION = 1;

/** Optional settings: kept only with permission. */
export const PREFERENCE_KEYS = [
  'mindsuite-hex-order-v1',
  'mindsuite-scroll-motion-v1',
  'mindsuite-map-collapsed',
  'mindsuite-assistant-position-v1',
];

function readChoice() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHOICE_KEY));
    if (saved?.version === VERSION && typeof saved.preferences === 'boolean') return saved;
  } catch {}
  return null;
}

const memory = new Map(); // this visit's values, whatever the choice
let state = { choice: readChoice(), settingsOpen: false };
const listeners = new Set();
const update = (next) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
};

const allowed = () => state.choice?.preferences === true;

/** Saves the visitor's answer. Allowing keeps this visit's settings; refusing removes saved ones. */
export function setConsent(preferences) {
  const choice = { version: VERSION, preferences, date: new Date().toISOString() };
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
    for (const key of PREFERENCE_KEYS) {
      if (preferences) {
        if (memory.get(key) === null) localStorage.removeItem(key);
        else if (memory.has(key)) localStorage.setItem(key, memory.get(key));
      } else {
        const saved = localStorage.getItem(key);
        if (saved !== null && !memory.has(key)) memory.set(key, saved);
        localStorage.removeItem(key);
      }
    }
  } catch {}
  update({ choice, settingsOpen: false });
}

export const openCookieSettings = () => update({ settingsOpen: true });
export const closeCookieSettings = () => update({ settingsOpen: false });

/** Removes everything this site saved in the browser, then starts afresh. */
export function clearSiteStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('mindsuite-'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
  location.reload();
}

/** Storage for optional settings: same shape as localStorage, but asks permission first. */
export const preferenceStorage = {
  getItem(key) {
    if (memory.has(key)) return memory.get(key);
    if (!allowed()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    memory.set(key, String(value));
    if (!allowed()) return;
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  },
  removeItem(key) {
    memory.set(key, null);
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

export const useConsent = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state
  );
