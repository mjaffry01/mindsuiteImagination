/**
 * MindSuite proposal-request endpoint (and, in production, the static site).
 *
 *   POST /api/enquiry   JSON from the "Request a proposal" form → email to the team (+ acknowledgement)
 *   POST /api/conversation  a finished MindSuite Guide conversation → email to the team
 *   POST /api/offering-email  "send me the details of …" → email to the visitor (the AI guide
 *                             does this itself with a tool; this endpoint is for catalogue mode)
 *   GET  /api/health    { ok, mode: "smtp" | "preview" }
 *   anything else       files from ../dist (when built), with index.html as the fallback
 *
 * Configuration comes from environment variables (see .env.example). With no SMTP_HOST the
 * server runs in PREVIEW mode: nothing is sent, and each email is saved to server/outbox/*.eml
 * so you can open it and check the content.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { CONTACT_METHODS, TIMELINES, enquiryEmail, makeReference } from '../src/lib/enquiry.js';
import { assistantError, createAssistant } from './assistant.js';
import { checkPhone } from '../src/lib/phone.js';
import { offeringDetailsIndex, offeringDetailsMail } from './offeringEmail.js';
import { DEFAULT_PRICES, createUsageBudget } from './usageBudget.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = join(root, 'dist');
const outboxDir = join(here, 'outbox');

const env = process.env;
const config = {
  port: Number(env.PORT) || 8787,
  smtp: env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure: env.SMTP_SECURE === 'true', // true for port 465, false for 587 (STARTTLS)
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      }
    : null,
  // Microsoft 365 OAuth2 (app-only). When all three are set, they replace SMTP_PASS.
  oauth:
    env.SMTP_OAUTH_TENANT_ID && env.SMTP_OAUTH_CLIENT_ID && env.SMTP_OAUTH_CLIENT_SECRET
      ? {
          tenantId: env.SMTP_OAUTH_TENANT_ID,
          clientId: env.SMTP_OAUTH_CLIENT_ID,
          clientSecret: env.SMTP_OAUTH_CLIENT_SECRET,
          tokenUrl:
            env.SMTP_OAUTH_TOKEN_URL ||
            `https://login.microsoftonline.com/${encodeURIComponent(env.SMTP_OAUTH_TENANT_ID)}/oauth2/v2.0/token`,
        }
      : null,
  from: env.MAIL_FROM || 'MindSuite <no-reply@mindsuite.in>',
  // The team copy (every detail the visitor entered) goes to MAIL_TO; when the visitor replies
  // to their acknowledgement, the reply goes to MAIL_REPLY_TO.
  to: env.MAIL_TO || 'no-reply@mindsuite.in',
  replyTo: env.MAIL_REPLY_TO || 'info@mindsuite.in',
  cc: env.MAIL_CC || '',
  sendAck: env.SEND_ACK !== 'false',
  allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  rateLimit: { max: Number(env.RATE_LIMIT_MAX) || 5, windowMs: (Number(env.RATE_LIMIT_MINUTES) || 15) * 60_000 },
  assistantRateLimit: {
    max: Number(env.ASSISTANT_RATE_LIMIT_MAX) || 30,
    windowMs: (Number(env.ASSISTANT_RATE_LIMIT_MINUTES) || 15) * 60_000,
  },
  // Guide conversations: one email each time a visitor finishes (a visitor may finish a few times).
  conversationRateLimit: { max: 10, windowMs: 15 * 60_000 },
  // "Send me the details of …": offering emails to the visitor, per network address and per inbox.
  offeringEmailRateLimit: { max: 5, windowMs: 60 * 60_000 },
  offeringEmailPerInbox: { max: 3, windowMs: 24 * 60 * 60_000 },
  // The guide's monthly AI budget (estimated US dollars; 0 switches the alerts off). At 90% and
  // again at 100% an email goes to BUDGET_ALERT_TO.
  budget: {
    limit: env.ASSISTANT_MONTHLY_BUDGET_USD === undefined || env.ASSISTANT_MONTHLY_BUDGET_USD === '' ? 20 : Number(env.ASSISTANT_MONTHLY_BUDGET_USD) || 0,
    alertTo: env.BUDGET_ALERT_TO || 'info@mindsuite.in, privacy@mindsuite.in',
    prices: {
      input: Number(env.ASSISTANT_PRICE_INPUT) || DEFAULT_PRICES.input,
      output: Number(env.ASSISTANT_PRICE_OUTPUT) || DEFAULT_PRICES.output,
      cacheRead: Number(env.ASSISTANT_PRICE_CACHE_READ) || DEFAULT_PRICES.cacheRead,
      cacheWrite: Number(env.ASSISTANT_PRICE_CACHE_WRITE) || DEFAULT_PRICES.cacheWrite,
    },
  },
  // Public website: offering links in emails point here.
  site: (env.SITE_URL || 'https://mjaffry01.github.io/mindsuiteImagination').replace(/\/$/, ''),
};

// ---------------------------------------------------------------- catalogue lookup
// Offering names are taken from the site's own catalogue, never from the submitted text.
const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue.json'), 'utf8'));
const offeringIndex = new Map();
for (const family of catalogue) {
  for (const area of family.areas) {
    for (const o of area.offerings) offeringIndex.set(o.id, { id: o.id, name: o.name, family: family.name, area: area.name });
  }
}
const offeringDetails = offeringDetailsIndex(catalogue);

// ---------------------------------------------------------------- mail transport
const mode = config.smtp ? 'smtp' : 'preview';
const authMethod = !config.smtp ? 'none' : config.oauth ? 'oauth2' : 'password';

/**
 * App-only token from Microsoft Entra (client credentials). Cached until five minutes before
 * it expires, so a busy server asks Microsoft for a new token about once an hour.
 */
