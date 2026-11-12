/**
 * Talking to the MindSuite Guide: the browser's own speech recognition turns the visitor's
 * voice into text, and the device's own voices read the guide's replies aloud.
 *
 * Nothing here is loaded from another site. Speech recognition is done by the browser maker's
 * service (Google in Chrome, Microsoft in Edge, Apple in Safari); the privacy notice says so.
 */

const LOCALES = { en: 'en-US', ar: 'ar-SA', fr: 'fr-FR' };
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/** True where the browser can turn speech into text (Chrome, Edge, Safari; not Firefox). */
export const canListen = Boolean(Recognition);
/** True where the device can read text aloud (almost every browser). */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

// How long a silence means "I have finished". A sentence that stops on a word such as "and",
// "the" or "um" sounds unfinished, so the guide waits longer before answering.
const PAUSE_MS = 1400;
const UNFINISHED_PAUSE_MS = 3200;
const UNFINISHED =
  /(^|\s)(and|or|but|so|because|then|the|a|an|to|of|for|with|in|on|at|my|our|about|like|um+|uh+|er+|hmm+|et|ou|mais|donc|parce que|le|la|les|un|une|de|des|du|pour|avec|euh+|و|أو|لكن|ثم|في|من|إلى|على|عن|مع)\s*$/i;

/**
 * Listens for one spoken turn. The visitor may pause mid-sentence: listening only ends after a
 * short silence (longer if the words so far sound unfinished). `onText` gets the words while
 * the visitor speaks; `onEnd` gets the final words (empty if nothing was heard or it was
 * cancelled). Returns the recogniser: `.stop()` finishes now and keeps the words, `.abort()`
 * cancels.
 */
export function listen(lang, { onText, onEnd, onError }) {
  const r = new Recognition();
  r.lang = LOCALES[lang] || 'en-US';
  r.interimResults = true;
  r.continuous = true; // keep listening through pauses; the silence timer below decides the end
  r.maxAlternatives = 1;
  let final = '';
  let interim = '';
  let cancelled = false;
  let timer = 0;
  r.onresult = (e) => {
    final = '';
    interim = '';
    for (const result of e.results) {
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }
    const text = `${final} ${interim}`.replace(/\s+/g, ' ').trim();
    onText(text);
    clearTimeout(timer);
    if (text) timer = setTimeout(() => r.stop(), UNFINISHED.test(text) ? UNFINISHED_PAUSE_MS : PAUSE_MS);
  };
  r.onerror = (e) => {
    if (e.error === 'aborted') cancelled = true;
    onError?.(e.error);
  };
  let ended = false;
  r.onend = () => {
    if (ended) return; // some browsers report the end twice
    ended = true;
    clearTimeout(timer);
    onEnd(cancelled ? '' : `${final} ${interim}`.replace(/\s+/g, ' ').trim());
  };
  const abort = r.abort.bind(r);
  r.abort = () => {
    cancelled = true;
    clearTimeout(timer);
    abort();
  };
  r.start();
  return r;
}

/** The most natural device voice for a language: neural/online voices first. */
function voiceFor(lang) {
  const prefix = (LOCALES[lang] || 'en-US').slice(0, 2);
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(prefix));
  return (
    voices.find((v) => /natural|online|neural|premium|enhanced/i.test(v.name)) ||
    voices.find((v) => /google/i.test(v.name)) ||
    voices[0] ||
    null
  );
}

// Some browsers load their voices late; asking once early makes them ready in time.
if (canSpeak) speechSynthesis.getVoices();

// Utterances are kept here while queued: Chrome can drop the end event of one it has forgotten.
let queued = [];
let speechTurn = 0;

/**
 * Reads text aloud in the site's language, sentence by sentence (Chrome stops long single
 * utterances after about 15 seconds). `onEnd` runs once the last sentence has been spoken
 * (not when speech is stopped). Returns false when the device has no voice for it.
 */
export function speak(text, lang, { onEnd } = {}) {
  if (!canSpeak || !text) return false;
  stopSpeaking();
  const voice = voiceFor(lang);
  if (!voice && lang !== 'en') return false;
  const turn = ++speechTurn;
  const parts = text.match(/[^.!?؟]+[.!?؟]*/g)?.map((s) => s.trim()).filter(Boolean) || [text];
  queued = parts.map((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = LOCALES[lang] || 'en-US';
    if (i === parts.length - 1) {
      const done = () => {
        if (turn !== speechTurn) return; // stopped or replaced by newer speech
        queued = [];
        onEnd?.();
      };
      u.onend = done;
      u.onerror = (e) => e.error !== 'interrupted' && e.error !== 'canceled' && done();
    }
    speechSynthesis.speak(u);
    return u;
  });
  return true;
}

/** True while the guide is reading something out (until its last sentence ends or is stopped). */
export const isSpeaking = () => queued.length > 0;

export function stopSpeaking() {
  speechTurn++;
  queued = [];
  if (canSpeak) speechSynthesis.cancel();
}
