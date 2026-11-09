import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { offerings } from '../data/catalogue.js';
import { initialTargetId } from '../hooks/useRoute.js';

/**
 * Builds the 231 offering cards a few at a time, so the page stays responsive while it starts.
 * The cards on the page are always one continuous run, offerings[start] up to offerings[end - 1].
 * A plain visit starts at the first card. An address such as /managed-services starts at that
 * family, grows downwards, then fills in the cards above while holding the reader's place.
 * Any jump goes through ensureCatalogue(), which finishes the job at once.
 */
const TOTAL = offerings.length;
const FIRST_BATCH = 8;
const BATCH = 12;
const ALL = { start: 0, end: TOTAL };

function firstWindow() {
  const id = initialTargetId();
  if (!id || id === 'catalogue') return { start: 0, end: FIRST_BATCH };
  const target = offerings.find((o) => o.id === id || o.area.id === id || o.family.id === id);
  if (!target) return ALL; // a section after the catalogue needs everything above it
  // The whole family down to the target, so its heading and intro are in place.
  const start = offerings.findIndex((o) => o.family.id === target.family.id);
  const first = offerings.findIndex((o) => o === target || o.id === id);
  return { start, end: Math.min(TOTAL, first + FIRST_BATCH) };
}

let current = null;
let running = false;
const listeners = new Set();

const read = () => {
  if (current === null) current = firstWindow();
  return current;
};
const isDone = () => read().start === 0 && read().end === TOTAL;
const notify = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const whenIdle = (fn) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 30);

/** What the reader is looking at: the card or heading just below the sticky header. */
function visibleContent() {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70;
  const content = document.querySelector('.catalogue-content')?.getBoundingClientRect();
  if (!content) return null;
  const x = content.left + content.width / 2;
  for (const y of [header + 30, header + 140, header + 280]) {
    const found = document.elementFromPoint(x, y)?.closest('.offering, .area-heading, .family-header, .family-end, .connection');
    if (found) return found;
  }
  return null;
}

/** Adds cards above the reader, keeping what they are looking at in the same place on screen. */
function growUpwards() {
  const { start, end } = read();
  const anchor = visibleContent();
  const before = anchor?.getBoundingClientRect().top;
  current = { start: Math.max(0, start - BATCH), end };
  flushSync(notify);
  // Browsers with scroll anchoring have already corrected this, so the difference is then zero.
  if (anchor?.isConnected) {
    const moved = anchor.getBoundingClientRect().top - before;
    if (Math.abs(moved) > 0.5) window.scrollBy({ top: moved, behavior: 'instant' });
  }
}

function nextBatch() {
  if (isDone()) {
    running = false;
    return;
  }
  const { start, end } = read();
  if (end < TOTAL) {
    current = { start, end: Math.min(end + BATCH, TOTAL) };
    notify();
  } else {
    growUpwards();
  }
  whenIdle(nextBatch);
}

/** Starts adding the remaining cards once the first screen is up. */
export function startCatalogueStages() {
  if (running || isDone()) return;
  running = true;
  whenIdle(nextBatch);
}

/** Builds whatever is left, immediately, so the element about to be scrolled to exists. */
export function ensureCatalogue() {
  if (isDone()) return;
  current = ALL;
  flushSync(notify);
}

/** Which run of offering cards is on the page so far. */
export const useCatalogueWindow = () => useSyncExternalStore(subscribe, read);
export const useCatalogueDone = () => useSyncExternalStore(subscribe, isDone);
