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

/** Sticky left column: family hex map, area list and "reading now" card, synced to scroll. */
export default function MapColumn({ current, playing, onOpenSearch }) {
  const family = current.family;
  const dark = family.theme === 'dark';

  return (
    <aside className={`map-column globe-scene${dark ? ' dark' : ''}`} aria-label="Connected service map">
      <Globe playing={playing} sidebar light={!dark} />
      <div className="map-heading">
        <span>YOUR SERVICE MAP</span>
        <a href="#top">Back to top ↑</a>
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
