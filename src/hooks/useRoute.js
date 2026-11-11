import { useEffect, useState } from 'react';
import { families, inEnglish, offerings } from '../data/catalogue.js';
import { smoothScrollTo } from '../lib/smoothScroll.js';

/**
 * Readable addresses, e.g. https://…/mindsuiteImagination/ai-for-business
 *
 *   (base)                  opening screen
 *   /offerings              the catalogue
 *   /<family-slug>          a service family, e.g. /software-product, /cybersecurity
 *   /offerings/<offering-slug>  one offering (the address that the Share button sends)
 *   /platforms /clients /about /team
 *   /careers, /careers/<role-id>
 *   /privacy                the Privacy and Cookies notice
 *   /shared?o=12,45,88      a set of offerings someone shared
 *
 * Careers is its own page (pushed to history, so Back works). On the main page the address
 * follows what the visitor is reading (replaced, so scrolling doesn't fill the history).
 * GitHub Pages serves 404.html (a copy of index.html) for these paths, so they open directly.
 */
export const BASE_PATH = import.meta.env.BASE_URL || '/';

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** "Software & Product" → "software-product", always from the English name. */
export const familySlug = (family) => slugify(inEnglish(family).short);

/** "Software Health Check" → "software-health-check" (English name; titles are unique). */
export const offeringSlug = (offering) => slugify(inEnglish(offering).name);
const OFFERING_BY_SLUG = new Map(offerings.map((o) => [offeringSlug(o), o.id]));
// Addresses of offerings that were renamed, so links shared under the old name still open them.
const FORMER_SLUGS = {
  'threat-intelligence': 'offering-127',
  'red-purple-team-simulation': 'offering-128',
  'cloud-native-security': 'offering-132',
  'vciso-board-advisory': 'offering-138',
  'vciso-services': 'offering-139',
  'compliance-programs': 'offering-143',
  'digital-forensics': 'offering-152',
  'business-continuity': 'offering-154',
};
for (const [slug, id] of Object.entries(FORMER_SLUGS)) if (!OFFERING_BY_SLUG.has(slug)) OFFERING_BY_SLUG.set(slug, id);

const SECTION_SLUGS = { catalogue: 'offerings', platforms: 'platforms', clients: 'clients', about: 'about', leadership: 'team' };
const SLUG_TO_ID = Object.fromEntries([
  ...Object.entries(SECTION_SLUGS).map(([id, slug]) => [slug, id]),
  ...families.map((f) => [familySlug(f), f.id]),
]);

export const sectionSlug = (sectionId) => SECTION_SLUGS[sectionId];
/** Element id to scroll to for a path slug, e.g. "ai-for-business" → "family-3". */
export const idForSlug = (slug) => SLUG_TO_ID[slug] || null;
export const pathFor = (slug) => BASE_PATH + (slug || '');

/** The part of the address after the base, e.g. "careers/netsuite-consultant". */
function pathSlug() {
  const path = decodeURIComponent(location.pathname);
  const rest = path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) : path.replace(/^\//, '');
  return rest.replace(/\/+$/, '').replace(/^index\.html$/, '');
}

function readLocation() {
  // Older links: "#/careers" and "#/careers/<role>".
  const hash = location.hash.match(/^#\/careers(?:\/([\w-]+))?/);
  if (hash) return { page: 'careers', roleId: hash[1] || null };
  const [first, second] = pathSlug().split('/');
  if (first === 'careers') return { page: 'careers', roleId: second || null };
  if (first === 'shared') return { page: 'shared', roleId: null };
  if (first === 'privacy') return { page: 'privacy', roleId: null };
  return { page: 'main', roleId: null };
}

let current = readLocation();
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(current));

/** Switch page and show its address; `replace` swaps the current history entry. */
export function navigate(page, roleId = null, { replace = false } = {}) {
  if (current.page === page && current.roleId === roleId) return;
  current = { page, roleId };
  const url =
    page === 'careers' ? pathFor(roleId ? `careers/${roleId}` : 'careers') : page === 'privacy' ? pathFor('privacy') : pathFor('');
  history[replace ? 'replaceState' : 'pushState']({ page, roleId }, '', url);
  notify();
}

/** Show a main-page section in the address without adding a history entry. */
export function showSection(slug) {
  if (current.page !== 'main') return;
  const url = pathFor(slug);
  if (location.pathname + location.search + location.hash !== url) history.replaceState({ page: 'main' }, '', url);
}

/** Element id the current address points at (for the first jump after loading). */
export const initialTargetId = () => {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && !hash.startsWith('/')) return hash;
  const [first, second] = pathSlug().split('/');
  if (first === 'offerings' && second) return OFFERING_BY_SLUG.get(second) || 'catalogue';
  return idForSlug(first);
};

/** Address that opens several offerings together. */
export const sharedUrl = (list) => `${location.origin}${pathFor('shared')}?o=${list.map((o) => o.id.split('-')[1]).join(',')}`;

/** Full shareable address of one offering. */
export const offeringUrl = (offering) => location.origin + pathFor(`offerings/${offeringSlug(offering)}`);

export const getRoute = () => current;

/**
 * Click handler for the MindSuite logo: from any page (Privacy, Careers, a shared list) it
 * opens the home page at the top; on the home page it scrolls back to the top.
 * Ctrl/Cmd-click and middle-click still open the home address in a new tab.
 */
export function goHome(e) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (current.page === 'main') return smoothScrollTo(null);
  navigate('main');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

addEventListener('popstate', () => {
  current = readLocation();
  notify();
});

export default function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    listeners.add(setRoute);
    setRoute(current);
    return () => listeners.delete(setRoute);
  }, []);
  return route;
}
