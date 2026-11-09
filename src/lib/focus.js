import { ensureCatalogue } from './catalogueStages.js';
import { revealOffering } from './offeringDetails.js';

/** Focus the destination after the browser's hash scroll, so keyboard users land there. */
export function focusTarget(id) {
  ensureCatalogue();
  revealOffering(id);
  const target = document.getElementById(id);
  if (!target) return;
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
