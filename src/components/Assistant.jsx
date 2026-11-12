import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { focusTarget } from '../lib/focus.js';
import { normalize, offeringById } from '../data/catalogue.js';
import { localAssistantReply } from '../data/matcher.js';
import { Check, Download, LocateFixed, Mic, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';
import { preferenceStorage } from '../lib/consent.js';
import { canListen, canSpeak, isSpeaking, listen, speak, stopSpeaking } from '../lib/voice.js';
import { navigationTarget, offeringEmailRequest } from '../lib/voiceNavigation.js';
import {
  CONVERSATION_URL,
  OFFERING_EMAIL_URL,
  downloadConversation,
  sendConversation,
  sendOfferingEmail,
  wakeGuideServer,
} from '../lib/conversation.js';
import { guessCountry } from '../lib/phone.js';
import {
  INTAKE_CORRECT,
  INTAKE_DONE,
  INTAKE_QUESTIONS,
  INTAKE_RETRY,
  INTAKE_SKIPPED,
  INTAKE_STEPS,
  extractEmail,
  extractName,
  extractPhone,
  isSkip,
} from '../lib/visitorIntake.js';

const STORAGE_KEY = 'mindsuite-assistant-position-v1';
// The welcome. "AI assistant" is said only when AI answers are really switched on.
const GREETING =
  'Hello, welcome to MindSuite. I’m the MindSuite guide, and I’m here to help you. Tell me what you’d like to improve, and I’ll suggest the right offerings.';
const GREETING_AI =
  'Hello, welcome to MindSuite. I’m an AI assistant, and I’m here to help you. Tell me what you’d like to improve, and I’ll suggest the right offerings.';
// Set once the guide has greeted aloud in this browser tab session, so it only does so once.
const GREETED_KEY = 'mindsuite-guide-greeted';
// The visitor's name, email and phone for this browser tab session (or "skipped").
const VISITOR_KEY = 'mindsuite-guide-visitor';
const INTAKE_LABELS = { name: 'Name', email: 'Email', phone: 'Phone' };
// "Send me the details of …"
const EMAIL_ASK_NAME = 'To send you the details, I’ll need your email address. First, may I have your name?';
const EMAIL_SENDING = 'Thank you, {name}. Sending the details to {email} now…';
const EMAIL_SENT = 'Done. I’ve emailed the details of {names} to {email}.';
const EMAIL_FAILED = {
  limited: 'I’ve already sent several emails, so I can’t send more right now. Please try again later, or write to info@mindsuite.in.',
  unavailable: 'I can’t send emails from this version of the website. You can download this conversation, or write to info@mindsuite.in.',
  send_failed: 'Sorry, I couldn’t send the email just now. Please try again later, or write to info@mindsuite.in.',
};
const EMAIL_WHICH =
  'Which offering should I send you? Say its name, for example “send me the details of Cloud Native Security”, or ask me for suggestions first and then say “send me these”.';
const INTAKE_PLACEHOLDERS = {
  name: 'Type or say your name',
  email: 'Type or say your email address',
  phone: 'Type or say your phone number',
};

function savedVisitor() {
  try {
    return JSON.parse(sessionStorage.getItem(VISITOR_KEY)) || null;
  } catch {
    return null;
  }
}

/** The opening of a conversation: the welcome, then (when needed) the guide asks the visitor's name. */
function firstMessages(ai, askName) {
  return [
    { id: nextId++, who: 'guide', text: ai ? GREETING_AI : GREETING, greeting: true },
    ...(askName ? [{ id: nextId++, who: 'guide', text: INTAKE_QUESTIONS.name, intake: true }] : []),
  ];
}
const PROMPTS = [
  ['Single sign-on', 'We need single sign-on for our applications'],
  ['Ransomware', 'We want to prepare for ransomware recovery'],
  ['ERP integration', 'We need ERP integration'],
];
// Optional: point at a backend that speaks the original /api/assistant contract.
const REMOTE_URL = import.meta.env.VITE_ASSISTANT_URL;
// Saying one of these ends a voice conversation.
const STOP_PHRASES = new Set(
  [
    'stop', 'stop listening', 'stop talking', 'that s all', 'that is all', 'thats all', 'goodbye', 'bye',
    'end conversation', 'end the conversation', 'thank you that s all', 'no thanks', 'arrete', 'arrete d ecouter',
    'c est tout', 'au revoir', 'merci c est tout', 'توقف', 'انتهى', 'مع السلامة', 'شكرا هذا كل شيء',
    'i m done', 'im done', 'i am done', 'we re done', 'we are done', 'that will be all', 'that s it', 'thats it',
    'no more questions', 'nothing else', 'that s all thanks', 'thanks bye', 'thank you bye', 'ok bye', 'okay bye',
    'quit', 'exit', 'enough', 'j ai fini', 'c est fini', 'merci au revoir', 'termine', 'خلاص', 'كفى', 'شكرا مع السلامة',
  ].map((phrase) => normalize(phrase).trim())
);
// "Stop this conversation", "please end the chat now", "can we finish this session", "arrête la
// conversation", "أنهِ المحادثة": a verb that ends, then a word for the conversation. Business
// requests ("stop ransomware attacks") don't match, because they don't name the conversation.
const STOP_REQUEST = new RegExp(
  '^(?:(?:ok|okay|alright|right|yes|no|please|thanks|thank you|merci|d accord|شكرا|من فضلك)\\s+)*' +
    '(?:(?:can|could|would) (?:you|we) (?:please )?|i (?:want|would like|d like) (?:you )?to |let s |lets |you can |please |je veux |on peut |peux tu |pouvez vous |)' +
    '(?:stop|end|finish|close|quit|exit|terminate|cancel|wrap up|hang up|shut down|' +
    'arrete|arreter|arretez|termine|terminer|terminez|ferme|fermer|fermez|finis|finir|' +
    'اوقف|أوقف|توقف عن|انه|أنه|انهي|أنهي|اغلق|أغلق|اقفل)' +
    '\\s+(?:(?:the|this|our|that|my|la|cette|notre|le|ce|l)\\s+)?' +
    '(?:conversation|chat|chatting|session|discussion|talk|talking|call|voice|voice conversation|guide|' +
    'conversation vocale|discussion|المحادثة|الدردشة|الحديث|الجلسة|المكالمة)' +
    '(?:\\s+(?:now|please|here|for now|for today|thanks|thank you|maintenant|s il vous plait|merci|الان|من فضلك|شكرا))*$'
);
const isStopRequest = (text) => {
  const said = normalize(text).trim();
  // "Thanks, I'm done" / "ok goodbye": polite openers don't change the meaning.
  const bare = said.replace(/^(?:(?:ok|okay|alright|right|well|so|thanks|thank you|great|perfect|merci|d accord|شكرا|حسنا)\s+)+/, '');
  return STOP_PHRASES.has(said) || STOP_PHRASES.has(bare) || STOP_REQUEST.test(said);
};
// "Say that again": the guide repeats the answer it last read out.
const REPEAT_PHRASES = new Set(
  [
    'repeat', 'repeat that', 'repeat please', 'please repeat', 'repeat it', 'say that again', 'say it again',
    'again', 'come again', 'pardon', 'sorry what', 'what did you say', 'can you repeat', 'can you repeat that',
    'could you repeat that', 'one more time', 'play it again', 'play that again', 'replay', 'repete', 'repetez',
    'tu peux repeter', 'pouvez vous repeter', 'encore une fois', 'redis', 'كرر', 'اعد', 'اعد من فضلك', 'ماذا قلت',
  ].map((phrase) => normalize(phrase).trim())
);
// "Rewind": the guide goes back one answer each time and reads it out.
const REWIND_PHRASES = new Set(
  [
    'rewind', 'rewind more', 'go back', 'go back more', 'go back further', 'back', 'previous', 'previous answer',
    'the previous answer', 'last answer', 'before that', 'and before that', 'the one before', 'what did you say before',
    'what did you say before that', 'earlier answer', 'recule', 'reviens en arriere', 'retour en arriere',
    'precedent', 'la reponse precedente', 'et avant', 'ارجع', 'رجوع', 'السابق', 'الرد السابق', 'قبل ذلك',
  ].map((phrase) => normalize(phrase).trim())
);
const THINKING = 'Finding relevant offerings...';

// After this many quiet spells (about 8 seconds each) the microphone is switched off.
const QUIET_LIMIT = 4;

const clamp = (n, min, max) => Math.max(min, Math.min(n, Math.max(min, max)));
let nextId = 1;

function savedPosition() {
  try {
    const saved = JSON.parse(preferenceStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      return { x: saved.x * innerWidth, y: saved.y * innerHeight };
    }
  } catch {}
  return { x: innerWidth - 88, y: innerHeight - 160 };
}

/** Draggable "Help me choose" guide that recommends offerings for a described need. */
export default function Assistant({ interests, onAdd }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => clampPos(savedPosition()));
  const [panelBox, setPanelBox] = useState(null);
  const [messages, setMessages] = useState(() => firstMessages(false, Boolean(CONVERSATION_URL) && !savedVisitor()));
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(REMOTE_URL ? 'Connecting...' : 'Catalogue matching');
  const [disclosure, setDisclosure] = useState(
    REMOTE_URL
      ? 'Checking recommendation availability.'
      : 'Matches use catalogue terms. Your messages stay in this browser.'
  );
  const history = useRef([]);
  // True once the server confirms AI recommendations are configured.
  const aiReady = useRef(false);
  const { t, lang } = useLanguage();
  // Voice conversation: once started, the guide listens, answers aloud and in writing, then
  // listens again, until the visitor taps the microphone, says "stop" or stays quiet.
  const [talking, setTalking] = useState(false);
  const [phase, setPhase] = useState(''); // 'listening' | 'thinking' | 'speaking' while talking
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const recogniser = useRef(null);
  const talkingRef = useRef(false);
  const busyRef = useRef(false);
  const quietSpells = useRef(0);
  const voiceRepliesRef = useRef(false);
  voiceRepliesRef.current = voiceReplies;
  // Voice callbacks run long after the render that created them: they read the language here.
  const live = useRef({ t, lang });
  live.current = { t, lang };
  const listening = phase === 'listening';
  // Rewind: which earlier answer is being read again (null = none), and the latest messages.
  const [replayingId, setReplayingId] = useState(null);
  const replayAt = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // Who the visitor is (asked when the guide first opens, only where the conversation can be
  // emailed to the team), and how much of the conversation the team has already received.
  const [visitor, setVisitor] = useState(savedVisitor);
  const visitorRef = useRef(visitor);
  visitorRef.current = visitor;
  const needsDetails = Boolean(CONVERSATION_URL) && !visitor;
  // While details are needed, the guide asks for them one at a time and fills them in here.
  const [intake, setIntakeState] = useState({ step: 'name', name: '', email: '', phone: '', country: guessCountry() });
  const intakeRef = useRef(intake);
  const setIntake = (next) => {
    intakeRef.current = next;
    setIntakeState(next);
  };
  const needsDetailsRef = useRef(needsDetails);
  needsDetailsRef.current = needsDetails;
  const sentUpTo = useRef(0);
  // Offerings the visitor asked to be emailed while their email address was still unknown.
  const pendingEmail = useRef(null);
  const petRef = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);

  function clampPos({ x, y }) {
    return { x: clamp(x, 12, innerWidth - 76), y: clamp(y, 12, innerHeight - 76) };
  }

  const persist = (p) => {
    preferenceStorage.setItem(STORAGE_KEY, JSON.stringify({ x: p.x / innerWidth, y: p.y / innerHeight }));
  };

  const place = useCallback((p, save = false) => {
    const next = clampPos(p);
    setPos(next);
    if (save) persist(next);
  }, []);

  // Panel sits above the pet, aligned to whichever side of the screen it is on.
  const positionPanel = useCallback(() => {
    const width = Math.min(390, innerWidth - 24);
    const height = Math.min(570, innerHeight - 100);
    const left = pos.x < innerWidth / 2 ? pos.x : pos.x + 64 - width;
    setPanelBox({
      width,
      height,
      left: clamp(left, 12, innerWidth - width - 12),
      top: clamp(pos.y - height - 12, 12, innerHeight - height - 80),
    });
  }, [pos]);
  useLayoutEffect(positionPanel, [positionPanel]);

  // A hosted server may be asleep: wake it as soon as the guide opens.
  useEffect(() => {
    if (open) wakeGuideServer();
  }, [open]);

  useEffect(() => {
    const onResize = () => setPos(clampPos(savedPosition()));
    addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', positionPanel);
    return () => {
      removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', positionPanel);
    };
  }, [positionPanel]);

  useEffect(() => {
    if (!REMOTE_URL) return;
    fetch(REMOTE_URL)
      .then((r) => r.json())
      .then((result) => {
        const ai = result.mode === 'ai';
        aiReady.current = ai;
        if (ai) setMessages((list) => list.map((m) => (m.greeting ? { ...m, text: GREETING_AI } : m)));
        setMode(ai ? 'AI recommendations' : 'Catalogue matching');
        setDisclosure(
          ai
            ? 'Messages are sent to our AI provider (Anthropic) to suggest offerings.'
            : 'Matches use catalogue terms. Your messages stay in this browser.'
        );
      })
      .catch(() => {
        setMode('Catalogue matching');
        setDisclosure('Matches use catalogue terms. Your messages stay in this browser.');
      });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  // The bottom bar on phones opens the guide; the expert panel takes its place when opened.
  useEffect(() => {
    const onToggle = () => setOpen((o) => !o);
    const onExpert = () => setOpen(false);
    addEventListener('mindsuite:toggle-guide', onToggle);
    addEventListener('mindsuite:toggle-expert', onExpert);
    return () => {
      removeEventListener('mindsuite:toggle-guide', onToggle);
      removeEventListener('mindsuite:toggle-expert', onExpert);
    };
  }, []);

  // Closing the guide (or leaving the page) ends the voice conversation.
  useEffect(() => {
    if (!open) stopTalking();
  }, [open]);
  useEffect(() => () => stopTalking(), []);

  /** Starts a hands-free voice conversation. */
  function startTalking() {
    stopSpeaking();
    setVoiceNote('');
    if (canSpeak) setVoiceReplies(true); // spoken questions get spoken answers
    talkingRef.current = true;
    setTalking(true);
    quietSpells.current = 0;
    if (busyRef.current) setPhase('thinking'); // it listens once the current answer is given
    else listenTurn();
  }

  /** Ends the voice conversation: the microphone goes off and speech stops. */
  function stopTalking(note = '') {
    talkingRef.current = false;
    setTalking(false);
    setPhase('');
    const r = recogniser.current;
    recogniser.current = null;
    r?.abort();
    stopSpeaking();
    setVoiceNote(note);
  }

  /** Listens for the visitor's next question; pauses mid-sentence are fine. */
  function listenTurn() {
    if (!talkingRef.current || recogniser.current || busyRef.current) return;
    // Never listen while the guide is speaking: it would hear itself. It listens once it finishes.
    if (isSpeaking()) return;
    setPhase('listening');
    setVoiceNote('');
    try {
      recogniser.current = listen(live.current.lang, {
        onText: (text) => {
          setInput(text);
          if (text) quietSpells.current = 0;
        },
        onEnd: (heard) => {
          recogniser.current = null;
          if (!talkingRef.current || busyRef.current) return;
          if (heard) {
            return ask(heard); // "stop this conversation" is handled there, typed or spoken
          }
          // Nothing said: keep waiting for a while, then switch the microphone off.
          if (++quietSpells.current >= QUIET_LIMIT) {
            return stopTalking('The voice conversation paused because it was quiet. Tap the microphone to talk again.');
          }
          setTimeout(listenTurn, 200);
        },
        onError: (error) => {
          if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') {
            stopTalking('Microphone access is blocked. Allow it in your browser’s address bar, or type your question.');
          } else if (error === 'network') {
            stopTalking('Voice input needs an internet connection. Please type your question.');
          }
          // "no-speech" and "aborted" are handled when listening ends.
        },
      });
    } catch {
      recogniser.current = null;
      stopTalking('Voice input stopped. Please try again, or type your question.');
    }
  }

  /** The visitor said "stop" or "goodbye". */
  /**
   * The visitor asked to stop ("stop", "stop this conversation", "goodbye"), typed or spoken:
   * the guide stops speaking and listening, says goodbye, and the conversation is finished
   * (emailed to the team if the visitor shared their details). A new question starts afresh.
   */
  function endConversation(said) {
    setInput('');
    stopTalking();
    pendingEmail.current = null;
    const person = visitorRef.current;
    const bye =
      person && !person.skipped
        ? 'Okay, I’ve ended this conversation. Thank you, {name}. Our team has your conversation and will follow up. Ask me anything whenever you’re ready to start again.'
        : 'Okay, I’ve ended this conversation. Thank you for visiting MindSuite. Ask me anything whenever you’re ready to start again.';
    const vars = { name: person?.name || '' };
    setMessages((list) => [
      ...list,
      { id: nextId++, who: 'visitor', text: said },
      { id: nextId++, who: 'guide', text: bye, vars, ended: true },
    ]);
    setTimeout(() => {
      finishRef.current('said stop');
      history.current = []; // the next question is a new conversation for the AI
    }, 0);
    if (voiceRepliesRef.current) speak(live.current.t(bye, vars), live.current.lang);
  }

  /**
   * Reads a reply aloud (the guide's words, then the names of the offerings it suggests), and in
   * a voice conversation listens again once it has finished speaking.
   */
  function sayReply(message, vars, suggestions = [], { always = false, intro = '', outro = null } = {}) {
    const { t: tr, lang: language } = live.current;
    const next = () => {
      setPhase('');
      setReplayingId(null);
      listenTurn();
    };
    if (!voiceRepliesRef.current && !always) return next();
    const names = suggestions.map((s) => offeringById.get(s.id)?.name).filter(Boolean);
    const text = [
      intro && tr(intro),
      tr(message, vars),
      names.length ? tr('Suggested offerings: {names}.', { names: names.join(', ') }) : '',
      outro && tr(outro.text, outro.vars),
    ]
      .filter(Boolean)
      .join(' ');
    if (talkingRef.current) setPhase('speaking');
    if (!speak(text, language, { onEnd: next })) {
      setVoiceNote('This device has no voice for this language, so replies are shown in writing only.');
      next();
    }
  }

  /**
   * Reads an earlier answer again and shows it in the conversation. `step` is 0 to repeat the
   * answer last read out, or 1 to go back one answer ("rewind"); a message id plays that one.
   */
  function replay(step, id = null) {
    const answers = messagesRef.current.filter((m) => m.who === 'guide' && m.text !== THINKING);
    if (!answers.length) return;
    let index;
    if (id !== null) index = answers.findIndex((m) => m.id === id);
    else {
      const current = replayAt.current ?? answers.length - 1;
      index = replayAt.current === null ? answers.length - 1 - step : current - step;
    }
    let intro = id === null && step > 0 ? 'Going back one answer.' : '';
    if (index < 0) {
      index = 0;
      intro = 'That was the first answer. Here it is again.';
    }
    const m = answers[index];
    replayAt.current = index;
    setReplayingId(m.id);
    requestAnimationFrame(() =>
      logRef.current?.querySelector(`[data-message="${m.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    );
    if (recogniser.current) {
      const r = recogniser.current;
      recogniser.current = null;
      r.abort();
    }
    stopSpeaking();
    if (talkingRef.current) setPhase('speaking');
    sayReply(m.text, m.vars, m.suggestions, { always: true, intro });
  }

  /** Stops the guide mid-reply so the visitor can speak straight away. */
  function interrupt() {
    stopSpeaking();
    setPhase('');
    listenTurn();
  }

  /** Takes the visitor to a part of the site they asked for by name. */
  function goTo(target) {
    if (target.id === 'scroll:down' || target.id === 'scroll:up') {
      window.scrollBy({ top: (target.id === 'scroll:down' ? 1 : -1) * innerHeight * 0.75, behavior: 'smooth' });
      return;
    }
    dispatchEvent(new CustomEvent('mindsuite:go', { detail: target.id }));
  }

  // The first time the guide is opened in a session it says hello aloud (opening it is a click,
  // which is what lets the browser speak). Later openings just show the conversation.
  useEffect(() => {
    if (!open || !canSpeak) return;
    try {
      if (sessionStorage.getItem(GREETED_KEY)) return;
      sessionStorage.setItem(GREETED_KEY, '1');
    } catch {}
    const greeting = messagesRef.current.find((m) => m.greeting);
    const question = needsDetails ? [...messagesRef.current].reverse().find((m) => m.intake && m.who === 'guide') : null;
    const { t: tr, lang: language } = live.current;
    if (greeting) {
      speak([tr(greeting.text), question ? tr(question.text, question.vars) : ''].filter(Boolean).join(' '), language);
    }
  }, [open]);

  /** The question the guide asks to fill in one of the visitor's details. */
  function intakeQuestion(step, state) {
    if (step === 'email') return [INTAKE_QUESTIONS.email, { name: state.name }];
    if (step === 'phone') {
      let country = state.country;
      try {
        country = new Intl.DisplayNames([live.current.lang], { type: 'region' }).of(state.country) || country;
      } catch {}
      return [INTAKE_QUESTIONS.phone, { email: state.email, country }];
    }
    return [INTAKE_QUESTIONS.name];
  }

  /** Asks again for one detail (the visitor clicked it in the details card to correct it). */
  function reaskDetail(step) {
    stopSpeaking();
    const next = { ...intakeRef.current, step };
    setIntake(next);
    const text = INTAKE_CORRECT[step];
    setMessages((list) => [...list, { id: nextId++, who: 'guide', text, intake: true }]);
    sayReply(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  /**
   * The visitor answered while their details are being collected: understand the answer (typed
   * or spoken), fill in that detail and ask for the next, until all three are known.
   */
  function answerIntake(text, skip = isSkip(text)) {
    const state = intakeRef.current;
    let reply;
    let vars;
    if (skip) {
      saveVisitor({ skipped: true });
      pendingEmail.current = null;
      reply = INTAKE_SKIPPED;
    } else {
      const next = { ...state };
      if (state.step === 'name') next.name = extractName(text);
      else if (state.step === 'email') next.email = extractEmail(text);
      else {
        const phone = extractPhone(text, state.country);
        next.phone = phone.valid ? phone.international : '';
        if (phone.valid) next.country = phone.country || state.country;
      }
      if (!next[state.step]) {
        reply = INTAKE_RETRY[state.step];
      } else {
        next.step = INTAKE_STEPS.find((k) => !next[k]) || null;
        if (next.step) [reply, vars] = intakeQuestion(next.step, next);
        else {
          saveVisitor({ name: next.name, email: next.email, phone: next.phone });
          reply = pendingEmail.current ? EMAIL_SENDING : INTAKE_DONE;
          vars = { name: next.name, email: next.email, phone: next.phone };
        }
      }
      setIntake(next);
    }
    setMessages((list) => [
      ...list,
      { id: nextId++, who: 'visitor', text, intake: true },
      { id: nextId++, who: 'guide', text: reply, vars, intake: true },
    ]);
    // Details complete and the visitor had asked for offerings by email: send them now.
    if (reply === EMAIL_SENDING) {
      const ids = pendingEmail.current;
      pendingEmail.current = null;
      return emailOfferings(ids);
    }
    sayReply(reply, vars);
  }

  /** Emails the details of these offerings to the visitor, and says how it went. */
  async function emailOfferings(ids) {
    const pendingId = nextId++;
    setMessages((list) => [...list, { id: pendingId, who: 'guide', text: 'Sending the email…' }]);
    busyRef.current = true;
    setBusy(true);
    if (talkingRef.current) setPhase('thinking');
    const result = await sendOfferingEmail({ visitor: visitorRef.current, offeringIds: ids });
    busyRef.current = false;
    setBusy(false);
    const names = ids.map((id) => offeringById.get(id)?.name).filter(Boolean).join(', ');
    const text = result.ok ? EMAIL_SENT : EMAIL_FAILED[result.code] || EMAIL_FAILED.send_failed;
    const vars = result.ok ? { names, email: result.to } : undefined;
    update(pendingId, { text, vars, suggestions: result.ok ? ids.map((id) => ({ id })) : [] });
    // What the AI sees of this later leaves out the visitor's address.
    history.current.push({
      role: 'assistant',
      content: result.ok ? `I emailed the details of ${names} to the address the visitor shared.` : live.current.t(text),
    });
    sayReply(text, vars);
  }

  /**
   * The visitor asked for offerings by email but hasn't shared their details: the guide asks for
   * them, then sends. Returns the question it asks, to be read out after the current reply.
   */
  function askDetailsToEmail(ids) {
    pendingEmail.current = ids;
    try {
      sessionStorage.removeItem(VISITOR_KEY);
    } catch {}
    visitorRef.current = null;
    needsDetailsRef.current = true;
    setVisitor(null);
    const state = { ...intakeRef.current, step: INTAKE_STEPS.find((k) => !intakeRef.current[k]) || 'email' };
    setIntake(state);
    const [text, vars] = state.step === 'name' ? [EMAIL_ASK_NAME] : intakeQuestion(state.step, state);
    setMessages((list) => [...list, { id: nextId++, who: 'guide', text, vars, intake: true }]);
    return { text, vars };
  }

  /** The visitor's details for the server, when they shared them. */
  const sharedVisitor = () => {
    const v = visitorRef.current;
    return v && !v.skipped ? { name: v.name, email: v.email } : null;
  };

  /** The offerings the guide suggested most recently ("send me these"). */
  const lastSuggested = () =>
    ([...messagesRef.current].reverse().find((m) => m.suggestions?.length)?.suggestions || []).map((s) => s.id).slice(0, 3);

  /**
   * The visitor has finished (said "stop", ended voice, closed the guide, started a new
   * conversation or left the page): email the conversation to the team, if there is anything
   * new since the last time and the visitor shared their details.
   */
  function finishConversation(reason) {
    const list = messagesRef.current;
    const person = visitorRef.current;
    if (!person || person.skipped) return;
    if (!list.slice(sentUpTo.current).some((m) => m.who === 'visitor')) return;
    sentUpTo.current = list.length;
    sendConversation({ visitor: person, messages: list, t: live.current.t, lang: live.current.lang, reason });
  }
  const finishRef = useRef(finishConversation);
  finishRef.current = finishConversation;

  // Closing the guide ends the conversation for now; so does leaving or closing the page.
  useEffect(() => {
    if (!open) finishRef.current('closed the guide');
  }, [open]);
  useEffect(() => {
    const onLeave = () => finishRef.current('left the page');
    addEventListener('pagehide', onLeave);
    return () => removeEventListener('pagehide', onLeave);
  }, []);

  const saveVisitor = (details) => {
    try {
      sessionStorage.setItem(VISITOR_KEY, JSON.stringify(details));
    } catch {}
    visitorRef.current = details; // used straight away, before the next render
    needsDetailsRef.current = false;
    setVisitor(details);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const toggle = (value) => {
    setOpen(value);
    requestAnimationFrame(() => (value ? inputRef.current : petRef.current)?.focus());
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, left: pos.x, top: pos.y };
    moved.current = false;
    petRef.current.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved.current = true;
    if (moved.current) place({ x: d.left + dx, y: d.top + dy });
  };
  const finishDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    // On phones, snap to the nearest edge after a drag.
    const x =
      innerWidth <= 600 && moved.current ? (pos.x < innerWidth / 2 ? 12 : innerWidth - 76) : pos.x;
    place({ x, y: pos.y }, true);
  };
  const onKeyDown = (e) => {
    const steps = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    place({ x: pos.x + step[0], y: pos.y + step[1] }, true);
  };

  const update = (id, patch) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function ask(text) {
    const trimmed = text.slice(0, 2000);
    if (busyRef.current || !trimmed.trim()) return;
    // A typed question during a voice conversation: stop listening while it is answered.
    if (recogniser.current) {
      const r = recogniser.current;
      recogniser.current = null;
      r.abort();
    }
    stopSpeaking();
    setInput('');

    // "Say that again" / "rewind": read an earlier answer again instead of asking.
    const command = normalize(trimmed).trim();
    if (REPEAT_PHRASES.has(command) || REWIND_PHRASES.has(command)) {
      replay(REWIND_PHRASES.has(command) ? 1 : 0);
      return;
    }
    replayAt.current = null; // a new question: rewinding starts again from its answer

    // "Stop this conversation": end it. (While details are being asked, "no thanks" means skip.)
    if (isStopRequest(trimmed) && !(needsDetailsRef.current && isSkip(trimmed))) return endConversation(trimmed);

    // Still collecting the visitor's name, email and phone: this is their answer.
    if (needsDetailsRef.current) return answerIntake(trimmed);

    // "Send me the details of …" without AI: the guide does it here. (The AI guide decides
    // for itself, with its email tool on the server.)
    const emailRequest = REMOTE_URL && aiReady.current ? null : offeringEmailRequest(trimmed);
    if (emailRequest) {
      const ids = emailRequest.ids.length ? emailRequest.ids : lastSuggested();
      setMessages((list) => [...list, { id: nextId++, who: 'visitor', text: trimmed }]);
      if (!ids.length || !OFFERING_EMAIL_URL) {
        const text = ids.length ? EMAIL_FAILED.unavailable : EMAIL_WHICH;
        setMessages((list) => [...list, { id: nextId++, who: 'guide', text }]);
        return sayReply(text);
      }
      if (sharedVisitor()) return emailOfferings(ids);
      const question = askDetailsToEmail(ids);
      return sayReply(question.text, question.vars);
    }

    // "Take me to Cloud Native Security": go there instead of searching.
    const target = navigationTarget(trimmed);
    if (target) {
      const message =
        target.id === 'scroll:down' ? 'Scrolling down.' : target.id === 'scroll:up' ? 'Scrolling up.' : 'Opening {name}.';
      const vars = { name: live.current.t(target.label) };
      setMessages((list) => [
        ...list,
        { id: nextId++, who: 'visitor', text: trimmed },
        { id: nextId++, who: 'guide', text: message, vars },
      ]);
      goTo(target);
      history.current.push({ role: 'user', content: trimmed }, { role: 'assistant', content: live.current.t(message, vars) });
      sayReply(message, vars);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    if (talkingRef.current) setPhase('thinking');
    const pendingId = nextId++;
    setMessages((list) => [
      ...list,
      { id: nextId++, who: 'visitor', text: trimmed },
      { id: pendingId, who: 'guide', text: 'Finding relevant offerings...' },
    ]);
    let reply;
    try {
      let result;
      if (REMOTE_URL && aiReady.current) {
        try {
          const response = await fetch(REMOTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...history.current, { role: 'user', content: trimmed }].slice(-11),
              // Lets the guide email offering details to the visitor when asked (never sent to the AI).
              visitor: sharedVisitor(),
            }),
            signal: AbortSignal.timeout(45000),
          });
          result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Please try again.');
        } catch (error) {
          // Keep helping: answer from the catalogue and say why.
          result = {
            ...localAssistantReply(trimmed),
            notice:
              error.name === 'TimeoutError'
                ? 'The AI guide took too long, so these are catalogue matches.'
                : 'These are catalogue matches for now.',
          };
        }
      } else {
        result = localAssistantReply(trimmed);
      }
      const suggestions = (result.suggestions || []).filter((s) => offeringById.has(s.id));
      update(pendingId, {
        text: result.message,
        vars: result.vars,
        notice: result.notice,
        suggestions,
      });
      history.current.push({ role: 'user', content: trimmed }, { role: 'assistant', content: live.current.t(result.message, result.vars) });
      reply = [result.message, result.vars, suggestions];
      // The AI guide wanted to email offerings but has no address yet: ask for the details.
      if (result.action?.type === 'needs_email' && CONVERSATION_URL) {
        reply.push({ outro: askDetailsToEmail(result.action.offeringIds) });
      }
      if (history.current.length > 10) history.current.splice(0, history.current.length - 10);
    } catch (error) {
      const text =
        error.name === 'TimeoutError'
          ? 'I could not complete that request. The response took too long.'
          : 'I could not complete that request. Please try again or use catalogue search.';
      update(pendingId, { text, retry: trimmed });
      reply = [text];
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    sayReply(...reply);
  }

  const reset = () => {
    finishConversation('started a new conversation');
    sentUpTo.current = 0;
    stopSpeaking();
    if (talkingRef.current) {
      setPhase('');
      listenTurn();
    }
    history.current = [];
    const welcome = firstMessages(aiReady.current, false);
    if (needsDetails) {
      const state = { ...intakeRef.current, step: INTAKE_STEPS.find((k) => !intakeRef.current[k]) };
      setIntake(state);
      const [text, vars] = intakeQuestion(state.step, state);
      welcome.push({ id: nextId++, who: 'guide', text, vars, intake: true });
    }
    setMessages(welcome);
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="assistant-pet"
        ref={petRef}
        style={{ left: pos.x, top: pos.y }}
        aria-label={t('MindSuite guide. Drag to move, or use arrow keys. Click to chat.')}
        aria-expanded={open}
        aria-controls="offering-assistant"
        title={t('Drag to move. Click to chat.')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          toggle(!open);
        }}
      >
        <span className="assistant-face" aria-hidden="true" />
        <span className="assistant-pet-label" aria-hidden="true">
          {t('Help me choose')}
        </span>
      </button>

      <section
        id="offering-assistant"
        role="dialog"
        aria-modal="false"
        aria-labelledby="assistant-title"
        hidden={!open}
        style={panelBox || undefined}
        onKeyDown={(e) => e.key === 'Escape' && toggle(false)}
      >
        <header className="assistant-header">
          <div>
            <h2 id="assistant-title">{t('MindSuite guide')}</h2>
            <span className="assistant-mode">{t(mode)}</span>
          </div>
          <button type="button" className="assistant-minimize" aria-label={t('Minimize assistant')} onClick={() => toggle(false)}>
            &#8722;
          </button>
        </header>
        <div className="assistant-toolbar">
          <button type="button" className="assistant-reset" disabled={busy} onClick={reset}>
            {t('New conversation')}
          </button>
          <button
            type="button"
            className="assistant-position-reset"
            aria-label={t('Reset position')}
            title={t('Reset position')}
            onClick={() => place({ x: innerWidth - 88, y: innerHeight - 160 }, true)}
          >
            <LocateFixed aria-hidden="true" />
          </button>
          <button
            type="button"
            className="assistant-download"
            disabled={busy || messages.length < 2}
            title={t('Save this conversation as a web page')}
            onClick={() => downloadConversation(messages, { t, lang, visitor: visitor?.skipped ? null : visitor })}
          >
            <Download aria-hidden="true" />
            {t('Download')}
          </button>
          {canSpeak && (
            <button
              type="button"
              className="assistant-voice-toggle"
              aria-pressed={voiceReplies}
              onClick={() => {
                if (voiceReplies) stopSpeaking();
                setVoiceReplies(!voiceReplies);
              }}
            >
              {voiceReplies ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              {voiceReplies ? t('Voice replies on') : t('Voice replies off')}
            </button>
          )}
        </div>
        <div className="assistant-messages" role="log" aria-live="polite" aria-label={t('Conversation')} ref={logRef}>
          {messages.map((m) => (
            <div
              key={m.id}
              data-message={m.id}
              className={`assistant-message ${m.who}${replayingId === m.id ? ' is-replaying' : ''}`}
            >
              <small>
                {m.who === 'visitor' ? t('You') : t('MindSuite guide')}
                {m.who === 'guide' && canSpeak && m.text !== THINKING && (
                  <button
                    type="button"
                    className="assistant-replay"
                    aria-label={t('Play this answer again')}
                    title={t('Play this answer again')}
                    onClick={() => replay(0, m.id)}
                  >
                    <RotateCcw aria-hidden="true" />
                    {t('Replay')}
                  </button>
                )}
              </small>
              {/* Guide messages may be interface strings (translated here) or AI replies (shown as written). */}
              <p>{m.who === 'visitor' ? m.text : t(m.text, m.vars)}</p>
              {m.notice && <p className="assistant-notice">{t(m.notice)}</p>}
              {m.suggestions?.map((s) => {
                const o = offeringById.get(s.id);
                const added = interests.has(o.id);
                return (
                  <div className="assistant-offering" key={o.id}>
                    <strong>
                      <Icon name={o.icon} />
                      {o.name}
                    </strong>
                    <p>{s.reason || o.definition}</p>
                    <div className="assistant-card-actions">
                      <button type="button" disabled={added} onClick={() => onAdd(o.id)}>
                        <Icon name={added ? 'Check' : 'Plus'} />
                        {added ? t('Added to enquiry') : t('Add to my enquiry')}
                      </button>
                      <a
                        href={`#${o.id}`}
                        onClick={() => {
                          toggle(false);
                          focusTarget(o.id);
                        }}
                      >
                        {t('View details')}
                      </a>
                    </div>
                  </div>
                );
              })}
              {m.retry && !busy && (
                <button
                  type="button"
                  className="assistant-retry"
                  onClick={() => {
                    setMessages((list) => list.filter((x) => x.id !== m.id));
                    ask(m.retry);
                  }}
                >
                  {t('Try again')}
                </button>
              )}
            </div>
          ))}
        </div>
        {needsDetails ? (
          <div className="guide-intake" role="group" aria-label={t('Your details')}>
            <div className="guide-intake-fields">
              {INTAKE_STEPS.map((key) => {
                const value = intake[key];
                const current = intake.step === key;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`guide-intake-field${value ? ' is-filled' : ''}${current ? ' is-current' : ''}`}
                    disabled={busy || current || (!value && !current)}
                    title={value ? `${value} · ${t('Change this')}` : undefined}
                    onClick={() => reaskDetail(key)}
                  >
                    <span className="guide-intake-label">
                      {value ? <Check aria-hidden="true" /> : <span className="guide-intake-dot" aria-hidden="true" />}
                      {t(INTAKE_LABELS[key])}
                    </span>
                    <span className="guide-intake-value" dir={key === 'name' ? undefined : 'ltr'}>
                      {value || (current ? t('Asking…') : '—')}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="guide-intake-note">
              {t('When you finish, this conversation and your details are emailed to the MindSuite team.')}{' '}
              <a href="#/privacy">{t('Privacy and Cookies')}</a>
              {' · '}
              <button type="button" className="guide-intake-skip" onClick={() => answerIntake(t('Continue without sharing'), true)}>
                {t('Continue without sharing')}
              </button>
            </p>
          </div>
        ) : (
        <div className="assistant-prompts">
          {PROMPTS.map(([label, prompt]) => (
            <button type="button" key={label} onClick={() => ask(t(prompt))}>
              {t(label)}
            </button>
          ))}
        </div>
        )}
        <form
          className="assistant-input"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <textarea
            ref={inputRef}
            aria-label={needsDetails ? t(INTAKE_PLACEHOLDERS[intake.step]) : t('Describe your business need')}
            maxLength={2000}
            placeholder={
              listening
                ? t('Listening… speak now')
                : needsDetails
                  ? t(INTAKE_PLACEHOLDERS[intake.step])
                  : t('What would you like to improve?')
            }
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask(input);
              }
            }}
          />
          {canListen && (
            <button
              type="button"
              className={`assistant-mic${talking ? ' is-talking' : ''}${listening ? ' is-listening' : ''}`}
              aria-pressed={talking}
              aria-label={talking ? t('End voice conversation') : t('Talk to the guide')}
              title={talking ? t('End voice conversation') : t('Talk to the guide')}
              onClick={() => {
                if (!talking) return startTalking();
                stopTalking();
                finishConversation('ended voice conversation');
              }}
            >
              {talking ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
            </button>
          )}
          <button type="submit" disabled={busy}>
            {t('Send')}
          </button>
        </form>
        {talking && (
          <div className={`assistant-voice-status is-${phase || 'waiting'}`} role="status">
            <span className="assistant-voice-dot" aria-hidden="true" />
            <span>
              {phase === 'speaking'
                ? t('Speaking… I’ll listen again when I finish.')
                : phase === 'thinking'
                  ? t('Thinking…')
                  : t('Listening… pause when you’re done. Say “stop” to end.')}
            </span>
            {phase === 'speaking' && (
              <button type="button" onClick={interrupt}>
                {t('Skip and talk')}
              </button>
            )}
          </div>
        )}
        {voiceNote && (
          <p className="assistant-voice-note" role="status">
            {t(voiceNote)}
          </p>
        )}
        <p className="assistant-disclosure">{t(disclosure)}</p>
      </section>
    </>
  );
}