let cachedToken = null;
async function microsoftToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const { tenantId, clientId, clientSecret, tokenUrl } = config.oauth;
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://outlook.office365.com/.default',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // Microsoft's error text names the problem (wrong secret, wrong tenant, no admin consent...).
    const why = data.error_description?.split('\r\n')[0] || data.error || `HTTP ${res.status}`;
    throw new Error(`Microsoft sign-in for tenant ${tenantId} failed: ${why}`);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 300) * 1000 };
  return cachedToken.value;
}

const previewTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
const passwordTransport = config.smtp && !config.oauth ? nodemailer.createTransport(config.smtp) : null;
let oauthTransport = null;
let oauthTransportToken = null;

async function getTransport() {
  if (!config.smtp) return previewTransport;
  if (!config.oauth) return passwordTransport;
  const accessToken = await microsoftToken();
  if (accessToken !== oauthTransportToken) {
    oauthTransport?.close();
    oauthTransport = nodemailer.createTransport({
      ...config.smtp,
      auth: { type: 'OAuth2', user: env.SMTP_USER, accessToken },
    });
    oauthTransportToken = accessToken;
  }
  return oauthTransport;
}

async function deliver(message, label) {
  const transport = await getTransport();
  const info = await transport.sendMail(message);
  if (mode === 'preview') {
    mkdirSync(outboxDir, { recursive: true });
    const file = join(outboxDir, `${label}.eml`);
    writeFileSync(file, info.message);
    console.log(`[preview] saved ${file}`);
  }
  return info;
}

// ---------------------------------------------------------------- validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneLine = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

function validate(body) {
  const errors = [];
  const c = body?.contact || {};
  const contact = {
    name: oneLine(c.name, 120),
    email: oneLine(c.email, 254),
    company: oneLine(c.company, 160),
    phone: oneLine(c.phone, 40),
    preferredContact: CONTACT_METHODS.includes(c.preferredContact) ? c.preferredContact : CONTACT_METHODS[0],
  };
  if (!contact.name) errors.push('name');
  if (!EMAIL_RE.test(contact.email)) errors.push('email');
  if (!contact.company) errors.push('company');
  // The website sends international numbers (+country code); check them against that country's rules.
  if (contact.phone) {
    const phone = checkPhone(contact.phone);
    if (phone.valid) contact.phone = phone.international;
    else errors.push('phone');
  }

  const ids = Array.isArray(body?.offerings) ? body.offerings.slice(0, 300).map((o) => (typeof o === 'string' ? o : o?.id)) : [];
  const offerings = [...new Set(ids)].map((id) => offeringIndex.get(id)).filter(Boolean);
  if (!offerings.length) errors.push('offerings');

  const enquiry = {
    reference: /^MS-\d{6}-[A-Z0-9]{4}$/.test(body?.reference) ? body.reference : makeReference(),
    submittedAt: new Date().toISOString(),
    source: oneLine(body?.source, 300),
    contact,
    timeline: TIMELINES.includes(body?.timeline) ? body.timeline : TIMELINES[TIMELINES.length - 1],
    message: String(body?.message ?? '').trim().slice(0, 2000),
    offerings,
  };
  return { errors, enquiry, isSpam: Boolean(String(body?.website ?? '').trim()) };
}

