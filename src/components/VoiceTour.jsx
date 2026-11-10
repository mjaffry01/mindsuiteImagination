import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Captions, CaptionsOff, Headphones, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react';
import { catalogueLanguage, families } from '../data/catalogue.js';
import { buildVoiceTour } from '../data/voiceTour.js';
import { ensureCatalogue } from '../lib/catalogueStages.js';
import { useLanguage } from '../i18n/index.jsx';

/**
 * Voice tour of the offerings: a narrated walk through the service families. Each stop brings
 * its family into view and plays a recorded AI voice (public/voice-tour, made by
 * `npm run voice-tour`). A stop without a current recording is read by the device's own voice,
 * or, where the device has none for the language, shown as captions for a reading time.
 */

const SPEEDS = [1, 1.25, 0.85];
const LOCALES = { en: 'en', ar: 'ar', fr: 'fr' };
const base = import.meta.env.BASE_URL;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Splits narration into sentences, each with where it starts in the text. */
function sentencesOf(text) {
  const parts = text.match(/[^.!?؟]+[.!?؟]+[\s]*|[^.!?؟]+$/g) || [text];
  let at = 0;
  return parts.map((p) => {
    const start = at;
    at += p.length;
    return { text: p.trim(), start, end: at };
  });
}

let manifestPromise = null;
const loadManifest = () =>
  (manifestPromise ||= fetch(`${base}voice-tour/manifest.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null));

/** The best device voice for a language: natural/online voices first. */
function deviceVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(LOCALES[lang]));
  return voices.find((v) => /natural|online|neural|premium|enhanced/i.test(v.name)) || voices.find((v) => /google/i.test(v.name)) || voices[0] || null;
}

function bringIntoView(stop) {
  const behavior = reducedMotion() ? 'auto' : 'smooth';
  if (stop.target === 'top') window.scrollTo({ top: 0, behavior });
  else if (stop.target) {
    ensureCatalogue();
    document.getElementById(stop.target)?.scrollIntoView({ block: 'start', behavior });
  }
  document.querySelectorAll('.is-voice-focus').forEach((el) => el.classList.remove('is-voice-focus'));
  if (stop.target && stop.target !== 'top') document.getElementById(stop.target)?.classList.add('is-voice-focus');
}

export default function VoiceTour({ onClose, onOpenEnquiry }) {
  const { t } = useLanguage();
  // Narrate in the language the catalogue is showing (it switches once its translation loads).
  const lang = catalogueLanguage;
  const stops = useMemo(() => buildVoiceTour(lang, families), [lang]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [captions, setCaptions] = useState(true);
  const [manifest, setManifest] = useState(undefined); // undefined while loading
  const [source, setSource] = useState(null); // 'recording' | 'device' | 'captions'
  const [progress, setProgress] = useState(0);
  const audio = useRef(null);
  const playRef = useRef(null);
  const rateRef = useRef(SPEEDS[0]);
  rateRef.current = SPEEDS[speed];

  const stop = stops[Math.min(index, stops.length - 1)];
  const sentences = useMemo(() => sentencesOf(stop.text), [stop.text]);
  // The sentence being spoken: from the recording's position, or the device voice's word boundaries.
  const spokenAt = progress * stop.text.length;
  const current = Math.max(0, sentences.findIndex((x) => spokenAt < x.end));
  const captionRef = useRef(null);

  useEffect(() => {
    audio.current = new Audio();
    audio.current.preload = 'auto';
    loadManifest().then(setManifest);
    // Device voices load asynchronously in some browsers.
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
    playRef.current?.focus({ preventScroll: true });
    return () => {
      audio.current.pause();
      audio.current.removeAttribute('src');
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      document.querySelectorAll('.is-voice-focus').forEach((el) => el.classList.remove('is-voice-focus'));
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    };
  }, []);

  // Each stop: show its family.
  useEffect(() => {
    bringIntoView(stop);
    setProgress(0);
  }, [stop.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Playback of the current stop.
  useEffect(() => {
    if (!playing || manifest === undefined) return;
    const el = audio.current;
    let cancelled = false;
    let timer = null;
    let ticker = null;
    const done = () => {
      if (cancelled) return;
      clearInterval(ticker);
      setProgress(1);
      if (index < stops.length - 1) timer = setTimeout(() => setIndex((i) => i + 1), 700);
      else {
        setPlaying(false);
        setFinished(true);
      }
    };
    const captionsOnly = () => {
      setSource('captions');
      // About 15 characters a second, at the chosen speed.
      const ms = Math.max(4000, (stop.text.length / 15) * 1000) / rateRef.current;
      const began = Date.now();
      ticker = setInterval(() => setProgress(Math.min(1, (Date.now() - began) / ms)), 250);
      timer = setTimeout(done, ms);
    };
    const speak = () => {
      const voice = deviceVoice(lang);
      if (!voice) return captionsOnly();
      setSource('device');
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(stop.text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = rateRef.current;
      u.onend = done;
      u.onboundary = (e) => setProgress(e.charIndex / stop.text.length);
      u.onerror = (e) => e.error !== 'interrupted' && e.error !== 'canceled' && captionsOnly();
      speechSynthesis.speak(u);
    };

    const recorded = manifest?.files?.[lang]?.[stop.id] === stop.hash;
    if (recorded) {
      const key = `${lang}/${stop.id}/${stop.hash}`;
      if (el.dataset.key !== key) {
        el.src = `${base}voice-tour/${lang}/${stop.id}.mp3?v=${stop.hash}`;
        el.dataset.key = key;
      }
      el.playbackRate = rateRef.current;
      el.onended = done;
      el.ontimeupdate = () => el.duration && setProgress(el.currentTime / el.duration);
      setSource('recording');
      el.play().catch((err) => {
        if (!cancelled && err.name !== 'AbortError') speak();
      });
    } else speak();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(ticker);
      el.onended = null;
      el.pause();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, [playing, index, stop, lang, manifest, stops.length]);

  useLayoutEffect(() => {
    const box = captionRef.current;
    const line = box?.querySelector('.is-now');
    if (!box || !line) return;
    const top = line.offsetTop; // .vt-caption is position: relative
    if (top < box.scrollTop || top + line.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTo({ top: Math.max(0, top - 6), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [current, stop.id, captions]);

  // Speed changes apply to the recording straight away; device speech picks it up next stop.
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = SPEEDS[speed];
  }, [speed]);

  // Lock-screen and headset controls on phones.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: stop.title, artist: 'MindSuite', album: t('Voice tour') });
    const handlers = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      previoustrack: () => goTo(index - 1),
      nexttrack: () => goTo(index + 1),
    };
    Object.entries(handlers).forEach(([k, fn]) => {
      try {
        navigator.mediaSession.setActionHandler(k, fn);
      } catch {}
    });
  });

  function goTo(i) {
    if (i < 0 || i >= stops.length) return;
    audio.current?.removeAttribute('data-key');
    setFinished(false);
    setIndex(i);
    setPlaying(true);
  }

  const restart = () => goTo(0);
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <section className="voice-tour" aria-label={t('Voice tour')} onKeyDown={onKeyDown} data-source={source || undefined}>
      <div className="vt-top">
        <span className="vt-count">
          <Headphones aria-hidden="true" />
          {t('Voice tour')} · {t('Stop {n} of {total}', { n: index + 1, total: stops.length })}
        </span>
        <button type="button" className="vt-icon" aria-label={t('Close voice tour')} onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <h2 className="vt-title">{stop.title}</h2>
      {captions && (
        <p className="vt-caption" lang={lang} ref={captionRef}>
          {sentences.map((x, i) => (
            <span key={i} className={i === current ? 'is-now' : i < current ? 'is-past' : undefined}>
              {x.text}{' '}
            </span>
          ))}
        </p>
      )}
      <ol className="vt-dots">
        {stops.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={i === index ? 'is-on' : i < index ? 'is-done' : undefined}
              aria-label={t('Go to stop {n}: {title}', { n: i + 1, title: s.title })}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => goTo(i)}
            >
              {i === index && <span style={{ transform: `scaleX(${progress})` }} />}
            </button>
          </li>
        ))}
      </ol>
      <div className="vt-controls">
        <button type="button" className="vt-icon" aria-label={t('Previous stop')} disabled={index === 0} onClick={() => goTo(index - 1)}>
          <SkipBack aria-hidden="true" />
        </button>
        {finished ? (
          <button type="button" ref={playRef} className="vt-play" aria-label={t('Listen again')} onClick={restart}>
            <RotateCcw aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            ref={playRef}
            className="vt-play"
            aria-label={playing ? t('Pause') : t('Play')}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          className="vt-icon"
          aria-label={t('Next stop')}
          disabled={index === stops.length - 1}
          onClick={() => goTo(index + 1)}
        >
          <SkipForward aria-hidden="true" />
        </button>
        <button
          type="button"
          className="vt-speed"
          aria-label={t('Playback speed: {rate}', { rate: `${SPEEDS[speed]}×` })}
          onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)}
        >
          {SPEEDS[speed]}×
        </button>
        <button
          type="button"
          className="vt-icon"
          aria-pressed={captions}
          aria-label={captions ? t('Hide captions') : t('Show captions')}
          onClick={() => setCaptions((c) => !c)}
        >
          {captions ? <Captions aria-hidden="true" /> : <CaptionsOff aria-hidden="true" />}
        </button>
        {stop.id === 'outro' && (
          <button type="button" className="vt-enquiry" onClick={onOpenEnquiry}>
            {t('Open your enquiry')}
          </button>
        )}
      </div>
    </section>
  );
}
