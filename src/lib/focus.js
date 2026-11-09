import { ensureCatalogue } from './catalogueStages.js';

/** Focus the destination after the browser's hash scroll, so keyboard users land there. */
export function focusTarget(id) {
  ensureCatalogue();
  const target = document.getElementById(id);
  if (!target) return;
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
