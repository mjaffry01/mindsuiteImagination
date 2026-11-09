import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { families } from '../data/catalogue.js';
import { useT } from '../i18n/index.jsx';

const HEX_WIDTH = 112;
const HEX_HEIGHT = (HEX_WIDTH * Math.sqrt(3)) / 2;
const COLS = 3;
const DRAG_START_PX = 6;
const STORAGE_KEY = 'mindsuite-hex-order-v1';
const DEFAULT_ORDER = families.map((f) => f.id);
const SAME = (a, b) => a.every((id, i) => id === b[i]);

function slot(i) {
  return {
    left: (i % COLS) * HEX_WIDTH * 0.75,
    top: Math.floor(i / COLS) * HEX_HEIGHT + ((i % COLS) % 2) * (HEX_HEIGHT / 2),
  };
}

function savedOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid = Array.isArray(saved) && saved.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every((id) => saved.includes(id));
    if (valid) return saved;
  } catch {}
  return DEFAULT_ORDER;
}

function save(order) {
  try {
    if (SAME(order, DEFAULT_ORDER)) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {}
}

const moved = (order, id, to) => {
  const next = order.filter((x) => x !== id);
  next.splice(to, 0, id);
  return next;
};

/**
 * The service-family hexagons. Drag one to rearrange them: the others slide out of its way and
 * the arrangement is remembered in this browser. A plain click still jumps to the family.
 */
export default function HexFamilyMap({ currentId }) {
  const t = useT();
  const [order, setOrder] = useState(savedOrder);
  const [dragging, setDragging] = useState(null); // { id, x, y } while a hexagon is held
  const [announcement, setAnnouncement] = useState('');
  const navRef = useRef(null);
  const gesture = useRef(null);
  const orderRef = useRef(order);
  const skipClick = useRef(false);
  const skipTimer = useRef(0);
  orderRef.current = order;

  const width = HEX_WIDTH * 2.5;
  const height = Math.ceil(families.length / COLS) * HEX_HEIGHT + HEX_HEIGHT / 2;

  const apply = (next) => {
    orderRef.current = next;
    setOrder(next);
  };

  const nameOf = (id) => families.find((f) => f.id === id).name;
  const announceMove = (id) =>
    setAnnouncement(
      t('{name} moved to position {n} of {total}', { name: nameOf(id), n: orderRef.current.indexOf(id) + 1, total: families.length })
    );

  // The click that ends a drag must not also follow the link.
  const ignoreNextClick = () => {
    skipClick.current = true;
    clearTimeout(skipTimer.current);
    skipTimer.current = setTimeout(() => {
      skipClick.current = false;
    }, 50);
  };

  /** Drops the hexagon back where it started; the press itself may still be going on. */
  const cancelDrag = () => {
    const g = gesture.current;
    if (!g?.active || g.cancelled) return;
    g.cancelled = true;
    apply(g.startOrder);
    setDragging(null);
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      cancelDrag();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // Only needs to follow whether a drag is in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(dragging)]);

  // Another tab of the site changed the arrangement.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && !gesture.current) apply(savedOrder());
    };
    addEventListener('storage', onStorage);
    return () => {
      removeEventListener('storage', onStorage);
      clearTimeout(skipTimer.current);
    };
  }, []);

  const onPointerDown = (e, id) => {
    if (e.button !== 0 || !e.isPrimary || gesture.current) return;
    const nav = navRef.current.getBoundingClientRect();
    const from = slot(orderRef.current.indexOf(id));
    gesture.current = {
      id,
      pointerId: e.pointerId,
      startOrder: orderRef.current,
      startX: e.clientX,
      startY: e.clientY,
      grabX: e.clientX - nav.left - from.left,
      grabY: e.clientY - nav.top - from.top,
      active: false,
      cancelled: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Dragging still follows the pointer while it stays over the hexagon.
    }
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId || g.cancelled) return;
    // The button was released somewhere we could not see, such as outside the window.
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      if (g.active) {
        save(orderRef.current);
        announceMove(g.id);
        setDragging(null);
      }
      gesture.current = null;
      return;
    }
    if (!g.active && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_START_PX) return;
    g.active = true;
    const nav = navRef.current.getBoundingClientRect();
    const x = Math.max(-8, Math.min(width - HEX_WIDTH + 8, e.clientX - nav.left - g.grabX));
    const y = Math.max(-8, Math.min(height - HEX_HEIGHT + 8, e.clientY - nav.top - g.grabY));
    setDragging({ id: g.id, x, y });
    // The nearest empty place decides where the hexagon would land.
    let nearest = 0;
    let best = Infinity;
    orderRef.current.forEach((_, i) => {
      const s = slot(i);
      const distance = Math.hypot(s.left - x, s.top - y);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    if (orderRef.current.indexOf(g.id) !== nearest) apply(moved(orderRef.current, g.id, nearest));
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (!g.active) return;
    ignoreNextClick();
    if (g.cancelled) return;
    setDragging(null);
    save(orderRef.current);
    announceMove(g.id);
  };

  // The browser took the pointer away (a call, a system gesture…): undo rather than guess.
  const onPointerLost = (e) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    cancelDrag();
    gesture.current = null;
  };

  const onClickCapture = (e) => {
    if (!skipClick.current) return;
    skipClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeyDown = (e, id) => {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!e.shiftKey || !step) return;
    e.preventDefault();
    const mirrored = document.documentElement.dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');
    const to = orderRef.current.indexOf(id) + (mirrored ? -step : step);
    if (to < 0 || to >= orderRef.current.length) return;
    const next = moved(orderRef.current, id, to);
    apply(next);
    save(next);
    announceMove(id);
  };

  const reset = () => {
    apply(DEFAULT_ORDER);
    save(DEFAULT_ORDER);
    setAnnouncement(t('Order reset'));
    // The reset button disappears, so keep keyboard users in the map.
    navRef.current.querySelector('a').focus();
  };

  return (
    <>
      <div className="map-label hex-label">
        <span>{t('Service families')}</span>
        {SAME(order, DEFAULT_ORDER) ? (
          <small>{t('Drag to rearrange')}</small>
        ) : (
          <button type="button" onClick={reset}>
            {t('Reset order')}
          </button>
        )}
      </div>
      <nav
        ref={navRef}
        className="hex-map family-map"
        aria-label={t('Jump to a service family')}
        style={{ width, height }}
        onClickCapture={onClickCapture}
      >
        {families.map((f) => {
          const held = dragging?.id === f.id;
          const place = held ? { left: dragging.x, top: dragging.y } : slot(order.indexOf(f.id));
          return (
            <a
              key={f.id}
              href={`#${f.id}`}
              className={`map-cell${held ? ' is-dragging' : ''}`}
              aria-label={f.name}
              aria-description={t('Drag to rearrange, or hold Shift and press an arrow key.')}
              title={f.name}
              aria-current={String(f.id === currentId)}
              style={{ width: HEX_WIDTH, height: HEX_HEIGHT, ...place }}
              draggable={false}
              onPointerDown={(e) => onPointerDown(e, f.id)}
              onPointerMove={onPointerMove}
              onDragStart={(e) => e.preventDefault()}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerLost}
              onLostPointerCapture={onPointerLost}
              onKeyDown={(e) => onKeyDown(e, f.id)}
            >
              <Icon name={f.icon} className="" />
              <span>{f.short}</span>
            </a>
          );
        })}
      </nav>
      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}