// ---------------------------------------------------------------- email content
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function offeringsHtml(offerings) {
  const byFamily = {};
  offerings.forEach((o) => (byFamily[o.family] ||= []).push(o));
  return Object.entries(byFamily)
    .map(
      ([family, items]) =>
        `<p style="margin:14px 0 4px;font-weight:bold;color:#5650a2">${esc(family)}</p><ul style="margin:0;padding-left:18px">${items
          .map((o) => `<li>${esc(o.name)} <span style="color:#726c90">(${esc(o.area)})</span></li>`)
          .join('')}</ul>`
    )
    .join('');
}

function teamMail(e) {
  const { subject, body } = enquiryEmail(e);
  const row = (k, v) =>
    v ? `<tr><td style="padding:4px 14px 4px 0;color:#726c90">${k}</td><td style="padding:4px 0">${v}</td></tr>` : '';
  const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const when = new Date(e.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
  const html = `<div style="font-family:Aller,Arial,Helvetica,sans-serif;font-size:14px;color:#2d2952;line-height:1.5">
  <h2 style="margin:0 0 4px">New proposal request</h2>
  <p style="margin:0 0 16px;color:#726c90">Reference <strong>${esc(e.reference)}</strong></p>
  <table style="border-collapse:collapse">${row('Name', esc(e.contact.name))}${row('Email', link(`mailto:${e.contact.email}`, e.contact.email))}${row('Phone', e.contact.phone ? link(`tel:${e.contact.phone.replace(/[^\d+]/g, '')}`, e.contact.phone) : esc('(not given)'))}${row('Company', esc(e.contact.company))}${row('Preferred contact', esc(e.contact.preferredContact))}${row('Timeline', esc(e.timeline))}${row('Received', esc(when))}</table>
  <p style="margin:18px 0 4px;font-weight:bold">What they want to achieve</p>
  <p style="margin:0;white-space:pre-wrap">${esc(e.message || '(not provided)')}</p>
  <p style="margin:18px 0 0;font-weight:bold">Offerings of interest (${e.offerings.length})</p>${offeringsHtml(e.offerings)}
  <p style="margin:20px 0 0;color:#726c90;font-size:12px">Sent from ${esc(e.source)} · reply to this email to answer ${esc(e.contact.name)} directly.</p></div>`;
  return {
    from: config.from,
    to: config.to,
    cc: config.cc || undefined,
    replyTo: `"${e.contact.name.replace(/"/g, '')}" <${e.contact.email}>`,
    subject,
    text: body,
    html,
  };
}

function ackMail(e) {
  const first = e.contact.name.split(' ')[0];
  const steps = [
    'Acknowledgement from our team within one business day.',
    'A discovery call with the relevant practice lead.',
    'A scope proposal with deliverables, acceptance criteria and fees.',
  ];
  const text = [
    `Hello ${first},`,
    '',
    `Thank you for your interest in MindSuite. We have received your proposal request (${e.reference}) for:`,
    ...e.offerings.map((o) => `  - ${o.name}`),
    '',
    'What happens next:',
    ...steps.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    'Reply to this email if you would like to add anything.',
    '',
    'MindSuite',
    'info@mindsuite.in · +91 91000 05500',
  ].join('\n');
  const html = `<div style="font-family:Aller,Arial,Helvetica,sans-serif;font-size:14px;color:#2d2952;line-height:1.6">
  <p>Hello ${esc(first)},</p>
  <p>Thank you for your interest in MindSuite. We have received your proposal request <strong>${esc(e.reference)}</strong> for:</p>
  ${offeringsHtml(e.offerings)}
  <p style="margin:18px 0 4px;font-weight:bold">What happens next</p>
  <ol style="margin:0;padding-left:20px">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  <p>Reply to this email if you would like to add anything.</p>
  <p style="color:#726c90">MindSuite · info@mindsuite.in · +91 91000 05500</p></div>`;
  return {
    from: config.from,
    to: e.contact.email,
    replyTo: config.replyTo,
    subject: `We received your request (${e.reference})`,
    text,
    html,
  };
}

// ---------------------------------------------------------------- guide conversations
const slug = (text) =>
  text.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function validateConversation(body) {
  const errors = [];
  const v = body?.visitor || {};
  const visitor = { name: oneLine(v.name, 120), email: oneLine(v.email, 254), phone: oneLine(v.phone, 40) };
  if (!visitor.name) errors.push('name');
  if (!EMAIL_RE.test(visitor.email)) errors.push('email');
  const phone = checkPhone(visitor.phone);
  if (phone.valid) visitor.phone = phone.international;
  else errors.push('phone');

  const messages = (Array.isArray(body?.messages) ? body.messages.slice(-80) : [])
    .map((m) => ({
      who: m?.who === 'visitor' ? 'visitor' : 'guide',
      text: String(m?.text ?? '').trim().slice(0, 4000),
      notice: oneLine(m?.notice, 300),
      // Offering names and links come from the catalogue here, not from the browser.
      suggestions: (Array.isArray(m?.suggestions) ? m.suggestions.slice(0, 6) : [])
        .map((x) => {
          const o = offeringIndex.get(x?.id);
          return o && { ...o, reason: oneLine(x.reason, 400), url: `${config.site}/offerings/${slug(o.name)}` };
        })
        .filter(Boolean),
    }))
    .filter((m) => m.text);
  if (!messages.some((m) => m.who === 'visitor')) errors.push('messages');
  return {
    errors,
    conversation: {
      reference: makeReference().replace(/^MS-/, 'GD-'),
      receivedAt: new Date().toISOString(),
      source: oneLine(body?.source, 300),
      lang: ['en', 'fr', 'ar'].includes(body?.lang) ? body.lang : 'en',
      reason: oneLine(body?.reason, 60),
      visitor,
      messages,
    },
  };
}

function conversationMail(c) {
  const when = new Date(c.receivedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
  const offerings = [...new Map(c.messages.flatMap((m) => m.suggestions).map((o) => [o.id, o])).values()];
  const questions = c.messages.filter((m) => m.who === 'visitor').length;
  const tel = c.visitor.phone.replace(/[^\d+]/g, '');
  const row = (k, v) => `<tr><td style="padding:4px 14px 4px 0;color:#726c90">${k}</td><td style="padding:4px 0">${v}</td></tr>`;
  const bubble = (m) => {
    const visitor = m.who === 'visitor';
    return `<div style="margin:0 0 10px;${visitor ? 'margin-left:40px;background:#e6e0f4;border:1px solid #dbd3ef' : 'margin-right:20px;background:#ffffff;border:1px solid #dfdcee'};border-radius:12px;padding:10px 14px">
      <div style="font-size:11px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;color:#785da8">${visitor ? esc(c.visitor.name) : 'MindSuite guide'}</div>
      <div style="white-space:pre-wrap">${esc(m.text)}</div>${m.notice ? `<div style="font-size:12px;color:#796133;margin-top:6px">${esc(m.notice)}</div>` : ''}
      ${m.suggestions
        .map(
          (o) => `<div style="margin-top:8px;padding:8px 12px;border-left:4px solid #5650a2;background:#faf9fe;border-radius:8px">
        <a href="${esc(o.url)}" style="color:#423e7e;font-weight:bold;text-decoration:none">${esc(o.name)}</a> <span style="color:#726c90;font-size:12px">(${esc(o.family)})</span>
        <div style="color:#5c567b;font-size:13px">${esc(o.reason)}</div></div>`
        )
        .join('')}</div>`;
  };
  const html = `<div style="font-family:Aller,Arial,Helvetica,sans-serif;font-size:14px;color:#2d2952;line-height:1.5;max-width:720px">
  <div style="background:#1d193e;color:#f5f4fc;padding:18px 20px;border-radius:12px 12px 0 0">
    <div style="font-size:22px;font-weight:bold">MindSuite</div>
    <div style="color:#54c9eb;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-top:4px">Guide conversation · ${esc(c.reference)}</div>
  </div>
  <div style="background:#f6f8fc;padding:18px 20px;border:1px solid #dfdcee;border-top:0;border-radius:0 0 12px 12px">
  <table style="border-collapse:collapse;margin-bottom:14px">${row('Name', esc(c.visitor.name))}${row('Email', `<a href="mailto:${esc(c.visitor.email)}">${esc(c.visitor.email)}</a>`)}${row('Phone', `<a href="tel:${esc(tel)}">${esc(c.visitor.phone)}</a>`)}${row('Received', esc(when))}${row('Language', esc(c.lang))}${row('Questions', String(questions))}</table>
  ${offerings.length ? `<p style="margin:0 0 4px;font-weight:bold">Offerings the guide suggested (${offerings.length})</p><ul style="margin:0 0 16px;padding-left:18px">${offerings.map((o) => `<li><a href="${esc(o.url)}">${esc(o.name)}</a> <span style="color:#726c90">(${esc(o.family)})</span></li>`).join('')}</ul>` : ''}
  <p style="margin:0 0 8px;font-weight:bold">Conversation</p>
  ${c.messages.map(bubble).join('')}
  <p style="margin:16px 0 0;color:#726c90;font-size:12px">From ${esc(c.source)} · reply to this email to answer ${esc(c.visitor.name)} directly.</p>
  </div></div>`;
  const text = [
    `Guide conversation ${c.reference}`,
    `Name: ${c.visitor.name}`,
    `Email: ${c.visitor.email}`,
    `Phone: ${c.visitor.phone}`,
    `Received: ${when}`,
    '',
    ...c.messages.flatMap((m) => [
      `${m.who === 'visitor' ? c.visitor.name : 'MindSuite guide'}: ${m.text}`,
      ...m.suggestions.map((o) => `  - ${o.name}: ${o.url}`),
      '',
    ]),
  ].join('\n');
  return {
    from: config.from,
    to: config.to,
    cc: config.cc || undefined,
    replyTo: `"${c.visitor.name.replace(/"/g, '')}" <${c.visitor.email}>`,
    subject: `Guide conversation with ${c.visitor.name}${offerings.length ? ` (${offerings.length} offerings)` : ''} · ${c.reference}`,
    text,
    html,
  };
}

// ---------------------------------------------------------------- rate limiting
function makeLimiter({ max, windowMs }) {
  const hits = new Map(); // ip -> timestamps
  setInterval(() => {
    const now = Date.now();
    for (const [ip, ts] of hits) if (ts.every((t) => now - t >= windowMs)) hits.delete(ip);
  }, 60_000).unref();
  return (ip) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > max;
  };
}
const rateLimited = makeLimiter(config.rateLimit);
const assistantLimited = makeLimiter(config.assistantRateLimit);
const conversationLimited = makeLimiter(config.conversationRateLimit);
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;

const offeringEmailLimited = makeLimiter(config.offeringEmailRateLimit);
const offeringEmailInboxLimited = makeLimiter(config.offeringEmailPerInbox);

// ---------------------------------------------------------------- offering details by email
class OfferingEmailError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Emails the details of up to three catalogue offerings to the visitor. The address is the one
 * the visitor gave the guide (sent by the website with the request), never one taken from the
 * chat, and sending is limited per network address and per inbox.
 * Returns { to, offerings: [{ id, name }] } or throws an OfferingEmailError.
 */
async function sendOfferingDetails({ visitor, ids, ip }) {
  const person = { name: oneLine(visitor?.name, 120), email: oneLine(visitor?.email, 254).toLowerCase() };
  if (!EMAIL_RE.test(person.email)) throw new OfferingEmailError('no_email', 'No email address on file.');
  const offerings = [...new Set(Array.isArray(ids) ? ids : [])]
    .map((id) => offeringDetails.get(id))
    .filter(Boolean)
    .slice(0, 3);
  if (!offerings.length) throw new OfferingEmailError('no_offerings', 'No catalogue offerings were named.');
  if (offeringEmailLimited(ip) || offeringEmailInboxLimited(person.email)) {
    throw new OfferingEmailError('limited', 'Too many offering emails recently. Try again later.');
  }
  const mail = offeringDetailsMail({
    visitor: person,
    offerings,
    site: config.site,
    from: config.from,
    replyTo: config.replyTo,
    contact: { email: 'info@mindsuite.in', phone: '+91 91000 05500' },
  });
  try {
    await deliver(mail, `offering-details-${Date.now().toString(36)}`);
  } catch (err) {
    console.error('[offering-email] sending failed:', err.message);
    throw new OfferingEmailError('send_failed', 'The email could not be sent right now.');
  }
  console.log(`[offering-email] ${offerings.map((o) => o.id).join(', ')} → ${person.email} via ${mode}`);
  return { to: person.email, offerings: offerings.map((o) => ({ id: o.id, name: o.name })) };
}

/** POST /api/offering-email { visitor, offeringIds }: used when the guide runs without AI. */
async function handleOfferingEmail(req, res) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) return send(res, 403, { error: 'Origin not allowed' }, cors);
  let body;
  try {
    body = await readJson(req, 8 * 1024);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message }, cors);
  }
  try {
    const sent = await sendOfferingDetails({ visitor: body?.visitor, ids: body?.offeringIds, ip: clientIp(req) });
    return send(res, 200, { ok: true, ...sent }, cors);
  } catch (err) {
    if (!(err instanceof OfferingEmailError)) throw err;
    const status = { no_email: 400, no_offerings: 400, limited: 429, send_failed: 502 }[err.code];
    return send(res, status, { error: err.message, code: err.code }, cors);
  }
}

