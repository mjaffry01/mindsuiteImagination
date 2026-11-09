import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyCatalogueLanguage } from '../data/catalogue.js';

/**
 * Languages offered on the site. Interface text is looked up by its English wording
 * (t('Your interests')), so anything not yet translated simply shows in English.
 * Catalogue text (families, areas, 231 offerings) is swapped in from catalogue.<lang>.json.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl' },
  { code: 'fr', label: 'Français', short: 'FR', dir: 'ltr' },
];
const STORAGE_KEY = 'mindsuite-lang';

// Loaded on demand so English visitors never download the translations.
const loaders = {
  ar: () => Promise.all([import('./ui.ar.json'), import('../data/catalogue.ar.json')]),
  fr: () => Promise.all([import('./ui.fr.json'), import('../data/catalogue.fr.json')]),
};

function initialLanguage() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  // The visitor's own choice comes first; a ?lang= link only sets the language for first visits.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {}
  if (LANGUAGES.some((l) => l.code === fromUrl)) return fromUrl;
  const browser = (navigator.language || '').slice(0, 2);
  return LANGUAGES.some((l) => l.code === browser) ? browser : 'en';
}

function format(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const LanguageContext = createContext({ lang: 'en', dir: 'ltr', t: format, setLang: () => {}, ready: true });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);
  const [dict, setDict] = useState({ lang: 'en', strings: {} });

  useEffect(() => {
    let cancelled = false;
    if (lang === 'en') {
      applyCatalogueLanguage('en', null);
      setDict({ lang: 'en', strings: {} });
      return;
    }
    loaders[lang]()
      .then(([ui, catalogue]) => {
        if (cancelled) return;
        applyCatalogueLanguage(lang, catalogue.default);
        setDict({ lang, strings: ui.default });
      })
      .catch((err) => {
        console.error(`Could not load ${lang} translations`, err);
        if (!cancelled) setLangState('en');
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Only switch the page's language and direction once the translations are in place.
  const active = dict.lang;
  const meta = LANGUAGES.find((l) => l.code === active) || LANGUAGES[0];
  useEffect(() => {
    const root = document.documentElement;
    root.lang = active;
    root.dir = meta.dir;
  }, [active, meta.dir]);

  const setLang = useCallback((code) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
    // The address bar stays as it is; the choice is remembered in this browser.
    setLangState(code);
  }, []);

  const value = useMemo(() => {
    const strings = dict.strings;
    const t = (text, vars) => format(strings[text] || text, vars);
    return { lang: active, dir: meta.dir, t, setLang, ready: active === lang };
  }, [dict, active, meta.dir, lang, setLang]);

  useEffect(() => {
    document.title = value.t('MindSuite Imagination — Our offerings');
  }, [value]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
export const useT = () => useContext(LanguageContext).t;
