/**
 * Search engine optimisation, done at build time.
 *
 * For every readable address (home, /offerings, /platforms, /clients, /team, /careers, the nine
 * family pages and all 231 offering pages) this writes an HTML page with:
 *   - its own <title>, meta description and canonical URL
 *   - Open Graph / Twitter tags for link previews
 *   - JSON-LD structured data (Organization, WebSite, Service, ItemList, BreadcrumbList)
 *   - the page's main text inside #root, readable without JavaScript (React replaces it on load)
 * plus sitemap.xml and robots.txt.
 *
 * The public address comes from SITE_URL (default: the GitHub Pages site). Set it when the site
 * moves, e.g. SITE_URL=https://www.mindsuite.in npm run build
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SITE = 'https://mjaffry01.github.io/mindsuiteImagination';

// Same rule as slugify() in src/hooks/useRoute.js: "Software & Product" → "software-product".
export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, max = 158) => {
  const text = String(s).replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/[\s,;:.-]+\S*$/, '')}…`;
};
const items = (text) => String(text).split(';').map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
const json = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

async function loadData(root) {
  const load = (p) => import(pathToFileURL(join(root, p)).href);
  const [company, team, careers] = await Promise.all([
    load('src/data/company.js'),
    load('src/data/team.js'),
    load('src/data/careers.js'),
  ]);
  const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue.json'), 'utf8'));
  return { company, team, careers, catalogue };
}

/** Builds the list of pages: { path, title, description, h1, body (HTML), jsonld[] }. */
function buildPages({ company, team, careers, catalogue }, site) {
  const url = (path) => `${site}/${path ? `${path}/` : ''}`;
  const total = catalogue.reduce((n, f) => n + f.areas.reduce((m, a) => m + a.offerings.length, 0), 0);
  const { contact } = company;
  const org = {
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    name: 'MindSuite',
    legalName: 'MindSuite Informatics Private Limited',
    url: url(''),
    logo: `${site}/og-image.png`,
    email: contact.email,
    telephone: contact.phone.replace(/\s+/g, ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address[0],
      addressLocality: 'Hyderabad',
      postalCode: '500096',
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
    sameAs: [contact.linkedin],
  };
  const crumbs = (trail) => ({
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url(path) })),
  });
  const link = (path, text) => `<a href="${esc(url(path))}">${esc(text)}</a>`;
  const familyLinks = `<ul>${catalogue.map((f) => `<li>${link(slugify(f.short), f.name)} — ${esc(f.tagline || '')}</li>`).join('')}</ul>`;

  const pages = [];

  pages.push({
    path: '',
    title: 'MindSuite — Software, cloud, AI, cybersecurity and ERP services',
    description: `Explore ${total} MindSuite offerings across software engineering, DevOps, AI, cybersecurity, ERP, IT staffing, managed services and business transformation, each with scope, deliverables and business value.`,
    h1: 'Architect Intelligence. Integrate Securely. Transform Business.',
    body: `<p>Explore MindSuite’s connected capabilities - from software and AI to cybersecurity, platform engineering, ERP and business systems, IT staffing, managed services, support and business transformation. Scroll to discover each offering, what it includes and the outcomes it delivers.</p><h2>Service families</h2>${familyLinks}<p>${link('platforms', 'Platforms')} · ${link('clients', 'Clients')} · ${link('about', 'About us')} · ${link('team', 'Team')} · ${link('careers', 'Careers')}</p>`,
    jsonld: [org, { '@type': 'WebSite', '@id': `${site}/#website`, name: 'MindSuite', url: url(''), publisher: { '@id': org['@id'] } }],
  });

  pages.push({
    path: 'offerings',
    title: `All ${total} offerings | MindSuite`,
    description: `Browse all ${total} MindSuite offerings in ${catalogue.length} service families, with definitions, typical scope, deliverables and business value.`,
    h1: 'Our offerings',
    body: familyLinks,
    jsonld: [org, crumbs([['MindSuite', ''], ['Offerings', 'offerings']])],
  });

  for (const f of catalogue) {
    const slug = slugify(f.short);
    const offeringsOf = f.areas.flatMap((a) => a.offerings.map((o) => ({ ...o, area: a })));
    pages.push({
      path: slug,
      title: `${f.name} services | MindSuite`,
      description: clip(`${f.tagline} ${offeringsOf.length} offerings across ${f.areas.map((a) => a.name).join(', ')}.`),
      h1: f.name,
      body: `<p>${esc(f.tagline)}</p>${f.areas
        .map((a) => `<h2>${esc(a.name)}</h2><ul>${a.offerings.map((o) => `<li>${link(`offerings/${slugify(o.name)}`, o.name)} — ${esc(o.value)}</li>`).join('')}</ul>`)
        .join('')}`,
      jsonld: [
        org,
        crumbs([['MindSuite', ''], ['Offerings', 'offerings'], [f.name, slug]]),
        {
          '@type': 'ItemList',
          name: `${f.name} offerings`,
          itemListElement: offeringsOf.map((o, i) => ({ '@type': 'ListItem', position: i + 1, url: url(`offerings/${slugify(o.name)}`), name: o.name })),
        },
      ],
    });
    for (const o of offeringsOf) {
      const path = `offerings/${slugify(o.name)}`;
      pages.push({
        path,
        title: `${o.name} — ${f.short} | MindSuite`,
        description: clip(o.definition),
        h1: o.name,
        body: `<p><strong>${esc(o.value)}</strong></p><p>${esc(o.definition)}</p><h2>Typical scope</h2><ul>${items(o.scope)
          .map((s) => `<li>${esc(s)}</li>`)
          .join('')}</ul><h2>What you receive</h2><ul>${items(o.deliverables).map((s) => `<li>${esc(s)}</li>`).join('')}</ul><p>${link(slug, `${f.name}: ${o.area.name}`)}</p>`,
        jsonld: [
          org,
          crumbs([['MindSuite', ''], [f.name, slug], [o.name, path]]),
          {
            '@type': 'Service',
            name: o.name,
            description: o.definition,
            serviceType: o.area.name,
            category: f.name,
            url: url(path),
            provider: { '@id': org['@id'] },
            areaServed: ['IN', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'GB', 'US'],
          },
        ],
      });
    }
  }

  const { ecosystem, clients } = company;
  pages.push({
    path: 'platforms',
    title: 'Technology platforms: NetSuite, Odoo, ERPNext, Salesforce | MindSuite',
    description: clip(ecosystem.lead),
    h1: ecosystem.title.join(' '),
    body: `<p>${esc(ecosystem.lead)}</p><ul>${ecosystem.platforms.map((p) => `<li>${esc(p.name)} — ${esc(p.caption)}</li>`).join('')}</ul>`,
    jsonld: [org, crumbs([['MindSuite', ''], ['Platforms', 'platforms']])],
  });
  pages.push({
    path: 'clients',
    title: 'Clients | MindSuite',
    description: clip(`${clients.lead} Businesses MindSuite works with include ${clients.list.map((c) => c.name).join(', ')}.`),
    h1: clients.title,
    body: `<p>${esc(clients.lead)}</p><ul>${clients.list.map((c) => `<li>${c.url ? `<a href="${esc(c.url)}" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}</li>`).join('')}</ul>`,
    jsonld: [org, crumbs([['MindSuite', ''], ['Clients', 'clients']])],
  });
  const { about } = company;
  pages.push({
    path: 'about',
    title: 'About MindSuite Informatics | MindSuite',
    description: clip(about.lead),
    h1: about.title,
    body: `<p>${esc(about.lead)}</p><h2>Our mission</h2><ul>${about.mission
      .map((m) => `<li><strong>${esc(m.title)}</strong> ${esc(m.text)}</li>`)
      .join('')}</ul><h2>How we work</h2><ul>${about.principles
      .map((p) => `<li><strong>${esc(p.title)}</strong> — ${esc(p.text)}</li>`)
      .join('')}</ul><p>${esc(about.journey.join(' → '))}</p><p>${link('team', 'Meet the team')} · ${link('offerings', 'Explore our offerings')}</p>`,
    jsonld: [
      { '@type': 'AboutPage', name: 'About MindSuite', url: url('about'), about: { '@id': org['@id'] } },
      { ...org, description: about.lead, areaServed: ['Middle East', 'Gulf', 'Western markets'] },
      crumbs([['MindSuite', ''], ['About us', 'about']]),
    ],
  });
  pages.push({
    path: 'team',
    title: 'Leadership and team | MindSuite',
    description: clip(team.intro.lead),
    h1: team.intro.title,
    body: `<p>${esc(team.intro.lead)}</p><h2>Leadership</h2><ul>${team.leaders.map((l) => `<li>${esc(l.name)} — ${esc(l.role)}</li>`).join('')}</ul>`,
    jsonld: [
      { ...org, employee: team.leaders.map((l) => ({ '@type': 'Person', name: l.name, jobTitle: l.role, sameAs: l.linkedin ? [l.linkedin] : undefined })) },
      crumbs([['MindSuite', ''], ['Team', 'team']]),
    ],
  });
  pages.push({
    path: 'careers',
    title: 'Careers at MindSuite',
    description: clip(careers.hero.lead),
    h1: careers.hero.title.join(' '),
    body: `<p>${esc(careers.hero.lead)}</p><h2>Why MindSuite</h2><ul>${careers.perks.map((p) => `<li><strong>${esc(p.title)}</strong> — ${esc(p.text)}</li>`).join('')}</ul>`,
    jsonld: [org, crumbs([['MindSuite', ''], ['Careers', 'careers']])],
  });

  return pages.map((p) => ({ ...p, url: url(p.path) }));
}

function head(page, site) {
  const graph = { '@context': 'https://schema.org', '@graph': page.jsonld };
  return `<title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${esc(page.url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="MindSuite" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${esc(page.url)}" />
    <meta property="og:image" content="${esc(site)}/og-image.png" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:locale:alternate" content="ar_SA" />
    <meta property="og:locale:alternate" content="fr_FR" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <script type="application/ld+json">${json(graph)}</script>`;
}

// Shown for a moment before the app starts, and to anything that reads the page without JavaScript.
const PRERENDER_STYLE =
  '<style>'
  + '.seo-prerender{position:relative;box-sizing:border-box;min-height:100svh;padding:max(110px,calc(50svh - 240px)) max(25px,6vw) 60px;background:#283152;color:#d3d8e8;font:16px/1.75 Arial,Helvetica,sans-serif}'
  + '.seo-prerender:before{content:"";position:absolute;inset:0 0 auto;height:70px;background:#222a45;border-bottom:1px solid #39436a}'
  + '.seo-prerender h1{max-width:620px;margin:0;color:#f1f2f8;font-size:clamp(32px,4.5vw,61px);font-weight:600;line-height:1.1;letter-spacing:-1.5px}'
  + '.seo-prerender p{max-width:620px;margin:25px 0 0}'
  + '.seo-prerender a{color:#b9a7ef}'
  + '.seo-prerender{overflow-x:clip}.seo-prerender h1,.seo-prerender p{position:relative}'
  + '.seo-logo{position:absolute;top:14px;left:5%;width:190px;height:auto}'
  + '.seo-globe{position:absolute;top:calc(48svh + 5px);left:76%;width:calc(2*min(32vw,300px));overflow:visible;transform:translate(-50%,-50%);pointer-events:none;-webkit-mask-image:linear-gradient(90deg,#0007,#000 90%);mask-image:linear-gradient(90deg,#0007,#000 90%)}'
  // Only the heading and first paragraph share the first screen, like the real hero.
  + '.seo-prerender>h1+p+*{margin-top:100svh}'
  + '@media(max-width:900px){.seo-prerender{padding-inline:25px}.seo-prerender p{font-size:15px}.seo-logo{top:19px;left:18px;width:150px}.seo-globe{top:calc(48svh - 45px)}}'
  + '@media(max-width:600px){.seo-prerender{padding-top:140px}.seo-prerender h1{font-size:clamp(30px,7.5vw,42px)}.seo-logo{top:24px;width:104px}.seo-globe{top:calc(48svh + 27px)}}'
  + '</style>';

// The home heading uses the same three colours as the real hero, so the switch is seamless.
const heroHeading = (html) =>
  html
    .replace('Intelligence.', '<span style="color:#c6b9f2">Intelligence.</span>')
    .replace('Securely.', '<span style="color:#8ad3e3">Securely.</span>')
    .replace('Business.', '<span style="color:#e3b2cf">Business.</span>');

/** First frame of the animated hero globe (components/Globe.jsx) as lightweight inline SVG. */
function globeSvg() {
  const rad = Math.PI / 180;
  const point = (lat, lon) => {
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    return `${(100 * x).toFixed(1)} ${(100 * (y * 0.985 - z * 0.17)).toFixed(1)}`;
  };
  const line = (points) => `M${points.join(' ')}`;
  const paths = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const points = [];
    for (let lon = 0; lon <= 360; lon += 10) points.push(point(lat * rad, lon * rad));
    paths.push(line(points));
  }
  for (let lon = 0; lon < 360; lon += 20) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 8) points.push(point(lat * rad, lon * rad));
    paths.push(line(points));
  }
  return `<svg class="seo-globe" viewBox="-100 -100 200 200" aria-hidden="true"><path d="${paths.join('')}" fill="none" stroke="#8db7e9" stroke-opacity=".25" stroke-width=".7" vector-effect="non-scaling-stroke"/></svg>`;
}

/** Writes every page, sitemap.xml and robots.txt into `outDir`. */
export async function writeSeoPages({ root, outDir, site = process.env.SITE_URL || DEFAULT_SITE }) {
  site = site.replace(/\/+$/, '');
  const template = readFileSync(join(outDir, 'index.html'), 'utf8');
  if (!template.includes('<!-- seo:start') || !template.includes('<!-- seo:content -->')) {
    throw new Error('index.html is missing the seo:start / seo:end / seo:content markers');
  }
  const pages = buildPages(await loadData(root), site);
  // The logo is requested straight away instead of waiting for the app to start.
  const base = template.match(/src="([^"]*?)assets\/index-/)?.[1] ?? '/';
  const logoFile = readdirSync(join(outDir, 'assets')).find((f) => /^logo-.*\.png$/.test(f));
  if (!logoFile) throw new Error('Built logo not found in assets');
  const logoUrl = `${base}assets/${logoFile}`;
  const logo = `<img class="seo-logo" src="${logoUrl}" alt="MindSuite" width="773" height="165" fetchpriority="high" />`;
  const globe = globeSvg();
  for (const page of pages) {
    const html = template
      .replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->/, `${head(page, site)}\n    <link rel="preload" as="image" href="${logoUrl}" fetchpriority="high" />`)
      .replace('<!-- seo:content -->', `${PRERENDER_STYLE}<main class="seo-prerender">${logo}${page.path ? '' : globe}<h1>${page.path ? esc(page.h1) : heroHeading(esc(page.h1))}</h1>${page.body}</main>`);
    const dir = page.path ? join(outDir, page.path) : outDir;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    if (!page.path) writeFileSync(join(outDir, '404.html'), html.replace('<link rel="canonical"', '<meta name="robots" content="noindex" />\n    <link rel="canonical"'));
  }
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(
    join(outDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map((p) => `  <url><loc>${esc(p.url)}</loc><lastmod>${today}</lastmod><priority>${p.path === '' ? '1.0' : p.path.startsWith('offerings/') ? '0.6' : '0.8'}</priority></url>`)
      .join('\n')}\n</urlset>\n`
  );
  writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
  return pages.length;
}
