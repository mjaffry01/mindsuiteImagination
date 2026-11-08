import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Globe from './Globe.jsx';
import Icon from './Icon.jsx';
import { families, offerings } from '../data/catalogue.js';

const HEX_WIDTH = 112;
const HEX_HEIGHT = (HEX_WIDTH * Math.sqrt(3)) / 2;
const COLS = 3;

function hexStyle(i) {
  return {
    width: HEX_WIDTH,
    height: HEX_HEIGHT,
    left: (i % COLS) * HEX_WIDTH * 0.75,
    top: Math.floor(i / COLS) * HEX_HEIGHT + ((i % COLS) % 2) * (HEX_HEIGHT / 2),
  };
}

/** Floating label for rail icons (a CSS tooltip would be clipped by the column's scroll area). */
function useRailTip() {
  const [tip, setTip] = useState(null);
  const show = (label) => (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hide = () => setTip(null);
  const bind = (label) => ({ onMouseEnter: show(label), onFocus: show(label), onMouseLeave: hide, onBlur: hide });
  const node = tip && (
    <span className="rail-tip" role="presentation" style={{ top: tip.top, left: tip.left }}>
      {tip.label}
    </span>
  );
  return [bind, node];
}

/** Collapsed service map: a thin strip of icons with the same information. */
function MapRail({ current, onOpenSearch, onToggle }) {
  const family = current.family;
  const [tipFor, tip] = useRailTip();
  const progress = ((current.index + 1) / offerings.length) * 100;

  return (
    <aside className={`map-column map-rail${family.theme === 'dark' ? ' dark' : ''}`} aria-label="Connected service map (collapsed)">
      <button type="button" className="rail-btn rail-toggle" aria-label="Expand service map" aria-expanded="false" onClick={onToggle} {...tipFor('Expand service map')}>
        <PanelLeftOpen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="rail-btn"
        aria-label={`Search all ${offerings.length} offerings`}
        aria-haspopup="dialog"
        aria-controls="catalogue-navigation"
        onClick={onOpenSearch}
        {...tipFor(`Search all ${offerings.length} offerings`)}
      >
        <Icon name="Search" />
      </button>

      <span className="rail-divider" aria-hidden="true" />
      <nav className="rail-group" aria-label="Jump to a service family">
        {families.map((f) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className="rail-btn rail-family"
            aria-label={f.name}
            aria-current={String(f.id === family.id)}
            {...tipFor(f.name)}
          >
            <Icon name={f.icon} />
          </a>
        ))}
      </nav>

      <span className="rail-divider" aria-hidden="true" />
      <nav className="rail-group" aria-label={`${family.name} service areas`}>
        {family.areas.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="rail-btn rail-area"
            aria-label={`${a.name}, ${a.offerings.length} offerings`}
            aria-current={String(a.id === current.area.id)}
            {...tipFor(`${a.name} · ${a.offerings.length}`)}
          >
            <Icon name={a.icon} />
          </a>
        ))}
      </nav>

      <div
        className="rail-progress"
        role="img"
        aria-label={`Reading ${current.name}, ${current.index + 1} of ${offerings.length} offerings`}
        tabIndex={0}
        {...tipFor(`Reading now: ${current.name} (${current.index + 1} of ${offerings.length})`)}
      >
        <span className="rail-progress-icon">
          <Icon name={current.icon} />
        </span>
        <span className="rail-progress-track">
          <span style={{ height: `${progress}%` }} />
        </span>
        <span className="rail-progress-count">{current.index + 1}</span>
      </div>
      {tip}
    </aside>
  );
}

/** Sticky left column: family hex map, area list and "reading now" card, synced to scroll. */
export default function MapColumn({ current, playing, onOpenSearch, collapsed, onToggle }) {
  const family = current.family;
  const dark = family.theme === 'dark';

  if (collapsed) return <MapRail current={current} onOpenSearch={onOpenSearch} onToggle={onToggle} />;

  return (
    <aside className={`map-column globe-scene${dark ? ' dark' : ''}`} aria-label="Connected service map">
      <Globe playing={playing} sidebar light={!dark} />
      <div className="map-heading">
        <span>YOUR SERVICE MAP</span>
        <button
          type="button"
          className="map-collapse"
          aria-label="Collapse service map"
          aria-expanded="true"
          title="Collapse to icons"
          onClick={onToggle}
        >
          <PanelLeftClose aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        className="catalogue-search-launch"
        aria-haspopup="dialog"
        aria-controls="catalogue-navigation"
        onClick={onOpenSearch}
      >
        <Icon name="Search" />
        Search all {offerings.length} offerings <span aria-hidden="true">&#8599;</span>
      </button>

      <div className="map-label">Service families</div>
      <nav
        className="hex-map family-map"
        aria-label="Jump to a service family"
        style={{
          width: HEX_WIDTH * 2.5,
          height: Math.ceil(families.length / COLS) * HEX_HEIGHT + HEX_HEIGHT / 2,
        }}
      >
        {families.map((f, i) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className="map-cell"
            aria-label={f.name}
            title={f.name}
            aria-current={String(f.id === family.id)}
            style={hexStyle(i)}
          >
            <Icon name={f.icon} className="" />
            <span>{f.short}</span>
          </a>
        ))}
      </nav>

      <div className="map-label">Service areas</div>
      <h3 className="area-family-title">{family.name}</h3>
      <nav className="hex-map area-map" aria-label="Jump to a service area">
        {family.areas.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="map-cell"
            aria-label={`${a.name}, ${a.offerings.length} offerings`}
            title={a.name}
            aria-current={String(a.id === current.area.id)}
          >
            <Icon name={a.icon} />
            <span>{a.name}</span>
            <span className="area-count" aria-hidden="true">
              {a.offerings.length}
            </span>
          </a>
        ))}
      </nav>

      <div className="current-offer">
        <div className="eyebrow">Reading now</div>
        <p>
          <Icon name={current.icon} />
          {current.name}
        </p>
        <span className="reading-count">
          {current.index + 1} of {offerings.length} offerings
        </span>
      </div>
    </aside>
  );
}
