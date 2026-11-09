import { about, clients, contact } from '../data/company.js';
import { globeSvg } from './globeSvg.js';

/** "Assess risks; review code." → ["Assess risks", "Review code"], as the catalogue shows them. */
export const toItems = (text) =>
  text
    .split(';')
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export const contactLine = () => `${contact.email}  ·  ${contact.phone}  ·  www.mindsuite.in`;
export const preparedDate = (lang) =>
  new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'long', year: 'numeric' });

/** One accent per service family, so each section of the brochure has its own colour. */
export const FAMILY_TONES = [
  ['7461AD', 'EFEBF8'],
  ['3F8D9A', 'E8F4F5'],
  ['8569B8', 'F4F0FA'],
  ['B06A91', 'F9EDF3'],
  ['4D8A6C', 'EAF5EE'],
  ['5476B8', 'EBF0FA'],
  ['8A6A3E', 'F7F1E6'],
  ['2F7F96', 'E6F3F6'],
  ['A0703F', 'F8F0E6'],
];
export const toneFor = (offering) => FAMILY_TONES[offering.family.index ?? 0] || FAMILY_TONES[0];
export const familyIndex = (family, all) => (family.index ?? all.indexOf(family));

export const TAGLINE = [
  ['Architect', 'Intelligence.', 'C6B9F2'],
  ['Integrate', 'Securely.', '8AD3E3'],
  ['Transform', 'Business.', 'E3B2CF'],
];
export const CONTENTS_PER_PAGE = 20;
export const companyFacts = { about, clients, contact };

