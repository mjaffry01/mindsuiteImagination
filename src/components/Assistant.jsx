import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { focusTarget } from './Dialogs.jsx';
import { offeringById } from '../data/catalogue.js';
import { localAssistantReply } from '../data/matcher.js';
import { useT } from '../i18n/index.jsx';

const STORAGE_KEY = 'mindsuite-assistant-position-v1';
const GREETING = 'Describe what you want to improve. I can help you explore offerings and build your interests list.';
const PROMPTS = [
  ['Single sign-on', 'We need single sign-on for our applications'],
  ['Ransomware', 'We want to prepare for ransomware recovery'],
  ['ERP integration', 'We need ERP integration'],
];
// Optional: point at a backend that speaks the original /api/assistant contract.
const REMOTE_URL = import.meta.env.VITE_ASSISTANT_URL;

const clamp = (n, min, max) => Math.max(min, Math.min(n, Math.max(min, max)));
let nextId = 1;

function savedPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      return { x: saved.x * innerWidth, y: saved.y * innerHeight };
    }
  } catch {}
  return { x: innerWidth - 88, y: innerHeight - 160 };
}

/** Draggable "Help me choose" guide that recommends offerings for a described need. */
export default function Assistant({ interests, onAdd }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => clampPos(savedPosition()));
  const [panelBox, setPanelBox] = useState(null);
  const [messages, setMessages] = useState(() => [{ id: 0, who: 'guide', text: GREETING }]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(REMOTE_URL ? 'Connecting...' : 'Catalogue matching');
  const [disclosure, setDisclosure] = useState(
    REMOTE_URL
      ? 'Checking recommendation availability.'
      : 'Matches use catalogue terms. Your messages stay in this browser.'
  );
  const history = useRef([]);
  // True once the server confirms AI recommendations are configured.
  const aiReady = useRef(false);
  const t = useT();
  const petRef = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);

  function clampPos({ x, y }) {
    return { x: clamp(x, 12, innerWidth - 76), y: clamp(y, 12, innerHeight - 76) };
  }

  const persist = (p) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: p.x / innerWidth, y: p.y / innerHeight }));
    } catch {}
  };

  const place = useCallback((p, save = false) => {
    const next = clampPos(p);
    setPos(next);
    if (save) persist(next);
  }, []);

  // Panel sits above the pet, aligned to whichever side of the screen it is on.
  const positionPanel = useCallback(() => {
    const width = Math.min(390, innerWidth - 24);
    const height = Math.min(570, innerHeight - 100);
    const left = pos.x < innerWidth / 2 ? pos.x : pos.x + 64 - width;
    setPanelBox({
      width,
      height,
      left: clamp(left, 12, innerWidth - width - 12),
      top: clamp(pos.y - height - 12, 12, innerHeight - height - 80),
    });
  }, [pos]);
  useLayoutEffect(positionPanel, [positionPanel]);

  useEffect(() => {
    const onResize = () => setPos(clampPos(savedPosition()));
    addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', positionPanel);
    return () => {
      removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', positionPanel);
    };
  }, [positionPanel]);

  useEffect(() => {
    if (!REMOTE_URL) return;
    fetch(REMOTE_URL)
      .then((r) => r.json())
      .then((result) => {
        const ai = result.mode === 'ai';
        aiReady.current = ai;
        setMode(ai ? 'AI recommendations' : 'Catalogue matching');
        setDisclosure(
          ai
            ? 'Messages are sent to our AI provider (Anthropic) to suggest offerings.'
            : 'Matches use catalogue terms. Your messages stay in this browser.'
        );
      })
      .catch(() => {
        setMode('Catalogue matching');
        setDisclosure('Matches use catalogue terms. Your messages stay in this browser.');
      });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  const toggle = (value) => {
    setOpen(value);
    requestAnimationFrame(() => (value ? inputRef.current : petRef.current)?.focus());
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, left: pos.x, top: pos.y };
    moved.current = false;
    petRef.current.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved.current = true;
    if (moved.current) place({ x: d.left + dx, y: d.top + dy });
  };
  const finishDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    // On phones, snap to the nearest edge after a drag.
    const x =
      innerWidth <= 600 && moved.current ? (pos.x < innerWidth / 2 ? 12 : innerWidth - 76) : pos.x;
    place({ x, y: pos.y }, true);
  };
  const onKeyDown = (e) => {
    const steps = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    place({ x: pos.x + step[0], y: pos.y + step[1] }, true);
  };

  const update = (id, patch) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function ask(text) {
    const trimmed = text.slice(0, 2000);
    if (busy || !trimmed.trim()) return;
    setBusy(true);
    setInput('');
    const pendingId = nextId++;
    setMessages((list) => [
      ...list,
      { id: nextId++, who: 'visitor', text: trimmed },
      { id: pendingId, who: 'guide', text: 'Finding relevant offerings...' },
    ]);
    try {
      let result;
      if (REMOTE_URL && aiReady.current) {
        try {
          const response = await fetch(REMOTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [...history.current, { role: 'user', content: trimmed }].slice(-11) }),
            signal: AbortSignal.timeout(45000),
          });
          result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Please try again.');
        } catch (error) {
          // Keep helping: answer from the catalogue and say why.
          result = {
            ...localAssistantReply(trimmed),
            notice:
              error.name === 'TimeoutError'
                ? 'The AI guide took too long, so these are catalogue matches.'
                : 'These are catalogue matches for now.',
          };
        }
      } else {
        result = localAssistantReply(trimmed);
      }
      update(pendingId, {
        text: result.message,
        vars: result.vars,
        notice: result.notice,
        suggestions: (result.suggestions || []).filter((s) => offeringById.has(s.id)),
      });
      history.current.push({ role: 'user', content: trimmed }, { role: 'assistant', content: t(result.message, result.vars) });
      if (history.current.length > 10) history.current.splice(0, history.current.length - 10);
    } catch (error) {
      update(pendingId, {
        text:
          error.name === 'TimeoutError'
            ? 'I could not complete that request. The response took too long.'
            : 'I could not complete that request. Please try again or use catalogue search.',
        retry: trimmed,
      });
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    history.current = [];
    setMessages([{ id: nextId++, who: 'guide', text: GREETING }]);
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="assistant-pet"
        ref={petRef}
        style={{ left: pos.x, top: pos.y }}
        aria-label={t('MindSuite guide. Drag to move, or use arrow keys. Click to chat.')}
        aria-expanded={open}
        aria-controls="offering-assistant"
        title={t('Drag to move. Click to chat.')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          toggle(!open);
        }}
      >
        <span className="assistant-face" aria-hidden="true" />
        <span className="assistant-pet-label" aria-hidden="true">
          {t('Help me choose')}
        </span>
      </button>

      <section
        id="offering-assistant"
        role="dialog"
        aria-modal="false"
        aria-labelledby="assistant-title"
        hidden={!open}
        style={panelBox || undefined}
        onKeyDown={(e) => e.key === 'Escape' && toggle(false)}
      >
        <header className="assistant-header">
          <div>
            <h2 id="assistant-title">{t('MindSuite guide')}</h2>
            <span className="assistant-mode">{t(mode)}</span>
          </div>
          <button type="button" className="assistant-minimize" aria-label={t('Minimize assistant')} onClick={() => toggle(false)}>
            &#8722;
          </button>
        </header>
        <div className="assistant-toolbar">
          <button type="button" className="assistant-reset" disabled={busy} onClick={reset}>
            {t('New conversation')}
          </button>
          <button
            type="button"
            className="assistant-position-reset"
            onClick={() => place({ x: innerWidth - 88, y: innerHeight - 160 }, true)}
          >
            {t('Reset position')}
          </button>
        </div>
        <div className="assistant-messages" role="log" aria-live="polite" aria-label={t('Conversation')} ref={logRef}>
          {messages.map((m) => (
            <div key={m.id} className={`assistant-message ${m.who}`}>
              <small>{m.who === 'visitor' ? t('You') : t('MindSuite guide')}</small>
              {/* Guide messages may be interface strings (translated here) or AI replies (shown as written). */}
              <p>{m.who === 'visitor' ? m.text : t(m.text, m.vars)}</p>
              {m.notice && <p className="assistant-notice">{t(m.notice)}</p>}
              {m.suggestions?.map((s) => {
                const o = offeringById.get(s.id);
                const added = interests.has(o.id);
                return (
                  <div className="assistant-offering" key={o.id}>
                    <strong>
                      <Icon name={o.icon} />
                      {o.name}
                    </strong>
                    <p>{s.reason || o.definition}</p>
                    <div className="assistant-card-actions">
                      <button type="button" disabled={added} onClick={() => onAdd(o.id)}>
                        <Icon name={added ? 'Check' : 'Plus'} />
                        {added ? t('Added to interests') : t('Add to my interests')}
                      </button>
                      <a
                        href={`#${o.id}`}
                        onClick={() => {
                          toggle(false);
                          focusTarget(o.id);
                        }}
                      >
                        {t('View details')}
                      </a>
                    </div>
                  </div>
                );
              })}
              {m.retry && !busy && (
                <button
                  type="button"
                  className="assistant-retry"
                  onClick={() => {
                    setMessages((list) => list.filter((x) => x.id !== m.id));
                    ask(m.retry);
                  }}
                >
                  {t('Try again')}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="assistant-prompts">
          {PROMPTS.map(([label, prompt]) => (
            <button type="button" key={label} onClick={() => ask(t(prompt))}>
              {t(label)}
            </button>
          ))}
        </div>
        <form
          className="assistant-input"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <textarea
            ref={inputRef}
            aria-label={t('Describe your business need')}
            maxLength={2000}
            placeholder={t('What would you like to improve?')}
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask(input);
              }
            }}
          />
          <button type="submit" disabled={busy}>
            {t('Send')}
          </button>
        </form>
        <p className="assistant-disclosure">{t(disclosure)}</p>
      </section>
    </>
  );
}
