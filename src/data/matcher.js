import { aliases, normalize, offerings } from './catalogue.js';

const STOPWORDS = new Set(
  ('a an and are as at be but by can do for from get have help how i in into is it its me my need ' +
    'of on or our out so that the their them there this to up us want we what when which who will ' +
    'with would you your should could make improve better looking like some any about all more')
    .split(' ')
);

const stem = (word) => {
  if (word.length <= 4) return word;
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ies', 'es', 'ed', 's']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) return word.slice(0, -suffix.length);
  }
  return word;
};

const index = offerings.map((o) => ({
  offering: o,
  fields: [
    [4, normalize(o.name).split(' ')],
    [2, normalize(o.area.name).split(' ')],
    [1, normalize(o.family.name).split(' ')],
    [1, normalize([o.definition, o.scope, o.deliverables, o.value].join(' ')).split(' ')],
  ],
}));

/**
 * Offline "catalogue matching": ranks offerings by weighted keyword overlap with the
 * visitor's message. Returns the same shape as the original /api/assistant endpoint.
 */
export function matchOfferings(text, limit = 3) {
  const terms = [
    ...new Set(
      normalize(text)
        .split(' ')
        .flatMap((t) => (aliases[t] || t).split(' '))
        .filter((t) => t.length > 1 && !STOPWORDS.has(t))
        .map(stem)
    ),
  ];
  if (!terms.length) return [];

  return index
    .map(({ offering, fields }) => {
      let score = 0;
      let hits = 0;
      for (const term of terms) {
        let best = 0;
        for (const [weight, words] of fields) {
          if (words.some((w) => w.startsWith(term))) best = Math.max(best, weight);
        }
        if (best) hits++;
        score += best;
      }
      // Reward offerings that cover more of what was asked, not just one repeated word.
      return { offering, score: score * (hits / terms.length) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.offering.index - b.offering.index)
    .slice(0, limit)
    .map((r) => r.offering);
}

export function localAssistantReply(text) {
  const found = matchOfferings(text);
  if (!found.length) {
    return {
      mode: 'catalogue',
      message:
        'I could not find a close match in the catalogue. Try describing the outcome you want, such as “reduce cloud costs” or “prepare for an audit”, or use the catalogue search.',
      suggestions: [],
    };
  }
  return {
    mode: 'catalogue',
    message: `Here ${found.length === 1 ? 'is the offering' : `are ${found.length} offerings`} from the catalogue that best match what you described:`,
    suggestions: found.map((o) => ({ id: o.id, reason: o.definition })),
  };
}
