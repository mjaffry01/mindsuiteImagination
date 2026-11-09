import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Search as SearchIcon, ShoppingBag, X } from 'lucide-react';
import Icon from './Icon.jsx';
import { focusTarget } from '../lib/focus.js';
import PhoneInput from './PhoneInput.jsx';
import { checkPhone, guessCountry } from '../lib/phone.js';
import { useT } from '../i18n/index.jsx';
import {
  CONTACT_METHODS,
  ENQUIRY_INBOX,
  TIMELINES,
  buildEnquiry,
  enquiryEmail,
  isBackendConfigured,
  sendEnquiry,
} from '../lib/enquiry.js';
import {
  aliases,
  areaCount,
  families,
  inEnglish,
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
  // Esc always closes. Browsers do this for modal dialogs too, but some skip the first Esc
  // (for example right after the dialog opened without a click), so handle it explicitly.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return ref;
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

// Count phrases are looked up whole ("{count} offerings"), so each language can word them its own way.
const plural = (t, n, word) => t(n === 1 ? `{count} ${word}` : `{count} ${word}s`, { count: n });

/**
 * Browse and search dialog. Families are cards whose service-area chips can be picked
 * several at a time; results can be ticked to add many offerings to "Your interests".
 */
export function SearchDialog({ open, onClose, interests, onToggle, onAddMany, onOpenInterests, currentFamilyId }) {
  const ref = useModal(open, onClose);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [areas, setAreas] = useState(() => new Set());
  const [showResults, setShowResults] = useState(false);
  const t = useT();

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
    if (!open) return;
    // On touch screens, focusing the box would open the keyboard over the map.
    if (matchMedia('(hover: hover)').matches) inputRef.current?.focus();
    ref.current?.querySelector('.family-card.is-current')?.scrollIntoView({ block: 'nearest' });
  }, [open, ref]);

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

  let count = t(
    'Browse {families} families and {areas} service areas, or search all {offerings} offerings. Pick several areas to see them together.',
    { families: families.length, areas: areaCount, offerings: offerings.length }
  );
  if (inResults) {
    count = results.length
      ? areas.size
        ? t('{offerings} in {areas}', { offerings: plural(t, results.length, 'offering'), areas: plural(t, areas.size, 'selected area') })
        : plural(t, results.length, 'offering')
      : t('No offerings found. Try a broader term, such as identity, cloud or security.');
  }

  // Results grouped under their family, in catalogue order.
  const groups = families
    .map((f) => ({ family: f, items: results.filter((o) => o.family.id === f.id) }))
    .filter((g) => g.items.length);

  return (
    <dialog id="catalogue-navigation" aria-labelledby="navigation-title" ref={ref}>
      <header className="navigation-header">
        <div className="navigation-title">
          <h2 id="navigation-title">{t('Explore offerings')}</h2>
          <span className="navigation-hint" aria-hidden="true">
            <kbd>Esc</kbd> {t('to close')}
          </span>
          <button type="button" className="navigation-close" aria-label={t('Close')} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="offering-search" className="visually-hidden">
          {t('Search all offerings')}
        </label>
        <div className="search-field">
          <SearchIcon className="search-field-icon" aria-hidden="true" />
          <input
            id="offering-search"
            ref={inputRef}
            type="search"
            placeholder={t('Search all {count} offerings — try ransomware, SSO or ERP', { count: offerings.length })}
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
              {t('Clear')}
            </button>
          )}
        </div>
        {!inResults && (
          <div className="search-suggestions" role="group" aria-label={t('Suggested searches')}>
            <span>{t('Popular:')}</span>
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s} onClick={() => runSuggestion(t(s))}>
                {t(s)}
              </button>
            ))}
          </div>
        )}
        {areas.size > 0 && (
          <div className="area-filter" role="group" aria-label={t('Selected service areas')}>
            {[...areas].map((id) => (
              <button type="button" key={id} className="area-filter-chip" onClick={() => toggleArea(id)}>
                {areaById.get(id).name}
                <X aria-hidden="true" />
                <span className="visually-hidden">{t('(remove)')}</span>
              </button>
            ))}
            <button type="button" className="area-filter-clear" onClick={clearAreas}>
              {t('Clear areas')}
            </button>
          </div>
        )}
        <p className="search-count" role="status" aria-live="polite">
          {count}
        </p>
      </header>

      {!inResults && (
        <nav className="family-grid" aria-label={t('Service families and areas')}>
          {families.map((f) => (
            <section key={f.id} className={`family-card family-tone-${f.index}${f.id === currentFamilyId ? ' is-current' : ''}`}>
              <JumpLink id={f.id} onClose={onClose}>
                <span className="family-card-icon">
                  <Icon name={f.icon} />
                </span>
                <span className="family-card-text">
                  {f.id === currentFamilyId && <span className="family-card-here">{t('You are here')}</span>}
                  <strong>{f.name}</strong>
                  <small>{f.tagline}</small>
                </span>
                <span className="family-card-count">{plural(t, f.count, 'offering')}</span>
              </JumpLink>
              <div className="area-chips" role="group" aria-label={t('{name} service areas', { name: f.name })}>
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
                  {t('← Change areas')}
                </button>
              )}
              <button
                type="button"
                className="results-add-all"
                disabled={!notAdded.length}
                onClick={() => onAddMany(notAdded.map((o) => o.id))}
              >
                {notAdded.length ? <Plus aria-hidden="true" /> : <Check aria-hidden="true" />}
                {notAdded.length ? t('Add all {count} to enquiry', { count: notAdded.length }) : t('All added to enquiry')}
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
                        aria-label={added ? t('Remove {name} from your enquiry', { name: o.name }) : t('Add {name} to your enquiry', { name: o.name })}
                        title={added ? t('In your enquiry') : t('Add to your enquiry')}
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
            {t('Show {offerings} from {areas} →', { offerings: plural(t, results.length, 'offering'), areas: plural(t, areas.size, 'area') })}
          </button>
        ) : (
          <span className="navigation-footer-count">
            <ShoppingBag aria-hidden="true" />
            {t('{offerings} in your enquiry', { offerings: plural(t, interests.size, 'offering') })}
          </span>
        )}
        <button type="button" className="view-interests" disabled={!interests.size} onClick={onOpenInterests}>
          {t('View enquiry')}
        </button>
      </footer>
    </dialog>
  );
}

