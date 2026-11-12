import { families, inEnglish, normalize, offerings } from '../data/catalogue.js';

/**
 * Spoken navigation for the MindSuite Guide: "take me to Cloud Native Security", "open
 * careers", "show the cybersecurity section", "back to the top", "scroll down".
 * Works in English, French and Arabic, on names in the site's language and in English.
 */

// Words that start a request to go somewhere (already in normalize() form).
const VERBS = [
  // English
  'take me to', 'take me', 'take us to', 'back to', 'go back to the', 'return to', 'bring me to', 'go to', 'go back to', 'navigate to', 'jump to', 'scroll to',
  'move to', 'skip to', 'head to', 'open up', 'open', 'show me', 'show', 'display', 'bring up',
  'i want to see', 'let me see', 'can you open', 'can you show me', 'could you open', 'could you show me',
  'please open', 'please show me', 'please go to', 'please take me to', 'navigate', 'go',
  // French
  'emmene moi a', 'emmene moi au', 'emmene moi', 'amene moi a', 'va a', 'va au', 'va aux', 'aller a',
  'aller au', 'allez a', 'allez au', 'ouvre', 'ouvrez', 'montre moi', 'montrez moi', 'affiche', 'affichez',
  'je veux voir', 'navigue vers', 'naviguer vers',
  // Arabic
  'خذني الى', 'خذني', 'اذهب الى', 'انتقل الى', 'افتح', 'اعرض', 'ارني', 'اريد ان ارى', 'وديني',
]
  .map((v) => normalize(v).trim())
  .sort((a, b) => b.length - a.length);

// Filler words ignored when comparing names.
const FILLER = new Set(
  'the a an to of me us please page section part area tab our your that this now for and on in at '
    .concat('le la les l du de des d au aux un une page rubrique partie s il vous plait ')
    .concat('صفحة قسم الى من في')
    .split(/\s+/)
    .map((w) => normalize(w).trim())
    .filter(Boolean)
);

// Parts of the site that are not in the catalogue.
const PLACES = [
  { id: 'top', label: 'the top of the page', names: ['top', 'home', 'home page', 'start', 'beginning', 'haut', 'accueil', 'debut', 'الاعلى', 'البداية', 'الرئيسية'] },
  { id: 'catalogue', label: 'Offerings', names: ['offerings', 'offering', 'catalogue', 'catalog', 'services', 'all offerings', 'offres', 'les offres', 'العروض', 'الخدمات'] },
  { id: 'platforms', label: 'Platforms', names: ['platforms', 'platform', 'partners', 'technology partners', 'plateformes', 'partenaires', 'المنصات', 'الشركاء'] },
  { id: 'clients', label: 'Clients', names: ['clients', 'customers', 'our clients', 'العملاء'] },
  { id: 'leadership', label: 'Team', names: ['team', 'leadership', 'leaders', 'management', 'equipe', 'direction', 'الفريق', 'القيادة'] },
  { id: 'about', label: 'About us', names: ['about', 'about us', 'company', 'who we are', 'a propos', 'qui sommes nous', 'من نحن', 'عن الشركة'] },
  { id: '/careers', label: 'Careers', names: ['careers', 'career', 'jobs', 'vacancies', 'openings', 'carrieres', 'emplois', 'recrutement', 'الوظائف', 'وظائف'] },
  { id: '/privacy', label: 'Privacy and Cookies', names: ['privacy', 'privacy policy', 'privacy notice', 'cookies', 'confidentialite', 'الخصوصية'] },
];

const SCROLL_PHRASES = [
  { id: 'scroll:down', names: ['scroll down', 'go down', 'page down', 'down', 'defile vers le bas', 'descends', 'انزل', 'للاسفل'] },
  { id: 'scroll:up', names: ['scroll up', 'go up', 'page up', 'up', 'defile vers le haut', 'remonte', 'اصعد', 'للاعلى'] },
];

const SCROLL = SCROLL_PHRASES.map((s) => ({ ...s, names: s.names.map((n) => normalize(n).trim()) }));

const words = (text) => normalize(text).split(' ').filter((w) => w && !FILLER.has(w));

