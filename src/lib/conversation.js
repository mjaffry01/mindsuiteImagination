import logo from '../assets/logo.png';
import { offeringById } from '../data/catalogue.js';
import { contact as company } from '../data/company.js';
import { offeringSlug } from '../hooks/useRoute.js';

/**
 * The MindSuite Guide conversation, outside the chat panel:
 *   - a branded web page the visitor can download and keep (links go to the public website);
 *   - an email to the MindSuite team when the visitor finishes (sent by the server).
 */

/** The public website: links in downloads and emails point here, not to the visitor's copy. */
export const PUBLIC_SITE = (import.meta.env.VITE_SITE_URL || 'https://mjaffry01.github.io/mindsuiteImagination').replace(/\/$/, '');
export const publicOfferingUrl = (offering) => `${PUBLIC_SITE}/offerings/${offeringSlug(offering)}`;

// Where the conversation email is sent from: next to the guide's own server address.
const ASSISTANT_URL = import.meta.env.VITE_ASSISTANT_URL || '';
export const CONVERSATION_URL = ASSISTANT_URL ? ASSISTANT_URL.replace(/assistant\/?$/, 'conversation') : '';
// Where "send me the details of …" emails are sent from (the guide's own server).
export const OFFERING_EMAIL_URL = ASSISTANT_URL ? ASSISTANT_URL.replace(/assistant\/?$/, 'offering-email') : '';

const THINKING = 'Finding relevant offerings...';

