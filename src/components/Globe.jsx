import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { families } from '../data/catalogue.js';

// One satellite per distinct service-area icon in the catalogue.
const SATELLITE_ICONS = [...new Set(families.flatMap((f) => f.areas.map((a) => a.icon)))];

// Fixed, evenly scattered orbits, so satellites surround the globe instead of forming a band.
const orbits = SATELLITE_ICONS.map((_, i) => ({
  tilt: ((i * 0.618) % 1) * Math.PI,
  node: i * 2.4,
  radius: 1.12 + ((i * 0.381) % 1) * 0.3,
  speed: (0.07 + ((i * 0.73) % 1) * 0.07) * (i % 2 ? 1 : -1),
  phase: i * 1.7,
}));

/**
 * Rotating wireframe globe circled by small service satellites, drawn behind its parent
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
      ctx.strokeStyle = s.light ? 'rgba(86,80,162,.24)' : 'rgba(156,141,233,.25)';
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
      symbolsRef.current.forEach((node, i) => {
        if (!node) return;
        const o = orbits[i];
        const R = r * o.radius;
        // A point on this satellite's own circular orbit, tilted into 3D.
        const a = o.phase + t * o.speed;
        const px = R * Math.cos(a);
        const py = R * Math.sin(a) * Math.cos(o.tilt);
        const pz = R * Math.sin(a) * Math.sin(o.tilt);
        const x = px * Math.cos(o.node) + pz * Math.sin(o.node);
        const z = pz * Math.cos(o.node) - px * Math.sin(o.node);
        const depth = (z / R + 1) / 2; // 0 = far side, 1 = nearest
        const behindGlobe = z < 0 && Math.hypot(x, py) < r;
        const opacity = behindGlobe ? 0.1 : 0.35 + depth * 0.5;
        node.style.transform = `translate(${cx + x - 11}px,${cy + py - 11}px) scale(${0.75 + depth * 0.3})`;
        node.style.opacity = String(sidebar ? opacity * 0.4 : opacity);
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
        {(sidebar ? SATELLITE_ICONS.slice(0, 8) : SATELLITE_ICONS).map((name, i) => (
          <div className="orbit-symbol" key={name} ref={(el) => (symbolsRef.current[i] = el)}>
            <Icon name={name} className="" />
          </div>
        ))}
      </div>
    </>
  );
}
