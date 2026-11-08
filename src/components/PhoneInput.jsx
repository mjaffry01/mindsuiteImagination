import { useMemo } from 'react';
import { getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';
import { PHONE_COUNTRIES, PINNED_COUNTRIES, checkPhone, dialCode } from '../lib/phone.js';
import { useLanguage } from '../i18n/index.jsx';

// Keeps "+966" reading left to right inside Arabic text.
const ltr = (s) => `⁦${s}⁩`;

/**
 * Country code picker (every country, names in the page language) plus the number itself.
 * `country` is an ISO code such as "SA"; `value` is what the visitor typed.
 */
export default function PhoneInput({ id, country, value, onChange, inputRef, invalid, describedBy }) {
  const { t, lang } = useLanguage();

  const options = useMemo(() => {
    let names;
    try {
      names = new Intl.DisplayNames([lang, 'en'], { type: 'region' });
    } catch {
      names = { of: (c) => c };
    }
    const label = (c) => `${names.of(c) || c} (${ltr(dialCode(c))})`;
    const all = PHONE_COUNTRIES.map((c) => ({ code: c, label: label(c), name: names.of(c) || c }));
    all.sort((a, b) => a.name.localeCompare(b.name, lang));
    return { pinned: PINNED_COUNTRIES.map((c) => ({ code: c, label: label(c) })), all };
  }, [lang]);

  const example = useMemo(() => {
    try {
      return getExampleNumber(country, examples)?.formatNational() || '';
    } catch {
      return '';
    }
  }, [country]);

  // A full international number ("+44 …" or "0044 …") selects its own country.
  const syncCountry = () => {
    const result = checkPhone(value, country);
    // Only when the dialling code differs: +44 stays on the UK even though it also covers Jersey.
    if (!result.empty && result.country && dialCode(result.country) !== dialCode(country)) {
      onChange({ country: result.country, value });
    }
  };

  return (
    <div className="phone-row">
      <select
        id={`${id}-country`}
        className="phone-country"
        aria-label={t('Country code')}
        value={country}
        onChange={(e) => onChange({ country: e.target.value, value })}
      >
        <optgroup label={t('Common')}>
          {options.pinned.map((o) => (
            <option key={`p-${o.code}`} value={o.code}>
              {o.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={t('All countries')}>
          {options.all.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </optgroup>
      </select>
      <div className="phone-number">
        <span className="phone-prefix" aria-hidden="true" dir="ltr">
          {dialCode(country)}
        </span>
        <input
          id={id}
          ref={inputRef}
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={example}
          value={value}
          onChange={(e) => onChange({ country, value: e.target.value })}
          onBlur={syncCountry}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      </div>
    </div>
  );
}
