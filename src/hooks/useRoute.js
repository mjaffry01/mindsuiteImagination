import { useEffect, useState } from 'react';

/**
 * Tiny hash router. "#/careers" (or "#/careers/<role-id>") is the careers page; any other
 * hash, such as "#catalogue", is an anchor on the main page.
 */
function read() {
  const m = location.hash.match(/^#\/careers(?:\/([\w-]+))?/);
  return m ? { page: 'careers', roleId: m[1] || null } : { page: 'main', roleId: null };
}

export default function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  return route;
}
