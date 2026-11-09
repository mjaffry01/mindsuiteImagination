/** First frame of the animated hero globe (components/Globe.jsx) as lightweight inline SVG. */
export function globeSvg(className, { color = '#8db7e9', opacity = 0.25 } = {}) {
  const rad = Math.PI / 180;
  const point = (lat, lon) => {
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    return `${(100 * x).toFixed(1)} ${(100 * (y * 0.985 - z * 0.17)).toFixed(1)}`;
  };
  const paths = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const points = [];
    for (let lon = 0; lon <= 360; lon += 10) points.push(point(lat * rad, lon * rad));
    paths.push(`M${points.join(' ')}`);
  }
  for (let lon = 0; lon < 360; lon += 20) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 8) points.push(point(lat * rad, lon * rad));
    paths.push(`M${points.join(' ')}`);
  }
  return `<svg class="${className}" viewBox="-100 -100 200 200" aria-hidden="true"><path d="${paths.join('')}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width=".7" vector-effect="non-scaling-stroke"/></svg>`;
}