// ---------------------------------------------------------------- AI budget alerts
function budgetAlertMail(s) {
  const pct = Math.round(s.used * 100);
  const usd = (n) => `$${n.toFixed(2)}`;
  const num = (n) => n.toLocaleString('en-US');
  const reached = s.level >= 1;
  const subject = reached
    ? `MindSuite guide: this month's AI budget is used up (${usd(s.cost)} of ${usd(s.limit)})`
    : `MindSuite guide: ${pct}% of this month's AI budget used (${usd(s.cost)} of ${usd(s.limit)})`;
  const rows = [
    ['Month', s.month],
    ['Estimated spend', `${usd(s.cost)} of ${usd(s.limit)} (${pct}%)`],
    ['Guide replies', num(s.replies)],
    ['Tokens in total', num(s.tokens)],
    ['  fresh input', num(s.input)],
    ['  output', num(s.output)],
    ['  cached reads', num(s.cacheRead)],
    ['  cache writes', num(s.cacheWrite)],
    ['Model', assistant.model],
  ];
  const next = reached
    ? 'The guide is still answering with AI. To keep costs in check, raise ASSISTANT_MONTHLY_BUDGET_USD on the server, or set a spend limit in the Anthropic Console (Settings → Limits). Without ANTHROPIC_API_KEY the guide falls back to catalogue matching.'
    : 'Nothing has changed for visitors. If this month needs more, raise ASSISTANT_MONTHLY_BUDGET_USD on the server. You will get one more email if the budget is used up.';
  const html = `<div style="font-family:Aller,Arial,Helvetica,sans-serif;font-size:14px;color:#2d2952;line-height:1.5;max-width:620px">
  <div style="background:#1d193e;color:#f5f4fc;padding:16px 20px;border-radius:12px 12px 0 0"><div style="font-size:20px;font-weight:bold">MindSuite</div>
  <div style="color:${reached ? '#ffb4a8' : '#54c9eb'};font-size:12px;font-weight:bold;letter-spacing:.1em;text-transform:uppercase;margin-top:4px">Guide AI budget · ${reached ? 'used up' : `${pct}% used`}</div></div>
  <div style="background:#f6f8fc;padding:16px 20px;border:1px solid #dfdcee;border-top:0;border-radius:0 0 12px 12px">
  <div style="height:10px;background:#e1ddf0;border-radius:5px;overflow:hidden;margin:4px 0 14px"><div style="height:10px;width:${Math.min(100, pct)}%;background:${reached ? '#b42318' : '#5650a2'}"></div></div>
  <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#726c90;white-space:pre">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
  <p style="margin:14px 0 0">${esc(next)}</p>
  <p style="margin:12px 0 0;font-size:12px;color:#726c90">The spend is estimated by the guide server from token counts; the Anthropic Console shows the exact bill.</p></div></div>`;
  const text = [subject, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', next].join('\n');
  return { from: config.from, to: config.budget.alertTo, subject, text, html };
}

const budget = createUsageBudget({
  file: join(here, 'usage.json'),
  limit: config.budget.limit,
  prices: config.budget.prices,
  onAlert: async (s) => {
    console.log(`[budget] ${Math.round(s.used * 100)}% of $${s.limit} used in ${s.month}: alerting ${config.budget.alertTo}`);
    await deliver(budgetAlertMail(s), `budget-${s.month}-${Math.round(s.level * 100)}`);
  },
});

// ---------------------------------------------------------------- assistant (Claude)
const assistant = createAssistant(catalogue, { onUsage: budget.record });

// ---------------------------------------------------------------- HTTP helpers
function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(data));
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !config.allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

