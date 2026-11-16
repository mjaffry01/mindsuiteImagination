import { normalize } from '../data/catalogue.js';
import { checkPhone } from './phone.js';

/**
 * The guide asks for the visitor's name, email and phone in conversation, one at a time, and
 * understands the answers whether typed or spoken ("my name is Sara", "sara at acme dot com",
 * "plus nine six six five five ...").
 */

export const INTAKE_STEPS = ['name', 'email', 'phone'];

export const INTAKE_QUESTIONS = {
  name: 'May I have your name, please?',
  email: 'Thanks, {name}. Please spell your email address for me, letter by letter. For example: j, o, h, n, at gmail dot com.',
  phone: 'Got it: {email}. Now your phone number, please. Type it on the keypad below, then press Send. If it isn’t a {country} number, start with the country code.',
};
export const INTAKE_RETRY = {
  name: 'Sorry, I didn’t catch your name. Could you tell me again?',
  email: 'I didn’t get a complete email address. Please spell it again, letter by letter, for example: j, o, h, n, at gmail dot com. You can also type it.',
  phone: 'That doesn’t look like a valid phone number. Please type it on the keypad, with the country code, then press Send.',
};
/** Asked when the visitor clicks a detail they already gave, to correct it. */
export const INTAKE_CORRECT = {
  name: 'Sure. What name should I use?',
  email: 'Sure. Please spell the right email address, letter by letter.',
  phone: 'Sure. Please type the right phone number on the keypad.',
};
export const INTAKE_DONE =
  'Thank you, {name}. I’ve noted {email} and {phone}, and our team will follow up with you. Is there anything else I can help you with?';
/** Asked once the visitor has used the guide for a while (not when it first opens). */
export const INTAKE_INVITE =
  'I see you’re interested in our offerings. To take this further, why don’t you give me your name, email address and phone number? Our team will then follow up with you. First, may I have your name?';
export const INTAKE_SKIPPED = 'No problem. Tell me what you’d like to improve, and I’ll suggest the right offerings.';

const SKIP_PHRASES = new Set(
  [
    'skip', 'skip it', 'skip this', 'skip that', 'no', 'no thanks', 'no thank you', 'not now', 'later', 'pass',
    'i d rather not', 'i would rather not', 'rather not', 'i don t want to', 'i dont want to', 'none of your business',
    'continue without sharing', 'without sharing', 'passer', 'non merci', 'plus tard', 'je prefere pas',
    'je prefere ne pas', 'تخطي', 'تخطى', 'لا شكرا', 'لاحقا', 'لا',
  ].map((p) => normalize(p).trim())
);

export const isSkip = (text) => SKIP_PHRASES.has(normalize(text).trim());

// "My name is …", "I'm …", "Je m'appelle …", "اسمي …"
const NAME_LEAD =
  /^(?:(?:hi|hello|hey|bonjour|salut|مرحبا)[,!. ]+)?(?:(?:yes|yeah|sure|ok|okay|oui)[,!. ]+)?(?:my name is|my name's|my name|name is|the name is|i am|i'm|im|this is|it's|it is|call me|you can call me|je m'appelle|je m’appelle|je suis|moi c'est|c'est|اسمي|انا|أنا)\s+/i;

/** The visitor's name from an answer like "my name is sara khan", or '' if there is none. */
export function extractName(text) {
  let name = String(text || '')
    .replace(/[“”"]/g, '')
    .trim()
    .replace(NAME_LEAD, '')
    .replace(/[.!?,;]+$/g, '')
    .replace(/\s+(?:and|et|و)\s+.*$/i, '') // "Sara and I work at Acme"
    .trim();
  if (!name || name.length > 80 || /[@\d]/.test(name)) return '';
  const words = name.split(/\s+/);
  if (words.length > 5) return '';
  // Speech recognition often gives lower case: "sara khan" → "Sara Khan".
  if (name === name.toLowerCase()) {
    name = words.map((w) => w.charAt(0).toLocaleUpperCase() + w.slice(1)).join(' ');
  }
  return name;
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;

/** An email from typed or spoken text ("sara dot khan at acme dot com"), or ''. */
export function extractEmail(text) {
  const typedAt = String(text || '').includes('@');
  let s = ` ${String(text || '').toLowerCase()} `;
  // Spelled out letter by letter ("j, o, h, n, at gmail dot com"): drop the separators and
  // words like "capital", and turn "double f" into "ff" and digit words into digits.
  if (!typedAt) {
    s = s
      .replace(/[,;]/g, ' ')
      .replace(/(?<=\s)([a-z0-9])\.(?=\s)/g, '$1') // "j. o. h. n."
      .replace(/(?<=\s)(?:the letter|lower case|upper case|capital|small|letter|lowercase|uppercase|majuscule|minuscule)(?=\s)/g, ' ')
      .replace(/(?<=\s)(zero|one|two|three|four|five|six|seven|eight|nine)(?=\s)/g, (w) => SPELLED_DIGITS[w])
      .replace(/(?<=\s)(double|triple)\s+([a-z0-9])(?=\s)/g, (m, n, c) => c.repeat(n === 'triple' ? 3 : 2));
  }
  s = s
    .replace(/\s(?:at the rate(?: of)?|at sign|arobase|arrobase|at)\s/g, '@')
    .replace(/\s(?:dot|point|period)\s/g, '.')
    .replace(/\s(?:underscore|tiret bas)\s/g, '_')
    .replace(/\s(?:dash|hyphen|minus|tiret)\s/g, '-');
  // Typed with an "@": take the address as written.
  const typed = typedAt && s.match(EMAIL_RE);
  if (typed) return clean(typed[0]);
  // Spoken: the words around "@" belong together ("sara khan@acme.com" → "sarakhan@acme.com").
  const at = s.indexOf('@');
  if (at < 0) return '';
  const lead = /^(?:my )?(?:email|e-mail|mail|address|email address)(?: address)? (?:is )?|^(?:it's|it is|c'est) /;
  const joined = s.trim().replace(lead, '').replace(/\s+/g, '');
  const m = joined.match(EMAIL_RE);
  return m ? clean(m[0]) : '';
}
const SPELLED_DIGITS = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9' };
const clean = (email) => email.replace(/^[^a-z0-9]+|[.,;!?]+$/g, '');

const DIGIT_WORDS = {
  zero: '0', oh: '0', o: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7',
  eight: '8', nine: '9', zéro: '0', un: '1', deux: '2', trois: '3', quatre: '4', cinq: '5', sept: '7',
  huit: '8', neuf: '9', plus: '+',
};

/**
 * A phone number from typed or spoken text ("plus nine six six, five five ...", "double five"),
 * checked against the country's numbering rules. Returns checkPhone()'s result.
 */
export function extractPhone(text, country) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .split(/[\s,.-]+/)
    .filter(Boolean);
  let out = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = DIGIT_WORDS[words[i + 1]] ?? (/^\d$/.test(words[i + 1]) ? words[i + 1] : null);
    if ((w === 'double' || w === 'triple') && next && next !== '+') {
      out += next.repeat(w === 'double' ? 2 : 3);
      i++;
    } else if (/^\+?[\d()]+$/.test(w)) out += w.replace(/[()]/g, '');
    else if (DIGIT_WORDS[w]) out += DIGIT_WORDS[w];
  }
  return checkPhone(out, country);
}
