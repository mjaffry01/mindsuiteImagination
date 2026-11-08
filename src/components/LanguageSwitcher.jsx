import { LANGUAGES, useLanguage } from '../i18n/index.jsx';

const SHORT = { en: 'EN', ar: 'عربي', fr: 'FR' };

/** Compact EN · عربي · FR switch in the header. Each label is written in its own language. */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="lang-switch" role="group" aria-label={t('Language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          dir={l.dir}
          aria-pressed={lang === l.code}
          title={l.label}
          aria-label={l.label}
          onClick={() => setLang(l.code)}
        >
          {SHORT[l.code]}
        </button>
      ))}
    </div>
  );
}