/**
 * Browsers send Origin on cross-site POSTs. Accept the site's own address, anything listed in
 * ALLOWED_ORIGINS, and (in development) the Vite dev server. Requests without Origin, such as
 * server-to-server calls or curl, are allowed and still rate limited and validated.
 */
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin === `http://${host}` || origin === `https://${host}`) return true;
  if (config.allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(req, res) {
  if (!existsSync(distDir)) return send(res, 404, { error: 'Not found' });
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(distDir, urlPath));
  if (!file.startsWith(distDir)) return send(res, 403, { error: 'Forbidden' });
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(distDir, 'index.html'); // single-page app fallback
  }
  try {
    const data = await readFile(file);
    const cache = file.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(data);
  } catch {
    send(res, 404, { error: 'Not found' });
  }
}

// ---------------------------------------------------------------- routes
async function handleEnquiry(req, res) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) return send(res, 403, { error: 'Origin not allowed' }, cors);
  const ip = clientIp(req);
  if (rateLimited(ip)) return send(res, 429, { error: 'Too many requests. Please try again later.' }, cors);

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message }, cors);
  }

  const { errors, enquiry, isSpam } = validate(body);
  if (isSpam) {
    console.warn(`[enquiry] spam trap triggered from ${ip}; not sent`);
    return send(res, 200, { ok: true, reference: enquiry.reference }, cors);
  }
  if (errors.length) return send(res, 400, { error: `Please check: ${errors.join(', ')}`, fields: errors }, cors);

  try {
    await deliver(teamMail(enquiry), `${enquiry.reference}-team`);
    if (config.sendAck) {
      // The team copy matters most; an acknowledgement failure should not fail the request.
      await deliver(ackMail(enquiry), `${enquiry.reference}-ack`).catch((err) =>
        console.error(`[enquiry] acknowledgement to ${enquiry.contact.email} failed:`, err.message)
      );
    }
    console.log(`[enquiry] ${enquiry.reference} from ${enquiry.contact.email} (${enquiry.offerings.length} offerings) via ${mode}`);
    return send(res, 200, { ok: true, reference: enquiry.reference }, cors);
  } catch (err) {
    console.error('[enquiry] sending failed:', err);
    return send(res, 502, { error: 'We could not send your request right now. Please try again shortly.' }, cors);
  }
}

