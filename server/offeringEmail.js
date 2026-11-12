/**
 * "Send me the details of …": the email a visitor receives with the offerings they asked about.
 * Everything in it comes from the site's own catalogue; the only visitor text is their first name.
 */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const slug = (text) => text.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every offering with its full text, by id. */
export function offeringDetailsIndex(catalogue) {
  const index = new Map();
  for (const family of catalogue) {
    for (const area of family.areas) {
      for (const o of area.offerings) index.set(o.id, { ...o, family: family.name, area: area.name });
    }
  }
  return index;
}

/**
 * The email: one card per offering (what it is, scope, what you receive, value) with a link to
 * its page on the public website, then how to reach the team.
 */
export function offeringDetailsMail({ visitor, offerings, site, from, replyTo, contact }) {
  const first = String(visitor.name || '').split(/\s+/)[0].slice(0, 40);
  const url = (o) => `${site}/offerings/${slug(o.name)}`;
  const names = offerings.map((o) => o.name);
  const subject =
    offerings.length === 1 ? `MindSuite: ${names[0]}` : `MindSuite: details of ${offerings.length} offerings you asked about`;

  const section = (label, value) =>
    value
      ? `<p style="margin:10px 0 2px;font-size:11px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#785da8">${label}</p><p style="margin:0;color:#3a3560">${esc(value)}</p>`
      : '';
  const card = (o) => `
  <div style="margin:0 0 16px;padding:16px 18px;background:#ffffff;border:1px solid #dfdcee;border-left:4px solid #5650a2;border-radius:12px">
    <div style="font-size:12px;color:#726c90">${esc(o.family)} · ${esc(o.area)}</div>
    <div style="margin:2px 0 6px;font-size:18px;font-weight:bold;color:#27234c">${esc(o.name)}</div>
    ${section('What it is', o.definition)}${section('Scope', o.scope)}${section('What you receive', o.deliverables)}${section('Value', o.value)}
    <p style="margin:14px 0 0"><a href="${esc(url(o))}" style="display:inline-block;padding:9px 16px;background:#5650a2;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold">View on the MindSuite website →</a></p>
  </div>`;

  const html = `<div style="font-family:Aller,'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#27234c;max-width:680px;margin:0 auto">
  <div style="background:#1d193e;color:#f5f4fc;padding:22px 22px 20px;border-radius:12px 12px 0 0">
    <div style="font-size:24px;font-weight:bold;letter-spacing:.01em">MindSuite</div>
    <div style="margin-top:6px;color:#54c9eb;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">Offering details</div>
  </div>
  <div style="background:#f6f8fc;padding:20px 22px;border:1px solid #dfdcee;border-top:0;border-radius:0 0 12px 12px">
    <p style="margin:0 0 6px">Hello ${esc(first)},</p>
    <p style="margin:0 0 18px">As you asked the MindSuite guide, here ${offerings.length === 1 ? 'are the details of this offering' : 'are the details of these offerings'}.</p>
    ${offerings.map(card).join('')}
    <p style="margin:6px 0 4px;font-weight:bold">Talk to the MindSuite team</p>
    <p style="margin:0">Reply to this email, or contact us at <a href="mailto:${esc(contact.email)}" style="color:#5650a2">${esc(contact.email)}</a> · ${esc(contact.phone)}. We can scope any of these for you in a proposal.</p>
    <p style="margin:16px 0 0;font-size:12px;color:#726c90">You received this because you asked the guide on <a href="${esc(site)}/" style="color:#726c90">the MindSuite website</a> to send it. We don't add you to any mailing list.</p>
  </div></div>`;

  const text = [
    `Hello ${first},`,
    '',
    'As you asked the MindSuite guide, here are the details:',
    '',
    ...offerings.flatMap((o) => [
      `${o.name} (${o.family} · ${o.area})`,
      `What it is: ${o.definition}`,
      `Scope: ${o.scope}`,
      `What you receive: ${o.deliverables}`,
      `Value: ${o.value}`,
      `More: ${url(o)}`,
      '',
    ]),
    `Talk to the MindSuite team: reply to this email, or ${contact.email} · ${contact.phone}.`,
    '',
    "You received this because you asked the guide on the MindSuite website to send it. We don't add you to any mailing list.",
  ].join('\n');

  return { from, to: visitor.email, replyTo, subject, text, html };
}
