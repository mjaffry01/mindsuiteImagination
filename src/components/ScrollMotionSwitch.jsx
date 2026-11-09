import { useId } from 'react';
import { ChevronsDown } from 'lucide-react';
import { setScrollMotion, useScrollMotion } from '../lib/smoothScroll.js';
import { useT } from '../i18n/index.jsx';

/** On: jumps within the page glide there. Off: they go straight to the place. */
export default function ScrollMotionSwitch() {
  const t = useT();
  const on = useScrollMotion();
  const labelId = useId();
  return (
    <div className="scroll-switch">
      <span className="scroll-switch-label" id={labelId}>
        <ChevronsDown aria-hidden="true" />
        {t('Smooth scrolling')}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        className="scroll-switch-toggle"
        onClick={() => setScrollMotion(!on)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
