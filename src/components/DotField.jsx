import { useEffect, useRef } from 'react';

const SPACING = 22; // px between dots
const RADIUS = 130; // reach of the dent around the cursor
const PUSH = 30; // how far dots at the centre are pushed outward
const BASE_ALPHA = 0.2;

/**
 * Dot grid that dents around the pointer: dots inside the radius are pushed outward
 * into a bright rim, leaving a soft crater that follows the mouse. Draws behind the
 * hero content and only animates while the dent is moving or settling.
 */
export default function DotField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = reduce ? 1 : 0.16;

    let w = 0;
    let h = 0;
    let raf = 0;
    // Pointer target and eased position, plus how strongly the dent shows (0–1).
    const target = { x: 0, y: 0, on: 0 };
    const cur = { x: 0, y: 0, on: 0 };

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const r2 = RADIUS * RADIUS;
      for (let y = SPACING / 2; y < h; y += SPACING) {
        for (let x = SPACING / 2; x < w; x += SPACING) {
          let px = x;
          let py = y;
          let alpha = BASE_ALPHA;
          let size = 1;
          if (cur.on > 0.001) {
            const dx = x - cur.x;
            const dy = y - cur.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
              const d = Math.sqrt(d2) || 0.001;
              const f = 1 - d / RADIUS; // 1 at centre, 0 at edge
              const shift = PUSH * f * f * (3 - 2 * f) * cur.on; // smoothstep falloff
              px += (dx / d) * shift;
              py += (dy / d) * shift;
              // Brightest on the rim the dots pile into, fading toward the centre.
              const rim = Math.sin(Math.PI * Math.min(1, (d + shift) / RADIUS));
              alpha += 0.55 * rim * cur.on;
              size += 0.5 * rim * cur.on;
            }
          }
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame() {
      cur.x += (target.x - cur.x) * ease;
      cur.y += (target.y - cur.y) * ease;
      cur.on += (target.on - cur.on) * (reduce ? 1 : 0.1);
      draw();
      const settling =
        Math.abs(target.x - cur.x) > 0.3 ||
        Math.abs(target.y - cur.y) > 0.3 ||
        Math.abs(target.on - cur.on) > 0.002;
      raf = settling ? requestAnimationFrame(frame) : 0;
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    function resize() {
      const rect = scene.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#c3cdf0';
      draw();
    }

    const onMove = (e) => {
      const rect = scene.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      if (cur.on < 0.01) {
        // Start the dent where the pointer enters instead of sliding in from a corner.
        cur.x = target.x;
        cur.y = target.y;
      }
      target.on = 1;
      kick();
    };
    const onLeave = () => {
      target.on = 0;
      kick();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(scene);
    resize();
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerleave', onLeave);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas className="dot-field" aria-hidden="true" ref={canvasRef} />;
}
