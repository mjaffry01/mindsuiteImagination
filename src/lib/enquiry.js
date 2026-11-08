/**
 * Proposal enquiries from the "Your interests" shortlist.
 *
 * Sending: set VITE_ENQUIRY_URL (in a .env file) to an endpoint that accepts
 *   POST application/json  — the payload built by buildEnquiry() below —
 * and replies 2xx. That endpoint sends the email through MindSuite's own SMTP account
 * (to the team, and optionally an acknowledgement to the visitor).
 *
 * Until it is set, submitting opens the visitor's email app with the full enquiry
 * pre-filled to ENQUIRY_INBOX, so nothing is lost.
 */

export const ENQUIRY_INBOX = 'info@mindsuite.in';
// `import.meta.env` exists in the browser build only; the server imports this file for enquiryEmail().
const ENDPOINT = import.meta.env?.VITE_ENQUIRY_URL || '';

export const isBackendConfigured = () => Boolean(ENDPOINT);

export const TIMELINES = ['As soon as possible', 'Within 1–3 months', 'Within 3–6 months', 'Just exploring'];
export const CONTACT_METHODS = ['Email', 'Phone call', 'WhatsApp', 'Video meeting'];

/** Short, human-readable reference such as MS-261108-K7Q2. */
export function makeReference(date = new Date()) {
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) => alphabet[n % alphabet.length]).join('');
  return `MS-${ymd}-${rand}`;
}

/** The JSON body sent to the backend. */
export function buildEnquiry(form, offerings) {
  return {
    reference: makeReference(),
    submittedAt: new Date().toISOString(),
    source: location.href,
    contact: {
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      preferredContact: form.preferredContact,
    },
    timeline: form.timeline,
    message: form.message.trim(),
    website: form.website || '', // hidden spam trap: people never fill this in
    offerings: offerings.map((o) => ({
      id: o.id,
      name: o.name,
      family: o.family.name,
      area: o.area.name,
    })),
  };
}

/** Plain-text email: used for the email-app fallback, and a ready template for the SMTP sender. */
export function enquiryEmail(enquiry) {
  const { contact, offerings } = enquiry;
  const byFamily = {};
  offerings.forEach((o) => (byFamily[o.family] ||= []).push(o));
  const lines = [
    `Proposal request ${enquiry.reference}`,
    '',
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Company: ${contact.company}`,
    contact.phone ? `Phone: ${contact.phone}` : null,
    `Preferred contact: ${contact.preferredContact}`,
    `Timeline: ${enquiry.timeline}`,
    '',
    'What they want to achieve:',
    enquiry.message || '(not provided)',
    '',
    `Offerings of interest (${offerings.length}):`,
    ...Object.entries(byFamily).flatMap(([family, items]) => [
      `  ${family}`,
      ...items.map((o) => `    - ${o.name} (${o.area})`),
    ]),
    '',
    `Sent from ${enquiry.source}`,
  ];
  return {
    subject: `Proposal request ${enquiry.reference}: ${contact.company || contact.name}`,
    body: lines.filter((l) => l !== null).join('\n'),
  };
}

/**
 * Sends the enquiry. Resolves to { via: 'backend' } or { via: 'email-app' }; throws if the
 * backend is configured but rejects the request.
 */
export async function sendEnquiry(enquiry) {
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry),
    });
    if (!res.ok) {
      let reason = '';
      try {
        reason = (await res.json()).error || '';
      } catch {}
      const err = new Error(reason || `Enquiry endpoint replied ${res.status}`);
      err.status = res.status;
      err.reason = reason;
      throw err;
    }
    return { via: 'backend' };
  }
  const { subject, body } = enquiryEmail(enquiry);
  location.href = `mailto:${ENQUIRY_INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { via: 'email-app' };
}
