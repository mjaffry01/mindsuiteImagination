import { useSyncExternalStore } from 'react';
import { preferenceStorage } from './consent.js';

const STORAGE_KEY = 'mindsuite-scroll-motion-v1';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// The visitor's own choice wins; until they make one, follow their device's motion setting.
function savedChoice() {
  try {
    const saved = preferenceStorage.getItem(STORAGE_KEY);
    if (saved === 'on' || saved === 'off') return saved === 'on';
  } catch {}
  return !reducedMotion();
}

let motionOn = savedChoice();
const listeners = new Set();

export function setScrollMotion(on) {
  motionOn = on;
  preferenceStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  listeners.forEach((fn) => fn());
}

export const useScrollMotion = () =>
  useSyncExternalStore((fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, () => motionOn);

/** Fast at the start, slowing steadily, settling softly at the end. */
const easeOut = (t) => 1 - (1 - t) ** 4;

const MIN_MS = 600;
const MAX_MS = 1500;

let cancelCurrent = null;

function destinationOf(element) {
  if (element === null) return 0; // the top of the page
  const rootStyle = getComputedStyle(document.documentElement);
  const padding = parseFloat(rootStyle.scrollPaddingTop) || 0;
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const top = element.getBoundingClientRect().top + scrollY - padding - margin;
  return Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
}

/**
 * Scrolls to an element (or the page top, with null). Touching the wheel, the screen or a
 * scrolling key hands control straight back to the visitor.
 */
export function smoothScrollTo(element) {
  cancelCurrent?.();
  if (!motionOn) {
    window.scrollTo({ top: destinationOf(element), behavior: 'instant' });
    return;
  }

  const from = scrollY;
  const duration = Math.min(MAX_MS, Math.max(MIN_MS, 450 + Math.abs(destinationOf(element) - from) / 12));
  const startedAt = performance.now();
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    removeEventListener('wheel', stop);
    removeEventListener('touchstart', stop);
    removeEventListener('keydown', onKey);
    cancelCurrent = null;
  };
  function onKey(e) {
    if ([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) stop();
  }

  addEventListener('wheel', stop, { passive: true });
  addEventListener('touchstart', stop, { passive: true });
  addEventListener('keydown', onKey);
  cancelCurrent = stop;

  const step = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    // Measured every frame, so the landing is exact even if the page changes height meanwhile.
    const to = destinationOf(element);
    window.scrollTo({ top: from + (to - from) * easeOut(progress), behavior: 'instant' });
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
}
