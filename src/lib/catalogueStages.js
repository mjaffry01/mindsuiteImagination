import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { offerings } from '../data/catalogue.js';
import { initialTargetId } from '../hooks/useRoute.js';

/**
 * Builds the 231 offering cards a few at a time, so the page stays responsive while it starts.
 * An address pointing into the page needs everything at once, and so does any jump: see
 * ensureCatalogue(), which every in-page link and scroll goes through.
 */
const TOTAL = offerings.length;
const FIRST_BATCH = 8;
const BATCH = 12;

let rendered = null;
let running = false;
const listeners = new Set();

const progress = () => {
  if (rendered === null) rendered = initialTargetId() ? TOTAL : FIRST_BATCH;
  return rendered;
};
const notify = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const whenIdle = (fn) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 30);

function nextBatch() {
  if (progress() >= TOTAL) {
    running = false;
    return;
  }
  rendered = Math.min(rendered + BATCH, TOTAL);
  notify();
  whenIdle(nextBatch);
}

/** Starts adding the remaining cards once the first screen is up. */
export function startCatalogueStages() {
  if (running || progress() >= TOTAL) return;
  running = true;
  whenIdle(nextBatch);
}

/** Builds whatever is left, immediately, so the element about to be scrolled to exists. */
export function ensureCatalogue() {
  if (progress() >= TOTAL) return;
  rendered = TOTAL;
  flushSync(notify);
}

/** How many offering cards are on the page so far. */
export const useCatalogueProgress = () => useSyncExternalStore(subscribe, progress);
export const useCatalogueDone = () => useCatalogueProgress() >= TOTAL;
