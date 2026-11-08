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
      offerings.push({
        ...offering,
        index: offerings.length,
        family,
        area,
        firstInFamily: areaIndex === 0 && i === 0,
        firstInArea: i === 0,
      });
    });
  });
});

export const offeringById = new Map(offerings.map((o) => [o.id, o]));
export const areaCount = families.reduce((sum, f) => sum + f.areas.length, 0);

export const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const aliases = {
  sso: 'single sign on',
  mfa: 'multi factor',
  iam: 'identity access',
  dr: 'disaster recovery',
  ci: 'continuous integration',
  cd: 'continuous delivery',
};

offerings.forEach((o) => {
  o.searchText = normalize(
    [o.name, o.definition, o.scope, o.deliverables, o.value, o.area.name, o.family.name].join(' ')
  );
});

/** Same rule as the original: every (alias-expanded) term must appear. */
export function searchOfferings(query) {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(' ').flatMap((t) => (aliases[t] || t).split(' '));
  return offerings.filter((o) => terms.every((t) => o.searchText.includes(t)));
}