const EMPTY_FORM = {
  name: '',
  email: '',
  company: '',
  phone: '', // as typed; checked and sent in international form
  phoneCountry: guessCountry(),
  preferredContact: CONTACT_METHODS[0],
  timeline: TIMELINES[1],
  message: '',
  consent: false,
  website: '', // spam trap, hidden from people
};

function validate(form, t) {
  const errors = {};
  if (!form.name.trim()) errors.name = t('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = t('Please enter a valid email address.');
  if (!form.company.trim()) errors.company = t('Please enter your company.');
  const phone = checkPhone(form.phone, form.phoneCountry);
  if (phone.empty && ['Phone call', 'WhatsApp'].includes(form.preferredContact)) {
    errors.phone =
      form.preferredContact === 'WhatsApp'
        ? t('Please add a phone number for WhatsApp.')
        : t('Please add a phone number for a call.');
  } else if (!phone.empty && !phone.valid) {
    errors.phone = t('This number doesn’t look right for the selected country code. Check the digits or choose another country.');
  }
  if (!form.consent) errors.consent = t('Please confirm we may contact you about this request.');
  return errors;
}

function Field({ id, label, error, optional, children }) {
  const t = useT();
  return (
    <div className={`enq-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {t(label)} {optional && <span className="enq-optional">{t('optional')}</span>}
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

const STEPS = ['Shortlist', 'Your details', 'Review', 'Sent'];

/**
 * Review step: the email exactly as it will be sent (recipient, subject and body), so the
 * visitor can check it before anything leaves the site.
 */
function EmailPreview({ enquiry, sending, sendError, onEdit, onSend }) {
  const t = useT();
  const { subject, body } = enquiryEmail(enquiry);
  const viaBackend = isBackendConfigured();
  return (
    <div className="enq-preview">
      <p className="enq-preview-intro">
        {viaBackend
          ? t('This is the email our team will receive. Check it, then send it. You will also get a confirmation at {email}.', { email: enquiry.contact.email })
          : t('This is the email that will open in your email app, ready to send. Check it first.')}
      </p>
      <div className="enq-preview-mail" dir="ltr" lang="en">
        <dl>
          <div>
            <dt>{t('To')}</dt>
            <dd>MindSuite &lt;{ENQUIRY_INBOX}&gt;</dd>
          </div>
          <div>
            <dt>{t('Reply to')}</dt>
            <dd>
              {enquiry.contact.name} &lt;{enquiry.contact.email}&gt;
            </dd>
          </div>
          <div>
            <dt>{t('Subject')}</dt>
            <dd>{subject}</dd>
          </div>
        </dl>
        <pre>{body}</pre>
      </div>
      {sendError && (
        <p className="enq-send-error" role="alert">
          {sendError}
        </p>
      )}
      <div className="enq-actions">
        <button type="button" className="enq-primary" disabled={sending} onClick={onSend}>
          {sending ? t('Sending…') : t('Send request')}
        </button>
        <button type="button" className="interests-clear" onClick={onEdit} disabled={sending}>
          {t('Edit details')}
        </button>
      </div>
    </div>
  );
}

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
  const [preview, setPreview] = useState(null); // the enquiry shown on the Review step
  const t = useT();

  const selected = [...interests].map((id) => offeringById.get(id)).filter(Boolean);
  const stepIndex = { list: 0, form: 1, review: 2, done: 3 }[step];

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
  const setPhone = ({ country, value }) => {
    setForm((f) => ({ ...f, phoneCountry: country, phone: value }));
    if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }));
  };

  // "Review": check the form, then show the email exactly as it will be sent.
  function review(e) {
    e.preventDefault();
    const found = validate(form, t);
    setErrors(found);
    if (Object.keys(found).length) {
      ref.current.querySelector(`#enq-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSendError('');
    // The team works in English, so the email lists offerings by their English names.
    const english = selected.map((o) => ({
      id: o.id,
      name: inEnglish(o).name,
      family: { name: inEnglish(o.family).name },
      area: { name: inEnglish(o.area).name },
    }));
    setPreview(buildEnquiry({ ...form, phone: checkPhone(form.phone, form.phoneCountry).international }, english));
    setStep('review');
  }

  async function send() {
    const enquiry = preview;
    setSending(true);
    setSendError('');
    try {
      const { via } = await sendEnquiry(enquiry);
      setResult({ reference: enquiry.reference, via, offerings: selected.map((o) => o.name) });
      setStep('done');
      if (via === 'backend') {
        onClear();
        setForm(EMPTY_FORM);
        setPreview(null);
      }
    } catch (err) {
      setSendError(
        err?.status === 429
          ? t('You have sent several requests in a short time. Please wait a few minutes, or email {email}.', { email: ENQUIRY_INBOX })
          : t('We could not send your request just now. Please try again, or email {email}.', { email: ENQUIRY_INBOX })
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
            {step === 'list'
              ? t('Your enquiry')
              : step === 'form'
                ? t('Request a proposal')
                : step === 'review'
                  ? t('Review your request')
                  : t('Request sent')}
          </h2>
          <p className="interests-count">
            {step === 'done'
              ? t('Reference {ref}', { ref: result?.reference })
              : t(selected.length === 1 ? '{count} offering selected' : '{count} offerings selected', { count: selected.length })}
          </p>
        </div>
        <div className="interests-close-wrap">
          <span className="navigation-hint" aria-hidden="true">
            <kbd>Esc</kbd> {t('to close')}
          </span>
          <button type="button" className="interests-close" autoFocus ref={closeRef} onClick={onClose}>
            {t('Close')}
          </button>
        </div>
      </div>

      <ol className="enq-steps" aria-label={t('Progress')}>
        {STEPS.map((label, i) => (
          <li key={label} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : undefined} aria-current={i === stepIndex ? 'step' : undefined}>
            <span>{i < stepIndex ? '✓' : i + 1}</span>
            {t(label)}
          </li>
        ))}
      </ol>

      {step === 'list' && (
        <>
          <p className="interests-empty" hidden={selected.length > 0}>
            {t('Choose “Add to enquiry” on any offering to collect it here. You can then send one request for all of them.')}
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
                  aria-label={t('Remove {name}', { name: o.name })}
                  onClick={() => {
                    onRemove(o.id);
                    requestAnimationFrame(() =>
                      (listRef.current?.querySelector('button') || closeRef.current)?.focus()
                    );
                  }}
                >
                  {t('Remove')}
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
              {t('Request a proposal')} <span aria-hidden="true">→</span>
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
              {t('Clear all')}
            </button>
          </div>
          {selected.length > 0 && (
            <p className="enq-note">
              {t(
                selected.length === 1
                  ? 'Share a few details and a MindSuite expert will contact you about this offering. Scope and fees are agreed with you before any work starts.'
                  : 'Share a few details and a MindSuite expert will contact you about these {count} offerings. Scope and fees are agreed with you before any work starts.',
                { count: selected.length }
              )}
            </p>
          )}
        </>
      )}

      {step === 'form' && (
        <form className="enq-form" onSubmit={review} noValidate>
          <div className="enq-summary">
            <div>
              <strong>{t(selected.length === 1 ? '{count} offering' : '{count} offerings', { count: selected.length })}</strong>
              <span>{selected.map((o) => o.name).join(' · ')}</span>
            </div>
            <button type="button" onClick={() => setStep('list')}>
              {t('Edit')}
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
              <PhoneInput
                id="enq-phone"
                country={form.phoneCountry}
                value={form.phone}
                onChange={setPhone}
                invalid={Boolean(errors.phone)}
                describedBy={errors.phone ? 'enq-phone-error' : undefined}
              />
            </Field>
          </div>

          <fieldset className="enq-choice">
            <legend>{t('How should we contact you?')}</legend>
            <div>
              {CONTACT_METHODS.map((m) => (
                <label key={m} className={form.preferredContact === m ? 'is-on' : undefined}>
                  <input type="radio" name="preferredContact" value={m} checked={form.preferredContact === m} onChange={set('preferredContact')} />
                  {t(m)}
                </label>
              ))}
            </div>
          </fieldset>

          <Field id="enq-timeline" label="When would you like to start?">
            <select id="enq-timeline" value={form.timeline} onChange={set('timeline')}>
              {TIMELINES.map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </Field>

          <Field id="enq-message" label="What would you like to achieve?" optional>
            <textarea
              id="enq-message"
              rows={4}
              maxLength={2000}
              placeholder={t('A sentence or two about the challenge, systems involved or the outcome you need.')}
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
              <span>{t('MindSuite may contact me about this request using the details above.')}</span>
            </label>
            {errors.consent && (
              <p className="enq-error" id="enq-consent-error">
                {errors.consent}
              </p>
            )}
          </div>

          <div className="enq-actions">
            <button type="submit" className="enq-primary">
              {t('Review email')} <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="interests-clear" onClick={() => setStep('list')}>
              {t('Back')}
            </button>
          </div>
        </form>
      )}

      {step === 'review' && preview && (
        <EmailPreview
          enquiry={preview}
          sending={sending}
          sendError={sendError}
          onEdit={() => setStep('form')}
          onSend={send}
        />
      )}

      {step === 'done' && result && (
        <div className="enq-done" role="status">
          <span className="enq-done-icon" aria-hidden="true">✓</span>
          {result.via === 'backend' ? (
            <>
              <h3>{t('Thank you, your request is with our team.')}</h3>
              <p>
                {t(
                  result.offerings.length === 1
                    ? 'We have sent the details of your selected offering to a MindSuite expert.'
                    : 'We have sent the details of your {count} selected offerings to a MindSuite expert.',
                  { count: result.offerings.length }
                )}
              </p>
            </>
          ) : (
            <>
              <h3>{t('Almost done: press Send in your email app.')}</h3>
              <p>
                {t('Your email app has opened with the full request addressed to {email}. Send it to complete your request.', { email: ENQUIRY_INBOX })}{' '}
                {t('If nothing opened, email us at')}{' '}
                <a href={`mailto:${ENQUIRY_INBOX}?subject=${encodeURIComponent(`Proposal request ${result.reference}`)}`}>{ENQUIRY_INBOX}</a>{' '}
                {t('and quote')} <strong>{result.reference}</strong>.
              </p>
            </>
          )}
          <h4>{t('What happens next')}</h4>
          <ol className="enq-next">
            <li><strong>{t('Acknowledgement')}</strong> {t('within one business day.')}</li>
            <li><strong>{t('Discovery call')}</strong> {t('with the relevant practice lead.')}</li>
            <li><strong>{t('Scope proposal')}</strong> {t('with deliverables, acceptance criteria and fees.')}</li>
          </ol>
          <div className="enq-actions">
            <button type="button" className="enq-primary" onClick={onClose}>
              {t('Done')}
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
                {t('I sent it — clear my list')}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
