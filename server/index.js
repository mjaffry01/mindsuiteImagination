/**
 * MindSuite proposal-request endpoint (and, in production, the static site).
 *
 *   POST /api/enquiry   JSON from the "Request a proposal" form → email to the team (+ acknowledgement)
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
  from: env.MAIL_FROM || 'MindSuite <no-reply@mindsuite.in>',
  to: env.MAIL_TO || 'info@mindsuite.in',
  cc: env.MAIL_CC || '',
  sendAck: env.SEND_ACK !== 'false',
  allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  rateLimit: { max: Number(env.RATE_LIMIT_MAX) || 5, windowMs: (Number(env.RATE_LIMIT_MINUTES) || 15) * 60_000 },
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

// ---------------------------------------------------------------- mail transport
const transport = config.smtp
  ? nodemailer.createTransport(config.smtp)
  : nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
const mode = config.smtp ? 'smtp' : 'preview';

async function deliver(message, label) {
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
  if (contact.phone && !/^[+\d\s().-]{5,40}$/.test(contact.phone)) errors.push('phone');

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
        `<p style="margin:14px 0 4px;font-weight:bold;color:#4d3f85">${esc(family)}</p><ul style="margin:0;padding-left:18px">${items
          .map((o) => `<li>${esc(o.name)} <span style="color:#6c7790">(${esc(o.area)})</span></li>`)
          .join('')}</ul>`
    )
    .join('');
}

function teamMail(e) {
  const { subject, body } = enquiryEmail(e);
  const row = (k, v) =>
    v ? `<tr><td style="padding:4px 14px 4px 0;color:#6c7790">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2b3350;line-height:1.5">
  <h2 style="margin:0 0 4px">New proposal request</h2>
  <p style="margin:0 0 16px;color:#6c7790">Reference <strong>${esc(e.reference)}</strong></p>
  <table style="border-collapse:collapse">${row('Name', e.contact.name)}${row('Email', e.contact.email)}${row('Company', e.contact.company)}${row('Phone', e.contact.phone)}${row('Preferred contact', e.contact.preferredContact)}${row('Timeline', e.timeline)}</table>
  <p style="margin:18px 0 4px;font-weight:bold">What they want to achieve</p>
  <p style="margin:0;white-space:pre-wrap">${esc(e.message || '(not provided)')}</p>
  <p style="margin:18px 0 0;font-weight:bold">Offerings of interest (${e.offerings.length})</p>${offeringsHtml(e.offerings)}
  <p style="margin:20px 0 0;color:#6c7790;font-size:12px">Sent from ${esc(e.source)} · reply to this email to answer ${esc(e.contact.name)} directly.</p></div>`;
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
    'info@mindsuite.in · +91 9100 00 5500',
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2b3350;line-height:1.6">
  <p>Hello ${esc(first)},</p>
  <p>Thank you for your interest in MindSuite. We have received your proposal request <strong>${esc(e.reference)}</strong> for:</p>
  ${offeringsHtml(e.offerings)}
  <p style="margin:18px 0 4px;font-weight:bold">What happens next</p>
  <ol style="margin:0;padding-left:20px">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  <p>Reply to this email if you would like to add anything.</p>
  <p style="color:#6c7790">MindSuite · info@mindsuite.in · +91 9100 00 5500</p></div>`;
  return {
    from: config.from,
    to: e.contact.email,
    replyTo: config.to,
    subject: `We received your request (${e.reference})`,
    text,
    html,
  };
}

// ---------------------------------------------------------------- rate limiting
const hits = new Map(); // ip -> timestamps
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < config.rateLimit.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > config.rateLimit.max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of hits) if (ts.every((t) => now - t >= config.rateLimit.windowMs)) hits.delete(ip);
}, 60_000).unref();

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
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

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname === '/api/enquiry') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        return res.end();
      }
      if (req.method === 'POST') return await handleEnquiry(req, res);
      return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' });
    }
    if (pathname === '/api/health') return send(res, 200, { ok: true, mode });
    if (pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    return await serveStatic(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: 'Server error' });
  }
});

server.listen(config.port, () => {
  console.log(`MindSuite server on http://localhost:${config.port}  (mail mode: ${mode})`);
  if (mode === 'preview') console.log('  No SMTP_HOST set: emails are saved to server/outbox instead of being sent.');
  else {
    transport
      .verify()
      .then(() => console.log(`  SMTP ready: ${config.smtp.host}:${config.smtp.port} → ${config.to}`))
      .catch((err) => console.error('  SMTP check failed:', err.message));
  }
});