/** The conversation as plain data, in the language the visitor saw it. */
export function conversationData(messages, t) {
  return messages
    .filter((m) => m.text !== THINKING)
    .map((m) => ({
      who: m.who === 'visitor' ? 'visitor' : 'guide',
      text: m.who === 'visitor' ? m.text : t(m.text, m.vars),
      notice: m.notice ? t(m.notice) : '',
      suggestions: (m.suggestions || [])
        .map((s) => offeringById.get(s.id))
        .filter(Boolean)
        .map((o, i) => ({
          id: o.id,
          name: o.name,
          reason: m.suggestions[i].reason || o.definition,
          url: publicOfferingUrl(o),
        })),
    }));
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

async function logoDataUrl() {
  try {
    const blob = await (await fetch(logo)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/** A self-contained web page of the conversation, styled like the MindSuite website. */
export async function conversationPage(messages, { t, lang, visitor }) {
  const items = conversationData(messages, t);
  const rtl = lang === 'ar';
  const when = new Date().toLocaleString({ ar: 'ar', fr: 'fr-FR' }[lang] || 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const src = await logoDataUrl();
  const tel = company.phone.replace(/[^\d+]/g, '');
  const offeringCount = new Set(items.flatMap((m) => m.suggestions.map((s) => s.id))).size;

  const bubble = (m) => `
      <article class="msg ${m.who}">
        <div class="who">${esc(m.who === 'visitor' ? (visitor?.name || t('You')) : t('MindSuite guide'))}</div>
        <p>${esc(m.text)}</p>
        ${m.notice ? `<p class="notice">${esc(m.notice)}</p>` : ''}
        ${m.suggestions
          .map(
            (s) => `
        <a class="offering" href="${esc(s.url)}" target="_blank" rel="noopener">
          <strong>${esc(s.name)}</strong>
          <span>${esc(s.reason)}</span>
          <em>${esc(t('View this offering on MindSuite'))} →</em>
        </a>`
          )
          .join('')}
      </article>`;

  return `<!doctype html>
<html lang="${esc(lang)}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t('Conversation with the MindSuite guide'))}</title>
<style>
  :root { --ink: #27234c; --muted: #6a648a; --purple: #5650a2; --violet: #785da8; --navy: #1d193e; --cyan: #54c9eb; --line: #dfdcee; --paper: #f6f8fc; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.6 'Aller', 'Segoe UI', Arial, Helvetica, sans-serif; }
  a { color: var(--purple); }
  header { background: var(--navy); background-image: radial-gradient(circle at 85% 0, #3b2f7a 0, transparent 55%); color: #f5f4fc; padding: 28px 20px 30px; }
  .wrap { max-width: 760px; margin: 0 auto; }
  .brand { display: inline-block; }
  .brand img { display: block; height: 40px; width: auto; }
  .brand b { font-size: 26px; color: #fff; }
  .eyebrow { margin: 22px 0 4px; color: var(--cyan); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 0; font-size: 28px; line-height: 1.25; }
  .meta { margin: 10px 0 0; color: #c9c5e6; font-size: 13px; }
  .meta span + span::before { content: ' · '; }
  main { padding: 26px 20px 10px; }
  .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 22px; }
  .chip { background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 6px 14px; font-size: 13px; color: var(--muted); }
  .chip b { color: var(--ink); }
  .msg { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin: 0 0 14px; }
  .msg.visitor { background: #e6e0f4; border-color: #dbd3ef; margin-inline-start: 48px; }
  .msg.guide { margin-inline-end: 24px; }
  .who { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--violet); margin-bottom: 4px; }
  .msg p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .msg .notice { margin-top: 8px; font-size: 13px; color: #796133; }
  .offering { display: block; margin-top: 12px; padding: 12px 14px; border: 1px solid #d6cfee; border-inline-start: 4px solid var(--purple); border-radius: 10px; background: #faf9fe; text-decoration: none; color: var(--ink); }
  .offering:hover { border-color: var(--purple); }
  .offering strong { display: block; color: #423e7e; font-size: 15px; }
  .offering span { display: block; margin-top: 4px; color: #5c567b; font-size: 13px; }
  .offering em { display: block; margin-top: 6px; color: var(--purple); font-style: normal; font-size: 13px; font-weight: 700; }
  footer { margin-top: 26px; background: var(--navy); color: #c9c5e6; padding: 24px 20px; font-size: 14px; }
  footer strong { color: #fff; }
  footer a { color: var(--cyan); text-decoration: none; }
  footer .links { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 10px; }
  footer .tag { margin-top: 14px; font-size: 12px; color: #9a95c2; }
  @media print { header, footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .offering { break-inside: avoid; } }
</style>
</head>
<body>
  <header>
    <div class="wrap">
      <a class="brand" href="${esc(PUBLIC_SITE)}/" target="_blank" rel="noopener">${src ? `<img src="${src}" alt="MindSuite">` : '<b>MindSuite</b>'}</a>
      <p class="eyebrow">${esc(t('MindSuite guide'))}</p>
      <h1>${esc(t('Conversation with the MindSuite guide'))}</h1>
      <p class="meta"><span>${esc(when)}</span>${visitor?.name ? `<span>${esc(visitor.name)}</span>` : ''}</p>
    </div>
  </header>
  <main class="wrap">
    <div class="summary">
      <span class="chip"><b>${items.filter((m) => m.who === 'visitor').length}</b> ${esc(t('questions'))}</span>
      <span class="chip"><b>${offeringCount}</b> ${esc(t('offerings suggested'))}</span>
    </div>
${items.map(bubble).join('')}
  </main>
  <footer>
    <div class="wrap">
      <strong>${esc(t('Talk to the MindSuite team'))}</strong>
      <div class="links">
        <a href="mailto:${esc(company.email)}" dir="ltr">${esc(company.email)}</a>
        <a href="tel:${esc(tel)}" dir="ltr">${esc(company.phone)}</a>
        <a href="${esc(PUBLIC_SITE)}/" target="_blank" rel="noopener">${esc(t('Visit the website'))}</a>
        <a href="${esc(company.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
      </div>
      <p class="tag">© ${new Date().getFullYear()} MindSuite. ${esc(t('Connected capabilities. Clear outcomes.'))}</p>
    </div>
  </footer>
</body>
</html>
`;
}

/** Saves the conversation page to the visitor's device. */
export async function downloadConversation(messages, options) {
  const html = await conversationPage(messages, options);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  link.download = `mindsuite-conversation-${stamp}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Sends the conversation to the MindSuite team (the server emails it). `keepalive` lets it
 * finish while the visitor is leaving the page. Returns true when the server accepted it.
 */
export async function sendConversation({ visitor, messages, t, lang, reason }) {
  if (!CONVERSATION_URL || !visitor) return false;
  const body = JSON.stringify({
    visitor,
    lang,
    reason,
    source: location.href,
    messages: conversationData(messages, t).slice(-80),
  });
  try {
    const response = await fetch(CONVERSATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: body.length < 60000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Asks the server to email offering details to the visitor (used when the guide runs without
 * AI; the AI guide does this itself). Returns { ok, to } or { ok: false, code }.
 */
export async function sendOfferingEmail({ visitor, offeringIds }) {
  if (!OFFERING_EMAIL_URL) return { ok: false, code: 'unavailable' };
  try {
    const response = await fetch(OFFERING_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor: { name: visitor?.name, email: visitor?.email }, offeringIds }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, to: result.to } : { ok: false, code: result.code || 'send_failed' };
  } catch {
    return { ok: false, code: 'send_failed' };
  }
}
