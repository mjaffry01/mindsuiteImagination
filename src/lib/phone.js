/**
 * Phone numbers for an international audience: every country's dialling code, and validation
 * against that country's real numbering rules (libphonenumber-js, Google's metadata).
 * Shared by the website and the enquiry server.
 */
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

export const PHONE_COUNTRIES = getCountries();

/** Shown first in the country list: where most MindSuite clients are. */
export const PINNED_COUNTRIES = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'IN', 'GB', 'US', 'FR'].filter((c) =>
  PHONE_COUNTRIES.includes(c)
);

export const dialCode = (country) => `+${getCountryCallingCode(country)}`;

/** Best guess at the visitor's country from the browser's languages, e.g. "ar-SA" → SA. */
export function guessCountry(fallback = 'IN') {
  const tags = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language];
  for (const tag of tags) {
    const region = String(tag).split(/[-_]/)[1]?.toUpperCase();
    if (region && PHONE_COUNTRIES.includes(region)) return region;
  }
  return fallback;
}

/**
 * Reads what the visitor typed. A number starting with "+" or "00" carries its own country
 * code; otherwise the selected country is used.
 * Returns { empty, valid, e164, international, country }.
 */
export function checkPhone(input, country) {
  const raw = String(input ?? '').trim();
  if (!raw.replace(/\D/g, '')) return { empty: true, valid: false, e164: '', international: '', country };
  const text = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
  const parsed = text.startsWith('+')
    ? parsePhoneNumberFromString(text)
    : parsePhoneNumberFromString(text, country);
  if (!parsed) return { empty: false, valid: false, e164: '', international: '', country };
  return {
    empty: false,
    valid: parsed.isValid(),
    e164: parsed.number,
    international: parsed.formatInternational(),
    country: parsed.country || country,
  };
}
