import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Globe from './Globe.jsx';
import HexFamilyMap from './HexFamilyMap.jsx';
import ScrollMotionSwitch from './ScrollMotionSwitch.jsx';
import Icon from './Icon.jsx';
import { families, offerings } from '../data/catalogue.js';
import { useT } from '../i18n/index.jsx';

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
  const t = useT();
  const progress = ((current.index + 1) / offerings.length) * 100;

  return (
    <aside className={`map-column map-rail${family.theme === 'dark' ? ' dark' : ''}`} aria-label={t('Connected service map (collapsed)')}>
      <button type="button" className="rail-btn rail-toggle" aria-label={t('Expand service map')} aria-expanded="false" onClick={onToggle} {...tipFor(t('Expand service map'))}>
        <PanelLeftOpen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="rail-btn"
        aria-label={t('Search all {count} offerings', { count: offerings.length })}
        aria-haspopup="dialog"
        aria-controls="catalogue-navigation"
        onClick={onOpenSearch}
        {...tipFor(t('Search all {count} offerings', { count: offerings.length }))}
      >
        <Icon name="Search" />
      </button>

      <span className="rail-divider" aria-hidden="true" />
      <nav className="rail-group" aria-label={t('Jump to a service family')}>
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
      <nav className="rail-group" aria-label={t('{name} service areas', { name: family.name })}>
        {family.areas.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="rail-btn rail-area"
            aria-label={t('{name}, {count} offerings', { name: a.name, count: a.offerings.length })}
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
        aria-label={t('Reading {name}, {n} of {total} offerings', { name: current.name, n: current.index + 1, total: offerings.length })}
        tabIndex={0}
        {...tipFor(t('Reading now: {name} ({n} of {total})', { name: current.name, n: current.index + 1, total: offerings.length }))}
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
  const t = useT();

  if (collapsed) return <MapRail current={current} onOpenSearch={onOpenSearch} onToggle={onToggle} />;

  return (
    <aside className={`map-column globe-scene${dark ? ' dark' : ''}`} aria-label={t('Connected service map')}>
      <Globe playing={playing} sidebar light={!dark} />
      <div className="map-heading">
        <span>{t('YOUR SERVICE MAP')}</span>
        <button
          type="button"
          className="map-collapse"
          aria-label={t('Collapse service map')}
          aria-expanded="true"
          title={t('Collapse to icons')}
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
        {t('Search all {count} offerings', { count: offerings.length })} <span aria-hidden="true">&#8599;</span>
      </button>

      <ScrollMotionSwitch />
      <HexFamilyMap currentId={family.id} />

      <div className="map-label">{t('Service areas')}</div>
      <h3 className="area-family-title">{family.name}</h3>
      <nav className="hex-map area-map" aria-label={t('Jump to a service area')}>
        {family.areas.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="map-cell"
            aria-label={t('{name}, {count} offerings', { name: a.name, count: a.offerings.length })}
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
        <div className="eyebrow">{t('Reading now')}</div>
        <p>
          <Icon name={current.icon} />
          {current.name}
        </p>
        <span className="reading-count">
          {t('{n} of {total} offerings', { n: current.index + 1, total: offerings.length })}
        </span>
      </div>
    </aside>
  );
}
