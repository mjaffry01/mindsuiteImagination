/**
 * The guide's document library: MindSuite's offering documents, cut into passages
 * (server/knowledge.json, built from the PDFs in knowledge-src/ by tools/build-knowledge.py).
 *
 * For each question the guide searches the passages (BM25 keyword ranking, with a document's
 * title counting extra) and gives the best few to Claude, so answers can quote the documents
 * instead of only the one-line catalogue entries. Runs in memory: no extra service or cost.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'knowledge.json');

const STOP = new Set(
  'a an and are as at be but by can could do does for from had has have how i if in into is it its me my of on or our so that the their them then there these they this to us was we what when where which who why will with would you your about any all also am get give need needs want wants tell please mindsuite offer offering offerings service services help'.split(
    ' '
  )
);

/** Lower-case words without stop words, lightly stemmed ("testing" → "test", "audits" → "audit"). */
export function words(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w));
}

const normName = (s) => words(s).join(' ');

// Everyday words visitors use, and the words the documents use for the same thing.
const ALSO = {
  hack: 'incident breach attack forensic response',
  hacked: 'incident breach attack forensic response',
  hacker: 'attacker attack',
  breach: 'incident forensic response',
  breached: 'incident breach forensic response',
  virus: 'malware ransomware endpoint',
  malware: 'ransomware endpoint',
  phish: 'email identity awareness',
  phishing: 'email identity awareness',
  password: 'identity access privileged',
  login: 'identity access',
  sso: 'identity access',
  firewall: 'network',
  laptop: 'endpoint',
  backup: 'recovery ransomware continuity',
  outage: 'continuity recovery disaster',
  disaster: 'recovery continuity',
  scada: 'ot ics',
  plc: 'ot ics',
  factory: 'ot ics',
  plant: 'ot ics',
  iso: 'compliance audit governance',
  soc2: 'compliance audit',
  gdpr: 'data protection privacy compliance',
  dpdp: 'data protection privacy compliance',
  chatbot: 'ai generative llm',
  llm: 'ai generative',
  gpt: 'ai generative llm',
  aws: 'cloud',
  azure: 'cloud',
  gcp: 'cloud',
  kubernetes: 'cloud native container',
  ciso: 'vciso governance executive',
  board: 'executive governance risk',
  pentest: 'penetration test',
};
const expand = (terms) => terms.flatMap((t) => [t, ...(ALSO[t] ? words(ALSO[t]) : [])]);

/**
 * Loads the library. `catalogue` links each document to the catalogue offering of the same name,
 * so the guide can suggest that offering when it answers from the document.
 */
export function loadKnowledge(catalogue = []) {
  if (!existsSync(FILE)) return null;
  const { docs, chunks } = JSON.parse(readFileSync(FILE, 'utf8'));
  const offeringsByName = new Map();
  for (const f of catalogue) for (const a of f.areas) for (const o of a.offerings) offeringsByName.set(normName(o.name), o.id);
  const docById = new Map(
    docs.map((d) => [d.id, { ...d, offeringId: offeringsByName.get(normName(d.title)) || null }])
  );

  // Each passage is indexed with its document's title (twice, so a title match counts extra),
  // its category and its section heading.
  const index = chunks.map((c, i) => {
    const doc = docById.get(c.doc);
    const terms = words(`${doc.title} ${doc.title} ${doc.category} ${c.section} ${c.text}`);
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    return { i, doc, chunk: c, tf, length: terms.length };
  });
  const avgLength = index.reduce((s, x) => s + x.length, 0) / (index.length || 1);
  const df = new Map();
  for (const x of index) for (const t of x.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const idf = (t) => Math.log(1 + (index.length - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));

  /**
   * The passages that best match a question, best first: at most `limit`, at most `perDoc` from
   * one document, and only ones that share real words with the question. `context` (the
   * visitor's previous message) helps with follow-ups like "what do I get with that?".
   */
  function search(question, { context = '', limit = 6, perDoc = 3 } = {}) {
    const weights = new Map();
    for (const t of words(question)) weights.set(t, (weights.get(t) || 0) + 1);
    // Words that mean the same in the documents count a little less than the visitor's own.
    for (const t of expand(words(question))) if (!weights.has(t)) weights.set(t, 0.6);
    for (const t of words(context)) weights.set(t, (weights.get(t) || 0) + 0.4);
    if (!weights.size) return [];
    const k1 = 1.2;
    const b = 0.75;
    const scored = [];
    for (const x of index) {
      let score = 0;
      for (const [t, w] of weights) {
        const f = x.tf.get(t);
        if (!f) continue;
        score += w * idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * x.length) / avgLength)));
      }
      if (score > 0) scored.push({ score, x });
    }
    scored.sort((p, q) => q.score - p.score);
    const best = scored[0]?.score || 0;
    const perDocCount = new Map();
    const out = [];
    for (const { score, x } of scored) {
      if (score < best * 0.35 || out.length >= limit) break;
      const n = perDocCount.get(x.doc.id) || 0;
      if (n >= perDoc) continue;
      perDocCount.set(x.doc.id, n + 1);
      out.push({ doc: x.doc, section: x.chunk.section, text: x.chunk.text, score: Math.round(score * 100) / 100 });
    }
    return out;
  }

  return { docs: [...docById.values()], passages: chunks.length, search };
}
