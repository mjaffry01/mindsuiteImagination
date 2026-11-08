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
import { assistantError, createAssistant } from './assistant.js';

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
  to: env.MAIL_TO || 'info@mindsuite.in',
  cc: env.MAIL_CC || '',
  sendAck: env.SEND_ACK !== 'false',
  allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  rateLimit: { max: Number(env.RATE_LIMIT_MAX) || 5, windowMs: (Number(env.RATE_LIMIT_MINUTES) || 15) * 60_000 },
  assistantRateLimit: {
    max: Number(env.ASSISTANT_RATE_LIMIT_MAX) || 30,
    windowMs: (Number(env.ASSISTANT_RATE_LIMIT_MINUTES) || 15) * 60_000,
  },
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
    'info@mindsuite.in · +91 91000 05500',
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2b3350;line-height:1.6">
  <p>Hello ${esc(first)},</p>
  <p>Thank you for your interest in MindSuite. We have received your proposal request <strong>${esc(e.reference)}</strong> for:</p>
  ${offeringsHtml(e.offerings)}
  <p style="margin:18px 0 4px;font-weight:bold">What happens next</p>
  <ol style="margin:0;padding-left:20px">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  <p>Reply to this email if you would like to add anything.</p>
  <p style="color:#6c7790">MindSuite · info@mindsuite.in · +91 91000 05500</p></div>`;
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
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;

// ---------------------------------------------------------------- assistant (Claude)
const assistant = createAssistant(catalogue);

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
    const { status, body: out } = await assistant.reply(body?.messages);
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
      ? `  Guide: AI recommendations with ${assistant.model}`
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
