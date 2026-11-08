import raw from './catalogue.json';

/** Families → areas → offerings, exactly as published in the source catalogue. */
export const families = raw.map((family, familyIndex) => ({
  ...family,
  index: familyIndex,
  theme: familyIndex % 2 === 1 ? 'dark' : 'light',
  count: family.areas.reduce((sum, area) => sum + area.offerings.length, 0),
}));

/** Flat list in reading order, each offering linked back to its family and area. */
export const offerings = [];
families.forEach((family) => {
  family.areas.forEach((area, areaIndex) => {
    area.offerings.forEach((offering, i) => {
      // Same object as in family.areas[].offerings, so a language switch updates both views.
      Object.assign(offering, {
        index: offerings.length,
        family,
        area,
        firstInFamily: areaIndex === 0 && i === 0,
        firstInArea: i === 0,
      });
      offerings.push(offering);
    });
  });
});

export const offeringById = new Map(offerings.map((o) => [o.id, o]));
export const areaCount = families.reduce((sum, f) => sum + f.areas.length, 0);

// Lower-case, strip Latin accents and Arabic vowel marks, keep Latin letters, digits and Arabic.
export const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim();

export const aliases = {
  sso: 'single sign on',
  mfa: 'multi factor',
  iam: 'identity access',
  dr: 'disaster recovery',
  ci: 'continuous integration',
  cd: 'continuous delivery',
};

// ---------------------------------------------------------------- languages
// The objects above are shared by every component, so a language switch rewrites their text
// fields in place (keeping the English originals) and the app re-renders.
const FAMILY_FIELDS = ['name', 'short', 'tagline'];
const AREA_FIELDS = ['name', 'short', 'stage'];
const OFFERING_FIELDS = ['name', 'definition', 'scope', 'deliverables', 'value'];
const areas = families.flatMap((f) => f.areas);

const english = new Map();
const remember = (obj, fields) => english.set(obj, Object.fromEntries(fields.map((k) => [k, obj[k]])));
families.forEach((f) => remember(f, FAMILY_FIELDS));
areas.forEach((a) => remember(a, AREA_FIELDS));
offerings.forEach((o) => remember(o, OFFERING_FIELDS));

function englishText(o) {
  const e = english.get(o);
  return [e.name, e.definition, e.scope, e.deliverables, e.value, english.get(o.area).name, english.get(o.family).name];
}

function indexSearch(translated) {
  offerings.forEach((o) => {
    // English terms always match too, so "SSO" or "ERP" work in every language.
    const local = translated ? [o.name, o.definition, o.scope, o.deliverables, o.value, o.area.name, o.family.name] : [];
    o.searchText = normalize([...local, ...englishText(o)].join(' '));
  });
}

export let catalogueLanguage = 'en';

/** Switch catalogue text to `lang` using an overlay {families, areas, offerings} keyed by id. */
export function applyCatalogueLanguage(lang, overlay) {
  const apply = (obj, fields, t) => {
    const e = english.get(obj);
    fields.forEach((k) => {
      obj[k] = (t && t[k]) || e[k];
    });
  };
  families.forEach((f) => apply(f, FAMILY_FIELDS, overlay?.families?.[f.id]));
  areas.forEach((a) => apply(a, AREA_FIELDS, overlay?.areas?.[a.id]));
  offerings.forEach((o) => apply(o, OFFERING_FIELDS, overlay?.offerings?.[o.id]));
  catalogueLanguage = overlay ? lang : 'en';
  indexSearch(Boolean(overlay));
}

indexSearch(false);

/** Same rule as the original: every (alias-expanded) term must appear. */
export function searchOfferings(query) {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(' ').flatMap((t) => (aliases[t] || t).split(' '));
  return offerings.filter((o) => terms.every((t) => o.searchText.includes(t)));
}
