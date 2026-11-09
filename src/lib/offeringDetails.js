import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { initialTargetId } from '../hooks/useRoute.js';
import { offerings } from '../data/catalogue.js';
import { ensureCatalogue } from './catalogueStages.js';

/**
 * Which offering cards are open. Cards start as name and business value, which keeps the page
 * small; the details are only added to the page when someone asks for them.
 */
let open = null;
const listeners = new Set();

const read = () => {
  if (open === null) {
    const target = initialTargetId();
    open = new Set(target?.startsWith('offering-') ? [target] : []);
  }
  return open;
};
const publish = (next) => {
  open = next;
  listeners.forEach((fn) => fn());
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function toggleOfferingDetails(id) {
  const next = new Set(read());
  if (!next.delete(id)) next.add(id);
  publish(next);
}

/** Opens a card someone is being taken to, before the page scrolls there. */
export function revealOffering(id) {
  if (!id?.startsWith('offering-') || read().has(id)) return;
  flushSync(() => publish(new Set(read()).add(id)));
}

/** What the reader is looking at: the card or heading just below the sticky header. */
function visibleContent() {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70;
  const content = document.querySelector('.catalogue-content')?.getBoundingClientRect();
  if (!content) return null;
  const x = content.left + content.width / 2;
  for (const y of [header + 40, header + 160, header + 300]) {
    const found = document.elementFromPoint(x, y)?.closest('.offering, .area-heading, .family-header');
    if (found) return found;
  }
  return null;
}

/** Opens or closes every card, keeping what the reader is looking at in the same place. */
export function setAllOfferingDetails(show) {
  ensureCatalogue();
  const anchor = visibleContent();
  const before = anchor?.getBoundingClientRect().top;
  flushSync(() => publish(new Set(show ? offerings.map((o) => o.id) : [])));
  if (anchor?.isConnected) {
    const moved = anchor.getBoundingClientRect().top - before;
    if (Math.abs(moved) > 0.5) window.scrollBy({ top: moved, behavior: 'instant' });
  }
}

export const useOpenOfferings = () => useSyncExternalStore(subscribe, read);
