import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

const ORBIT_ICONS = ['code-xml', 'cloud', 'cpu', 'shield-check', 'database', 'network'];

/**
 * Rotating wireframe globe with orbiting service symbols, drawn behind its parent
 * `.globe-scene` element. `sidebar` switches to the compact map-column framing.
 */
export default function Globe({ playing, sidebar = false, light = false }) {
  const canvasRef = useRef(null);
  const symbolsRef = useRef([]);
  const state = useRef({ t: 0, last: 0, playing, light, w: 0, h: 0 });
  state.current.playing = playing;
  state.current.light = light;

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const s = state.current;
    let raf = 0;

    function draw() {
      const { w, h, t } = s;
      if (!w || !h) return;
      const bounds = scene.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > innerHeight) return;
      ctx.clearRect(0, 0, w, h);
      const cx = w * (sidebar ? 0.5 : 0.76);
      const cy = h * (sidebar ? 0.55 : 0.48);
      const r = Math.min(w * (sidebar ? 0.6 : 0.32), 300);
      const turn = t * 0.06;
      const project = (lat, lon) => {
        const x = Math.cos(lat) * Math.sin(lon + turn);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lon + turn);
        return [cx + r * x, cy + r * (y * 0.985 - z * 0.17)];
      };
      const path = (points) => {
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      };
      ctx.strokeStyle = s.light ? 'rgba(81,90,143,.24)' : 'rgba(141,183,233,.25)';
      ctx.lineWidth = 0.7;
      const rad = Math.PI / 180;
      for (let lat = -75; lat <= 75; lat += 15) {
        const p = [];
        for (let lon = 0; lon <= 360; lon += 5) p.push(project(lat * rad, lon * rad));
        path(p);
      }
      for (let lon = 0; lon < 360; lon += 20) {
        const p = [];
        for (let lat = -90; lat <= 90; lat += 4) p.push(project(lat * rad, lon * rad));
        path(p);
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.2, r * 0.38, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      symbolsRef.current.forEach((node, i) => {
        if (!node) return;
        const a = t * 0.08 + (i * Math.PI) / 3;
        const x = Math.cos(a) * r * 1.2;
        const y = Math.sin(a) * r * 0.45;
        node.style.transform = `translate(${cx + x * 0.92 + y * 0.39 - 18}px,${cy - x * 0.39 + y * 0.92 - 18}px)`;
        node.style.opacity = sidebar ? '.22' : '.6';
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      s.w = rect.width;
      s.h = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function frame(now) {
      if (s.last && s.playing) s.t += Math.min((now - s.last) / 1000, 0.05);
      s.last = now;
      if (s.playing) draw();
      raf = requestAnimationFrame(frame);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(scene);
    resize();
    raf = requestAnimationFrame(frame);
    s.redraw = draw;
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [sidebar]);

  // Repaint when the sidebar switches between light and dark families while paused.
  useEffect(() => {
    state.current.redraw?.();
  }, [light]);

  return (
    <>
      <canvas className="globe-canvas" aria-hidden="true" ref={canvasRef} />
      <div className="orbit-symbols" aria-hidden="true">
        {ORBIT_ICONS.map((name, i) => (
          <div className="orbit-symbol" key={name} ref={(el) => (symbolsRef.current[i] = el)}>
            <Icon name={name} className="" />
          </div>
        ))}
      </div>
    </>
  );
}
