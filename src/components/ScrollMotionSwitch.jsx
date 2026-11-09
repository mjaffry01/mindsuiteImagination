import { useId } from 'react';
import { Waves, Zap } from 'lucide-react';
import { setScrollMotion, useScrollMotion } from '../lib/smoothScroll.js';
import { useT } from '../i18n/index.jsx';

/** On: jumps within the page glide there. Off: they go straight to the place. */
export default function ScrollMotionSwitch() {
  const t = useT();
  const on = useScrollMotion();
  const labelId = useId();
  return (
    <div className="scroll-switch" title={t('Smooth scrolling')}>
      <span className="visually-hidden" id={labelId}>
        {t('Smooth scrolling')}
      </span>
      <Zap className={`scroll-switch-icon${on ? '' : ' is-active'}`} aria-hidden="true" />
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
      <Waves className={`scroll-switch-icon${on ? ' is-active' : ''}`} aria-hidden="true" />
    </div>
  );
}
