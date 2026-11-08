import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

/** Appears after "I'm interested": confirms the pick and offers the next step. */
export default function InterestToast({ toast, onRequest, onView, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className="interest-toast" role="status" key={toast.key}>
      <span className="interest-toast-icon" aria-hidden="true">
        <Check />
      </span>
      <div className="interest-toast-text">
        <strong>Added to your interests</strong>
        <span>
          {toast.name} · {toast.count} selected
        </span>
      </div>
      <div className="interest-toast-actions">
        <button type="button" className="is-primary" onClick={onRequest}>
          Request a proposal
        </button>
        <button type="button" onClick={onView}>
          View list
        </button>
      </div>
      <button type="button" className="interest-toast-close" aria-label="Dismiss" onClick={onDismiss}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
