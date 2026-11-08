import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Search as SearchIcon, ShoppingBag, X } from 'lucide-react';
import Icon from './Icon.jsx';
import {
  CONTACT_METHODS,
  ENQUIRY_INBOX,
  TIMELINES,
  buildEnquiry,
  sendEnquiry,
} from '../lib/enquiry.js';
import {
  aliases,
  areaCount,
  families,
  normalize,
  offeringById,
  offerings,
  searchOfferings,
} from '../data/catalogue.js';

/** Keeps a native <dialog> in sync with React state. */
function useModal(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);
  return ref;
}

/** Focus the destination after the browser's hash scroll, so keyboard users land there. */
export function focusTarget(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

function JumpLink({ id, onClose, children }) {
  return (
    <a
      href={`#${id}`}
      onClick={() => {
        onClose();
        focusTarget(id);
      }}
    >
      {children}
    </a>
  );
}

const SUGGESTIONS = ['Ransomware', 'SSO', 'ERP', 'Cloud cost', 'AI assistant', 'Staff augmentation', 'Managed services'];

/** Wraps each occurrence of the search terms in <mark> so matches stand out. */
function Highlight({ text, terms }) {
  if (!terms.length) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  return parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Browse and search dialog. Families are cards whose service-area chips can be picked
 * several at a time; results can be ticked to add many offerings to "Your interests".
 */
export function SearchDialog({ open, onClose, interests, onToggle, onAddMany, onOpenInterests }) {
  const ref = useModal(open, onClose);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [areas, setAreas] = useState(() => new Set());
  const [showResults, setShowResults] = useState(false);

  const searching = Boolean(query.trim());
  const inResults = searching || (showResults && areas.size > 0);
  const terms = normalize(query)
    .split(' ')
    .flatMap((t) => (aliases[t] || t).split(' '))
    .filter((t) => t.length > 1);
  const results = (searching ? searchOfferings(query) : offerings).filter(
    (o) => !areas.size || areas.has(o.area.id)
  );
  const notAdded = results.filter((o) => !interests.has(o.id));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const toggleArea = (id) =>
    setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearAreas = () => {
    setAreas(new Set());
    setShowResults(false);
  };
  const runSuggestion = (text) => {
    setQuery(text);
    inputRef.current.focus();
  };

  const areaById = new Map(families.flatMap((f) => f.areas.map((a) => [a.id, a])));

  let count = `Browse ${families.length} families and ${areaCount} service areas, or search all ${offerings.length} offerings. Pick several areas to see them together.`;
  if (inResults) {
    count = results.length
      ? `${plural(results.length, 'offering')}${areas.size ? ` in ${plural(areas.size, 'selected area')}` : ''}`
      : 'No offerings found. Try a broader term, such as identity, cloud or security.';
  }

  // Results grouped under their family, in catalogue order.
  const groups = families
    .map((f) => ({ family: f, items: results.filter((o) => o.family.id === f.id) }))
    .filter((g) => g.items.length);

  return (
    <dialog id="catalogue-navigation" aria-labelledby="navigation-title" ref={ref}>
      <header className="navigation-header">
        <div className="navigation-title">
          <h2 id="navigation-title">Explore offerings</h2>
          <span className="navigation-hint" aria-hidden="true">
            <kbd>Esc</kbd> to close
          </span>
          <button type="button" className="navigation-close" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="offering-search" className="visually-hidden">
          Search all offerings
        </label>
        <div className="search-field">
          <SearchIcon className="search-field-icon" aria-hidden="true" />
          <input
            id="offering-search"
            ref={inputRef}
            type="search"
            placeholder={`Search all ${offerings.length} offerings — try ransomware, SSO or ERP`}
            autoComplete="off"
            aria-controls="offering-results"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setQuery('');
                inputRef.current.focus();
              }}
            >
              Clear
            </button>
          )}
        </div>
        {!inResults && (
          <div className="search-suggestions" role="group" aria-label="Suggested searches">
            <span>Popular:</span>
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s} onClick={() => runSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {areas.size > 0 && (
          <div className="area-filter" role="group" aria-label="Selected service areas">
            {[...areas].map((id) => (
              <button type="button" key={id} className="area-filter-chip" onClick={() => toggleArea(id)}>
                {areaById.get(id).name}
                <X aria-hidden="true" />
                <span className="visually-hidden">(remove)</span>
              </button>
            ))}
            <button type="button" className="area-filter-clear" onClick={clearAreas}>
              Clear areas
            </button>
          </div>
        )}
        <p className="search-count" role="status" aria-live="polite">
          {count}
        </p>
      </header>

      {!inResults && (
        <nav className="family-grid" aria-label="Service families and areas">
          {families.map((f) => (
            <section key={f.id} className={`family-card family-tone-${f.index}`}>
              <JumpLink id={f.id} onClose={onClose}>
                <span className="family-card-icon">
                  <Icon name={f.icon} />
                </span>
                <span className="family-card-text">
                  <strong>{f.name}</strong>
                  <small>{f.tagline}</small>
                </span>
                <span className="family-card-count">{plural(f.count, 'offering')}</span>
              </JumpLink>
              <div className="area-chips" role="group" aria-label={`${f.name} service areas`}>
                {f.areas.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className="area-chip"
                    aria-pressed={areas.has(a.id)}
                    onClick={() => toggleArea(a.id)}
                  >
                    {areas.has(a.id) && <Check aria-hidden="true" />}
                    {a.name}
                    <span className="area-chip-count">{a.offerings.length}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      )}

      {inResults && (
        <div id="offering-results" className="result-groups">
          {results.length > 0 && (
            <div className="results-toolbar">
              {areas.size > 0 && !searching && (
                <button type="button" className="results-back" onClick={() => setShowResults(false)}>
                  ← Change areas
                </button>
              )}
              <button
                type="button"
                className="results-add-all"
                disabled={!notAdded.length}
                onClick={() => onAddMany(notAdded.map((o) => o.id))}
              >
                {notAdded.length ? <Plus aria-hidden="true" /> : <Check aria-hidden="true" />}
                {notAdded.length ? `Add all ${notAdded.length} to interests` : 'All added to interests'}
              </button>
            </div>
          )}
          {groups.map(({ family, items }) => (
            <section key={family.id} className="result-group">
              <h3>
                <Icon name={family.icon} />
                {family.name}
                <span>{items.length}</span>
              </h3>
              <ul className="search-results">
                {items.map((o) => {
                  const added = interests.has(o.id);
                  return (
                    <li key={o.id} className={added ? 'is-added' : undefined}>
                      <button
                        type="button"
                        className="result-check"
                        aria-pressed={added}
                        aria-label={`${added ? 'Remove' : 'Add'} ${o.name} ${added ? 'from' : 'to'} your interests`}
                        title={added ? 'In your interests' : 'Add to your interests'}
                        onClick={() => onToggle(o.id)}
                      >
                        {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                      </button>
                      <JumpLink id={o.id} onClose={onClose}>
                        <strong>
                          <Icon name={o.icon} />
                          <span>
                            <Highlight text={o.name} terms={terms} />
                          </span>
                        </strong>
                        <span className="result-area">{o.area.name}</span>
                        <p>
                          <Highlight text={o.value} terms={terms} />
                        </p>
                      </JumpLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="navigation-footer">
        {!inResults && areas.size > 0 ? (
          <button type="button" className="show-selected" onClick={() => setShowResults(true)}>
            Show {plural(results.length, 'offering')} from {plural(areas.size, 'area')} →
          </button>
        ) : (
          <span className="navigation-footer-count">
            <ShoppingBag aria-hidden="true" />
            {plural(interests.size, 'offering')} in your interests
          </span>
        )}
        <button type="button" className="view-interests" disabled={!interests.size} onClick={onOpenInterests}>
          View interests
        </button>
      </footer>
    </dialog>
  );
}

const EMPTY_FORM = {
  name: '',
  email: '',
  company: '',
  phone: '',
  preferredContact: CONTACT_METHODS[0],
  timeline: TIMELINES[1],
  message: '',
  consent: false,
  website: '', // spam trap, hidden from people
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!form.company.trim()) errors.company = 'Please enter your company.';
  if (['Phone call', 'WhatsApp'].includes(form.preferredContact) && form.phone.replace(/\D/g, '').length < 7) {
    errors.phone = `Please add a phone number for ${form.preferredContact === 'WhatsApp' ? 'WhatsApp' : 'a call'}.`;
  }
  if (!form.consent) errors.consent = 'Please confirm we may contact you about this request.';
  return errors;
}

function Field({ id, label, error, optional, children }) {
  return (
    <div className={`enq-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="enq-optional">optional</span>}
      </label>
      {children}
      {error && (
        <p className="enq-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

const STEPS = ['Shortlist', 'Your details', 'Sent'];

/**
 * "Your interests" drawer: review the shortlist, request a proposal with a short form,
 * then see a confirmation with a reference number and what happens next.
 */
export function InterestsDialog({ open, onClose, interests, onRemove, onClear, startStep = 'list' }) {
  const ref = useModal(open, onClose);
  const closeRef = useRef(null);
  const listRef = useRef(null);
  const firstFieldRef = useRef(null);
  const [step, setStep] = useState('list');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [result, setResult] = useState(null); // { reference, via, offerings }

  const selected = [...interests].map((id) => offeringById.get(id)).filter(Boolean);
  const stepIndex = { list: 0, form: 1, done: 2 }[step];

  // Each opening starts where the caller asked (the list, or straight to the form).
  useEffect(() => {
    if (!open) return;
    setStep(startStep === 'form' && selected.length ? 'form' : 'list');
    setSendError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startStep]);

  useEffect(() => {
    if (open && step === 'form') requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [open, step]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      ref.current.querySelector(`#enq-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const enquiry = buildEnquiry(form, selected);
      const { via } = await sendEnquiry(enquiry);
      setResult({ reference: enquiry.reference, via, offerings: selected.map((o) => o.name) });
      setStep('done');
      if (via === 'backend') {
        onClear();
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setSendError(
        err?.status === 429
          ? `You have sent several requests in a short time. Please wait a few minutes, or email ${ENQUIRY_INBOX}.`
          : `We could not send your request just now. Please try again, or email ${ENQUIRY_INBOX}.`
      );
    } finally {
      setSending(false);
    }
  }

  const errorProps = (key) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': `enq-${key}-error` } : {};

  return (
    <dialog id="interests-dialog" aria-labelledby="interests-title" ref={ref}>
      <div className="interests-header">
        <div>
          <h2 id="interests-title">
            {step === 'list' ? 'Your interests' : step === 'form' ? 'Request a proposal' : 'Request sent'}
          </h2>
          <p className="interests-count">
            {step === 'done' ? `Reference ${result?.reference}` : `${selected.length} offering${selected.length === 1 ? '' : 's'} selected`}
          </p>
        </div>
        <button type="button" className="interests-close" autoFocus ref={closeRef} onClick={onClose}>
          Close
        </button>
      </div>

      <ol className="enq-steps" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : undefined} aria-current={i === stepIndex ? 'step' : undefined}>
            <span>{i < stepIndex ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 'list' && (
        <>
          <p className="interests-empty" hidden={selected.length > 0}>
            Choose “I’m interested” beside any offering to collect it here.
          </p>
          <ul className="interests-list" ref={listRef}>
            {selected.map((o) => (
              <li key={o.id}>
                <div>
                  <JumpLink id={o.id} onClose={onClose}>
                    {o.name}
                  </JumpLink>
                  <p>{o.family.name}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${o.name}`}
                  onClick={() => {
                    onRemove(o.id);
                    requestAnimationFrame(() =>
                      (listRef.current?.querySelector('button') || closeRef.current)?.focus()
                    );
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="enq-actions">
            <button
              type="button"
              className="enq-primary"
              disabled={!selected.length}
              onClick={() => setStep('form')}
            >
              Request a proposal <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="interests-clear"
              disabled={selected.length === 0}
              onClick={() => {
                onClear();
                closeRef.current.focus();
              }}
            >
              Clear all
            </button>
          </div>
          {selected.length > 0 && (
            <p className="enq-note">
              Share a few details and a MindSuite expert will contact you about these {selected.length} offering
              {selected.length === 1 ? '' : 's'}. Scope and fees are agreed with you before any work starts.
            </p>
          )}
        </>
      )}

      {step === 'form' && (
        <form className="enq-form" onSubmit={submit} noValidate>
          <div className="enq-summary">
            <div>
              <strong>{selected.length} offering{selected.length === 1 ? '' : 's'}</strong>
              <span>{selected.map((o) => o.name).join(' · ')}</span>
            </div>
            <button type="button" onClick={() => setStep('list')}>
              Edit
            </button>
          </div>

          <div className="enq-grid">
            <Field id="enq-name" label="Full name" error={errors.name}>
              <input id="enq-name" ref={firstFieldRef} autoComplete="name" value={form.name} onChange={set('name')} {...errorProps('name')} />
            </Field>
            <Field id="enq-email" label="Work email" error={errors.email}>
              <input id="enq-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} {...errorProps('email')} />
            </Field>
            <Field id="enq-company" label="Company" error={errors.company}>
              <input id="enq-company" autoComplete="organization" value={form.company} onChange={set('company')} {...errorProps('company')} />
            </Field>
            <Field id="enq-phone" label="Phone" optional={!['Phone call', 'WhatsApp'].includes(form.preferredContact)} error={errors.phone}>
              <input id="enq-phone" type="tel" autoComplete="tel" placeholder="+91 …" value={form.phone} onChange={set('phone')} {...errorProps('phone')} />
            </Field>
          </div>

          <fieldset className="enq-choice">
            <legend>How should we contact you?</legend>
            <div>
              {CONTACT_METHODS.map((m) => (
                <label key={m} className={form.preferredContact === m ? 'is-on' : undefined}>
                  <input type="radio" name="preferredContact" value={m} checked={form.preferredContact === m} onChange={set('preferredContact')} />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>

          <Field id="enq-timeline" label="When would you like to start?">
            <select id="enq-timeline" value={form.timeline} onChange={set('timeline')}>
              {TIMELINES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field id="enq-message" label="What would you like to achieve?" optional>
            <textarea
              id="enq-message"
              rows={4}
              maxLength={2000}
              placeholder="A sentence or two about the challenge, systems involved or the outcome you need."
              value={form.message}
              onChange={set('message')}
            />
          </Field>

          {/* Spam trap: invisible to people, often filled in by bots. */}
          <div className="enq-trap" aria-hidden="true">
            <label htmlFor="enq-website">Website</label>
            <input id="enq-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </div>

          <div className={`enq-consent${errors.consent ? ' has-error' : ''}`}>
            <label>
              <input type="checkbox" id="enq-consent" checked={form.consent} onChange={set('consent')} {...errorProps('consent')} />
              <span>MindSuite may contact me about this request using the details above.</span>
            </label>
            {errors.consent && (
              <p className="enq-error" id="enq-consent-error">
                {errors.consent}
              </p>
            )}
          </div>

          {sendError && (
            <p className="enq-send-error" role="alert">
              {sendError}
            </p>
          )}

          <div className="enq-actions">
            <button type="submit" className="enq-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" className="interests-clear" onClick={() => setStep('list')}>
              Back
            </button>
          </div>
        </form>
      )}

      {step === 'done' && result && (
        <div className="enq-done" role="status">
          <span className="enq-done-icon" aria-hidden="true">✓</span>
          {result.via === 'backend' ? (
            <>
              <h3>Thank you, your request is with our team.</h3>
              <p>We have sent the details of your {result.offerings.length} selected offering{result.offerings.length === 1 ? '' : 's'} to a MindSuite expert.</p>
            </>
          ) : (
            <>
              <h3>Almost done: press Send in your email app.</h3>
              <p>
                Your email app has opened with the full request addressed to {ENQUIRY_INBOX}. Send it to complete your request.
                If nothing opened, email us at{' '}
                <a href={`mailto:${ENQUIRY_INBOX}?subject=${encodeURIComponent(`Proposal request ${result.reference}`)}`}>{ENQUIRY_INBOX}</a>{' '}
                and quote <strong>{result.reference}</strong>.
              </p>
            </>
          )}
          <h4>What happens next</h4>
          <ol className="enq-next">
            <li><strong>Acknowledgement</strong> within one business day.</li>
            <li><strong>Discovery call</strong> with the relevant practice lead.</li>
            <li><strong>Scope proposal</strong> with deliverables, acceptance criteria and fees.</li>
          </ol>
          <div className="enq-actions">
            <button type="button" className="enq-primary" onClick={onClose}>
              Done
            </button>
            {result.via !== 'backend' && (
              <button
                type="button"
                className="interests-clear"
                onClick={() => {
                  onClear();
                  setForm(EMPTY_FORM);
                  onClose();
                }}
              >
                I sent it — clear my list
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
