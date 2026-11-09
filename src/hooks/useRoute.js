import { useEffect, useState } from 'react';

/**
 * Tiny router that never changes the address bar: the URL always stays the site's base
 * address. Pages are kept in history.state, so the browser's Back and Forward buttons still
 * move between the main page and Careers (or an open role).
 *
 * Older links such as "#/careers" or "#/careers/<role-id>" still open the right page once;
 * App then tidies the address back to the base URL.
 */
export const BASE_URL = location.pathname;

function fromHash() {
  const m = location.hash.match(/^#\/careers(?:\/([\w-]+))?/);
  return m ? { page: 'careers', roleId: m[1] || null } : null;
}

function fromState() {
  const s = history.state;
  return s && s.page ? { page: s.page, roleId: s.roleId || null } : null;
}

let current = fromHash() || fromState() || { page: 'main', roleId: null };
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(current));

/** Show a page without touching the URL. `replace` swaps the current history entry. */
export function navigate(page, roleId = null, { replace = false } = {}) {
  if (current.page === page && current.roleId === roleId) return;
  current = { page, roleId };
  history[replace ? 'replaceState' : 'pushState']({ page, roleId }, '', BASE_URL);
  notify();
}

export const getRoute = () => current;

addEventListener('popstate', () => {
  current = fromState() || { page: 'main', roleId: null };
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