const STYLE = `
.print-doc{display:none}
@page{size:A4;margin:0}
@media print{
  html,body{background:#fff!important;height:auto!important;overflow:visible!important;padding:0!important;margin:0!important}
  body>*:not(.print-doc){display:none!important}
  .print-doc{display:block;color:#333c55;font:10.5pt/1.5 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pd-sheet{position:relative;box-sizing:border-box;width:210mm;height:296.6mm;overflow:hidden;break-after:page;display:flex;flex-direction:column}
  .pd-sheet:last-child{break-after:auto}
  .pd-dark{background:#222a45;color:#e6e9f3;padding:18mm 16mm}
  .pd-dark img{display:block;width:62mm;height:auto;position:relative}
  .pd-globe{position:absolute;top:44mm;inset-inline-end:-46mm;width:190mm}
  .pd-eyebrow{margin:50mm 0 6mm;position:relative;color:#c9bdf0;font-size:10pt;font-weight:700;letter-spacing:2.2pt;text-transform:uppercase}
  .pd-tagline{position:relative;margin:0;color:#f1f2f8;font-size:40pt;font-weight:700;line-height:1.12;letter-spacing:-.8pt}
  .pd-tagline span{display:block}
  .pd-tagline b{font-weight:700}
  .pd-cover-foot{margin-top:auto;position:relative;padding-top:6mm;border-top:.4mm solid #ffffff40}
  .pd-cover-foot strong{display:block;color:#fff;font-size:18pt;line-height:1.25}
  .pd-cover-foot small{display:block;margin-top:2mm;color:#c3c9db;font-size:10.5pt}
  .pd-page{padding:0 0 11mm}
  .pd-band{display:flex;align-items:center;justify-content:space-between;gap:8mm;padding:6mm 14mm;background:#222a45;color:#c9d0e4;font-size:9pt}
  .pd-band img{display:block;width:36mm;height:auto}
  .pd-accent{height:1.6mm}
  .pd-body{flex:1;padding:9mm 14mm 0;min-height:0}
  .pd-foot{display:flex;justify-content:space-between;gap:8mm;margin:auto 14mm 0;padding-top:3mm;border-top:.3mm solid #e4e1ee;color:#6c7790;font-size:8.5pt}
  .pd-kicker{margin:0 0 2mm;font-size:9.5pt;font-weight:700;letter-spacing:1.3pt;text-transform:uppercase}
  .pd-title{margin:0 0 5mm;color:#222a45;font-size:27pt;font-weight:700;line-height:1.14;letter-spacing:-.5pt}
  .pd-lead{margin:0 0 7mm;font-size:12pt;line-height:1.6}
  .pd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3mm;margin:0 0 8mm}
  .pd-stats div{padding:4mm;border-radius:2.5mm;background:#efebf8}
  .pd-stats strong{display:block;color:#4f4185;font-size:22pt;line-height:1.1}
  .pd-stats span{font-size:9pt}
  .pd-h{margin:0 0 3mm;color:#222a45;font-size:13pt}
  .pd-principles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4mm;margin:0 0 7mm}
  .pd-principles strong{display:block;color:#4f4185;font-size:10.5pt}
  .pd-principles span{font-size:9.5pt;line-height:1.45}
  .pd-mission{display:flex;flex-wrap:wrap;gap:1mm 6mm;margin:0 0 7mm;font-weight:700;color:#4f4185}
  .pd-chips{display:flex;flex-wrap:wrap;gap:2mm;margin:0;padding:0;list-style:none}
  .pd-chips li{padding:1.2mm 3.5mm;border:.3mm solid #d9d3e8;border-radius:5mm;font-size:9.5pt}
  .pd-contents{margin:0;padding:0;list-style:none}
  .pd-contents li{display:flex;align-items:baseline;gap:3mm;padding:2.1mm 0;border-bottom:.25mm solid #eceaf3}
  .pd-contents b{font-weight:700;color:#222a45}
  .pd-contents small{color:#6c7790;font-size:8.5pt}
  .pd-contents i{margin-inline-start:auto;font-style:normal;color:#4f4185;font-weight:700}
  .pd-value{margin:0 0 6mm;padding:4.5mm 5.5mm;border-radius:2.5mm;font-size:12pt;line-height:1.45}
  .pd-value strong{display:block;margin-bottom:1mm;font-size:8.5pt;letter-spacing:1pt;text-transform:uppercase}
  .pd-def{margin:0 0 7mm;font-size:11pt;line-height:1.6}
  .pd-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5mm}
  .pd-col{padding:5mm;border-radius:2.5mm;background:#f6f5fa}
  .pd-col h3{margin:0 0 2.5mm;color:#222a45;font-size:11pt}
  .pd-col p{margin:0;font-size:10pt}
  .pd-col ul{margin:0;padding-inline-start:4.5mm;font-size:10pt}
  .pd-col li{margin:1mm 0}
  .pd-back-title{position:relative;margin:48mm 0 5mm;color:#fff;font-size:34pt;line-height:1.14;font-weight:700;letter-spacing:-.6pt}
  .pd-back p{position:relative;max-width:145mm;margin:0;color:#d3d8e8;font-size:12pt;line-height:1.6}
  .pd-cta{position:relative;align-self:flex-start;margin-top:9mm;padding:4mm 8mm;border-radius:6mm;background:#f3f2f9;color:#222a45;font-size:12pt;font-weight:700;text-decoration:none}
  .pd-contact{position:relative;display:grid;gap:4mm;margin:13mm 0 0}
  .pd-contact small{display:block;color:#a7b0c9;font-size:8.5pt;letter-spacing:1pt;text-transform:uppercase}
  .pd-contact span{color:#fff;font-size:12pt}
  .pd-fine{margin-top:auto!important;color:#a7b0c9!important;font-size:8.5pt!important;line-height:1.5!important}
}`;

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** The brochure as HTML: printed by the browser, which also saves it as a PDF. */
export function documentHtml(list, { t, lang, dir, logoUrl, stats, url }) {
  const contentsPages = list.length > 1 ? chunk(list, CONTENTS_PER_PAGE) : [];
  const firstOfferingPage = 3 + contentsPages.length;
  const total = firstOfferingPage + list.length;
  const title = list.length === 1 ? list[0].name : t('Selected offerings');
  const count = list.length === 1 ? list[0].family.name : t('{count} offerings selected', { count: list.length });

  const band = (right = '') =>
    `<div class="pd-band"><img src="${esc(logoUrl)}" alt="MindSuite" /><span>${esc(right)}</span></div>`;
  const foot = (n) => `<div class="pd-foot"><span>${esc(contactLine())}</span><span>${n} / ${total}</span></div>`;

  const cover = `<section class="pd-sheet pd-dark">
    ${globeSvg('pd-globe', { opacity: 0.4 })}
    <img src="${esc(logoUrl)}" alt="MindSuite" />
    <div class="pd-eyebrow">${esc(t('Build. Run. Protect. Transform.'))}</div>
    <h1 class="pd-tagline">${TAGLINE.map(([a, b, color]) => `<span>${esc(t(a))} <b style="color:#${color}">${esc(t(b))}</b></span>`).join('')}</h1>
    <div class="pd-cover-foot"><strong>${esc(title)}</strong><small>${esc(count)} · ${esc(t('Prepared on {date}', { date: preparedDate(lang) }))}</small></div>
  </section>`;

  const aboutPage = `<section class="pd-sheet pd-page">
    ${band(t('About MindSuite'))}<div class="pd-accent" style="background:#7461ad"></div>
    <div class="pd-body">
      <h2 class="pd-title">${esc(t(about.title))}</h2>
      <p class="pd-lead">${esc(t(about.lead))}</p>
      <div class="pd-stats">
        ${[
          [stats.offerings, t('defined offerings')],
          [stats.deliverables, t('named deliverables')],
          [stats.team, t('team members')],
          [clients.list.length, t('client businesses')],
        ]
          .map(([v, l]) => `<div><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`)
          .join('')}
      </div>
      <h3 class="pd-h">${esc(t('How we work'))}</h3>
      <div class="pd-principles">${about.principles
        .map((p) => `<div><strong>${esc(t(p.title))}</strong><span>${esc(t(p.text))}</span></div>`)
        .join('')}</div>
      <h3 class="pd-h">${esc(t('Our mission'))}</h3>
      <div class="pd-mission">${about.mission.map((m) => `<span>${esc(t(m.title))}</span>`).join('')}</div>
      <h3 class="pd-h">${esc(t(clients.title))}</h3>
      <ul class="pd-chips">${clients.list.map((c) => `<li>${esc(c.name)}</li>`).join('')}</ul>
    </div>
    ${foot(2)}
  </section>`;

  let index = 0;
  const contents = contentsPages
    .map((page, p) => {
      const rows = page
        .map((o) => {
          const n = firstOfferingPage + index;
          index += 1;
          return `<li><span><b>${esc(o.name)}</b> <small>${esc(o.family.name)}</small></span><i>${n}</i></li>`;
        })
        .join('');
      return `<section class="pd-sheet pd-page">
        ${band(t('Selected offerings'))}<div class="pd-accent" style="background:#7461ad"></div>
        <div class="pd-body">${p === 0 ? `<h2 class="pd-title">${esc(t('Selected offerings'))}</h2>` : ''}<ol class="pd-contents">${rows}</ol></div>
        ${foot(3 + p)}
      </section>`;
    })
    .join('');

  const items = (text) => {
    const parts = toItems(text);
    return parts.length < 2 ? `<p>${esc(text)}</p>` : `<ul>${parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  };
  const sheets = list
    .map((o, i) => {
      const [tone, tint] = toneFor(o);
      return `<article class="pd-sheet pd-page">
        ${band(o.family.name)}<div class="pd-accent" style="background:#${tone}"></div>
        <div class="pd-body">
          <p class="pd-kicker" style="color:#${tone}">${esc(o.area.name)}</p>
          <h2 class="pd-title">${esc(o.name)}</h2>
          <p class="pd-value" style="background:#${tint}"><strong style="color:#${tone}">${esc(t('Business value:'))}</strong>${esc(o.value)}</p>
          <p class="pd-def">${esc(o.definition)}</p>
          <div class="pd-cols">
            <div class="pd-col"><h3>${esc(t('Typical scope'))}</h3>${items(o.scope)}</div>
            <div class="pd-col"><h3>${esc(t('What you receive'))}</h3>${items(o.deliverables)}</div>
          </div>
        </div>
        ${foot(firstOfferingPage + i)}
      </article>`;
    })
    .join('');

  const back = `<section class="pd-sheet pd-dark pd-back">
    ${globeSvg('pd-globe', { opacity: 0.32 })}
    <img src="${esc(logoUrl)}" alt="MindSuite" />
    <h2 class="pd-back-title">${esc(t('Talk to a MindSuite expert'))}</h2>
    <p>${esc(t(about.lead))}</p>
    <a class="pd-cta" href="${esc(url)}">${esc(t('Request a proposal'))} →</a>
    <div class="pd-contact">
      <div><small>${esc(t('Email'))}</small><span>${esc(contact.email)}</span></div>
      <div><small>${esc(t('Phone'))}</small><span dir="ltr">${esc(contact.phone)}</span></div>
      <div><small>${esc(t('Office'))}</small><span>${esc(contact.address.join(', '))}</span></div>
    </div>
    <p class="pd-fine">${esc(t('Definitions and typical scope are guidance. Final deliverables, acceptance criteria and ownership are agreed in the proposal.'))}</p>
  </section>`;

  return `<style>${STYLE}</style><div lang="${esc(lang)}" dir="${esc(dir)}">${cover}${aboutPage}${contents}${sheets}${back}</div>`;
}

/** Opens the browser's print window, where "Save as PDF" produces the file. */
export async function printOfferings(list, options, fileName) {
  document.querySelector('.print-doc')?.remove();
  const node = document.createElement('div');
  node.className = 'print-doc';
  node.innerHTML = documentHtml(list, options);
  document.body.append(node);
  // The logo must be ready, or it would be missing from the printout.
  await node.querySelector('img').decode().catch(() => {});
  const previousTitle = document.title;
  document.title = fileName; // browsers suggest this as the PDF's name
  addEventListener(
    'afterprint',
    () => {
      document.title = previousTitle;
      node.remove();
    },
    { once: true }
  );
  window.print();
}