/** Everything a visitor can be taken to, with the names it may be called by. */
function destinations() {
  const list = PLACES.map((p) => ({ ...p, kind: 'place' }));
  for (const f of families) {
    const en = inEnglish(f);
    list.push({ id: f.id, label: f.name, kind: 'family', names: [f.name, f.short, en.name, en.short] });
    for (const a of f.areas) {
      const ea = inEnglish(a);
      list.push({ id: a.id, label: a.name, kind: 'area', names: [a.name, a.short, ea.name, ea.short].filter(Boolean) });
    }
  }
  for (const o of offerings) list.push({ id: o.id, label: o.name, kind: 'offering', names: [o.name, inEnglish(o).name] });
  return list;
}

/** How closely the spoken words match a name: 1 is the same words, 0 nothing in common. */
function closeness(spoken, name) {
  const a = words(spoken);
  const b = words(name);
  if (!a.length || !b.length) return 0;
  if (a.join(' ') === b.join(' ')) return 1;
  const shared = a.filter((w) => b.includes(w)).length;
  return shared / new Set([...a, ...b]).size;
}

/**
 * If the words ask to go somewhere on the site, returns where: { id, label }.
 * id is an element id ("offering-132", "family-4", "platforms"), "top", "/careers",
 * "/privacy", "scroll:down" or "scroll:up". Otherwise returns null.
 */
export function navigationTarget(text) {
  const said = normalize(text).trim();
  for (const s of SCROLL) if (s.names.includes(said)) return { id: s.id, label: '' };

  const verb = VERBS.find((v) => said === v || said.startsWith(`${v} `));
  if (!verb) return null;
  const rest = said.slice(verb.length).trim();
  if (!rest) return null;
  for (const s of SCROLL) if (s.names.includes(rest)) return { id: s.id, label: '' };

  let best = null;
  for (const d of destinations()) {
    for (const name of d.names) {
      const score = closeness(rest, name);
      // On equal scores prefer the most specific: an offering over an area over a family.
      const rank = score + { offering: 0.003, area: 0.002, family: 0.001, place: 0 }[d.kind];
      if (!best || rank > best.rank) best = { rank, score, id: d.id, label: d.label };
    }
  }
  return best && best.score >= 0.6 ? { id: best.id, label: best.label } : null;
}

// "Send me the details of …", "email me …", "envoie-moi …", "أرسل لي …" (normalize() form).
const SEND_RE = new RegExp(
  '^(?:(?:can|could|would) you |please |pls )?(?:' +
    [
      'send me', 'send us', 'send', 'email me', 'email us', 'email', 'e mail me', 'mail me', 'mail', 'share with me',
      'forward me', 'envoie moi', 'envoyez moi', 'envoie', 'envoyez', 'mail moi', 'ارسل لي', 'ارسل', 'ابعث لي', 'ابعث',
    ]
      .map((v) => normalize(v).trim())
      .sort((a, b) => b.length - a.length)
      .join('|') +
    ')(?: please)? (.+)$'
);
const ABOUT_RE = new RegExp(
  '^(?:me |us )?(?:(?:the|all the|more|full|some|les|des|plus d) )?(?:details|detail|information|info|brochure|description|datasheet|overview|' +
    'informations|infos|details|تفاصيل|معلومات)?\s*(?:(?:of|about|on|for|regarding|de|du|des|sur|concernant|عن|حول) )?(?:(?:the|le|la|les) )?'
);
const THESE = new Set(['these', 'them', 'those', 'that', 'it', 'this', 'these offerings', 'those offerings', 'ces offres', 'les', 'ca', 'هذه', 'ذلك'].map((w) => normalize(w).trim()));

/**
 * If the words ask for offering details to be emailed, returns { ids, label } where ids are the
 * offerings named (empty when the visitor means "these", the ones just suggested). Otherwise null.
 */
export function offeringEmailRequest(text) {
  const said = normalize(text).trim();
  const m = said.match(SEND_RE);
  if (!m) return null;
  const rest = m[1].replace(ABOUT_RE, '').replace(/\s*(?:by|via|par) (?:e ?mail|mail)\s*$/, '').replace(/\s*(?:to me|please)$/, '').trim();
  if (!rest || THESE.has(rest) || /^(?:details|information|info|it|them)$/.test(rest)) return { ids: [], label: '' };
  let best = null;
  for (const d of destinations()) {
    if (d.kind !== 'offering') continue;
    for (const name of d.names) {
      const score = closeness(rest, name);
      if (!best || score > best.score) best = { score, id: d.id, label: d.label };
    }
  }
  return best && best.score >= 0.5 ? { ids: [best.id], label: best.label } : { ids: [], label: '', unknown: rest };
}