async function handleConversation(req, res) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) return send(res, 403, { error: 'Origin not allowed' }, cors);
  const ip = clientIp(req);
  if (conversationLimited(ip)) return send(res, 429, { error: 'Too many requests. Please try again later.' }, cors);
  let body;
  try {
    body = await readJson(req, 160 * 1024);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message }, cors);
  }
  const { errors, conversation } = validateConversation(body);
  if (errors.length) return send(res, 400, { error: `Please check: ${errors.join(', ')}`, fields: errors }, cors);
  try {
    await deliver(conversationMail(conversation), `${conversation.reference}-conversation`);
    console.log(`[conversation] ${conversation.reference} from ${conversation.visitor.email} (${conversation.messages.length} messages, ${conversation.reason || 'ended'}) via ${mode}`);
    return send(res, 200, { ok: true, reference: conversation.reference }, cors);
  } catch (err) {
    console.error('[conversation] sending failed:', err);
    return send(res, 502, { error: 'Could not send the conversation.' }, cors);
  }
}

async function handleAssistant(req, res) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) return send(res, 403, { error: 'Origin not allowed' }, cors);
  if (req.method === 'GET') return send(res, 200, { mode: assistant.enabled ? 'ai' : 'catalogue' }, cors);
  if (!assistant.enabled) return send(res, 503, { mode: 'catalogue', error: 'AI recommendations are not configured.' }, cors);
  if (assistantLimited(clientIp(req))) {
    return send(res, 429, { error: 'You have sent a lot of messages. Please wait a few minutes and try again.' }, cors);
  }

  let body;
  try {
    body = await readJson(req, 48 * 1024);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message }, cors);
  }
  try {
    const ip = clientIp(req);
    const { status, body: out } = await assistant.reply(body?.messages, {
      // The guide's tool: email offering details to the address the visitor shared, if any.
      emailOfferings: async (ids) => {
        try {
          return { ok: true, ...(await sendOfferingDetails({ visitor: body?.visitor, ids, ip })) };
        } catch (err) {
          if (!(err instanceof OfferingEmailError)) throw err;
          return { ok: false, code: err.code, error: err.message };
        }
      },
    });
    return send(res, status, out, cors);
  } catch (err) {
    console.error('[assistant] request failed:', err);
    const { status, error } = assistantError(err);
    return send(res, status, { error }, cors);
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname === '/api/assistant') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        return res.end();
      }
      if (req.method === 'GET' || req.method === 'POST') return await handleAssistant(req, res);
      return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, OPTIONS' });
    }
    if (pathname === '/api/enquiry') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        return res.end();
      }
      if (req.method === 'POST') return await handleEnquiry(req, res);
      return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' });
    }
    if (pathname === '/api/conversation') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        return res.end();
      }
      if (req.method === 'POST') return await handleConversation(req, res);
      return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' });
    }
    if (pathname === '/api/offering-email') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        return res.end();
      }
      if (req.method === 'POST') return await handleOfferingEmail(req, res);
      return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' });
    }
    if (pathname === '/api/health') return send(res, 200, { ok: true, mode, auth: authMethod });
    if (pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    return await serveStatic(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: 'Server error' });
  }
});

server.listen(config.port, () => {
  console.log(`MindSuite server on http://localhost:${config.port}  (mail mode: ${mode})`);
  console.log(
    assistant.enabled
      ? `  Guide: AI recommendations with ${assistant.model}; ${
          config.budget.limit > 0
            ? `budget $${config.budget.limit}/month, $${budget.status().cost.toFixed(2)} used in ${budget.status().month} (alerts to ${config.budget.alertTo})`
            : 'no budget alerts'
        }`
      : '  Guide: no ANTHROPIC_API_KEY set, so the website uses its built-in keyword matching.'
  );
  if (mode === 'preview') console.log('  No SMTP_HOST set: emails are saved to server/outbox instead of being sent.');
  else {
    getTransport()
      .then((transport) => transport.verify())
      .then(() =>
        console.log(`  SMTP ready (${authMethod}): ${env.SMTP_USER} via ${config.smtp.host}:${config.smtp.port} → ${config.to}`)
      )
      .catch((err) => console.error(`  SMTP check failed (${authMethod}):`, err.message));
  }
});
