/**
 * Records the voice tour with an AI voice and saves it into the website.
 *
 *   npm run voice-tour               record every stop whose text changed, in every language
 *   npm run voice-tour -- --lang ar  one language only
 *   npm run voice-tour -- --force    record everything again (for example after changing voice)
 *
 * Output: public/voice-tour/<lang>/<stop>.mp3 and public/voice-tour/manifest.json. Commit
 * both; the files are served from the site itself, so visitors' browsers never contact the
 * voice service. Stops without a current recording are read by the visitor's device voice.
 *
 * Voice service, from .env (the first one configured is used):
 *   Azure AI Speech   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (for example centralindia)
 *                     voices: TOUR_VOICE_EN, TOUR_VOICE_AR, TOUR_VOICE_FR (optional)
 *   OpenAI            OPENAI_API_KEY; TOUR_OPENAI_VOICE (optional, default "coral")
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'voice-tour');
const manifestFile = join(outDir, 'manifest.json');
const { buildVoiceTour, VOICE_TOUR_LANGUAGES } = await import(pathToFileURL(join(root, 'src/data/voiceTour.js')).href);

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const env = process.env;

// ---------------------------------------------------------------- voice services
const AZURE_VOICES = { en: 'en-US-AvaMultilingualNeural', ar: 'ar-SA-ZariyahNeural', fr: 'fr-FR-DeniseNeural' };
const LOCALES = { en: 'en-US', ar: 'ar-SA', fr: 'fr-FR' };
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const services = {
  azure: {
    configured: () => env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION,
    voice: (lang) => env[`TOUR_VOICE_${lang.toUpperCase()}`] || AZURE_VOICES[lang],
    async speak(text, lang) {
      const voice = this.voice(lang);
      const ssml = `<speak version="1.0" xml:lang="${LOCALES[lang]}"><voice name="${xml(voice)}"><prosody rate="-3%">${xml(text)}</prosody></voice></speak>`;
      const res = await fetch(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'mindsuite-voice-tour',
        },
        body: ssml,
      });
      if (!res.ok) throw new Error(`Azure Speech ${res.status}: ${(await res.text()).slice(0, 200) || res.statusText}`);
      return Buffer.from(await res.arrayBuffer());
    },
  },
  openai: {
    configured: () => env.OPENAI_API_KEY,
    voice: () => env.TOUR_OPENAI_VOICE || 'coral',
    async speak(text, lang) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: this.voice(lang),
          input: text,
          instructions: `Speak in ${{ en: 'English', ar: 'Modern Standard Arabic', fr: 'French' }[lang]} as a warm, confident, professional narrator presenting a company's services. Calm pace, clear diction.`,
          response_format: 'mp3',
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return Buffer.from(await res.arrayBuffer());
    },
  },
};

// ---------------------------------------------------------------- recordings made by hand
// --script writes every stop's text and file name, to record in another tool (such as Runway).
// --import registers the MP3 files placed in public/voice-tour/<lang>/ as current.
if (args.includes('--script') || args.includes('--import')) {
  const readJsonEarly = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const cat = readJsonEarly('src/data/catalogue.json');
  const fams = (lang) => {
    const overlay = lang === 'en' ? null : readJsonEarly(`src/data/catalogue.${lang}.json`);
    return cat.map((f) => ({
      id: f.id,
      name: overlay?.families?.[f.id]?.name || f.name,
      tagline: overlay?.families?.[f.id]?.tagline || f.tagline,
      count: f.areas.reduce((n, a) => n + a.offerings.length, 0),
      areas: f.areas.map((a) => ({ id: a.id, name: overlay?.areas?.[a.id]?.name || a.name })),
    }));
  };
  const langs = onlyLang ? [onlyLang] : VOICE_TOUR_LANGUAGES;
  if (args.includes('--script')) {
    const names = { en: 'English', ar: 'Arabic', fr: 'French' };
    const lines = [
      '# Voice tour script',
      '',
      'Record each block as an MP3 and save it under the file name shown, in',
      '`public/voice-tour/<language>/`. Then run `npm run voice-tour -- --import`.',
      'Re-run `npm run voice-tour -- --script` after any catalogue change: the text may have changed.',
    ];
    for (const lang of langs) {
      lines.push('', `## ${names[lang] || lang}`);
      for (const stop of buildVoiceTour(lang, fams(lang)))
        lines.push('', `### public/voice-tour/${lang}/${stop.id}.mp3`, '', stop.text);
    }
    writeFileSync(join(root, 'voice-tour-script.md'), `${lines.join('\n')}\n`);
    console.log('Wrote voice-tour-script.md');
  } else {
    const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { files: {}, voices: {} };
    manifest.files ||= {};
    manifest.voices ||= {};
    let found = 0;
    const missing = [];
    for (const lang of langs) {
      manifest.files[lang] ||= {};
      for (const stop of buildVoiceTour(lang, fams(lang))) {
        if (existsSync(join(outDir, lang, `${stop.id}.mp3`))) {
          manifest.files[lang][stop.id] = stop.hash;
          manifest.voices[lang] = 'recorded by hand';
          found++;
        } else missing.push(`${lang}/${stop.id}.mp3`);
      }
    }
    mkdirSync(outDir, { recursive: true });
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Registered ${found} recordings.${missing.length ? ` Not found (device voice will read these): ${missing.join(', ')}` : ''}`);
  }
  process.exit(0);
}

const name = Object.keys(services).find((k) => services[k].configured());
if (!name) {
  console.error(
    'No voice service configured. Add to .env either\n' +
      '  AZURE_SPEECH_KEY=...  and  AZURE_SPEECH_REGION=...   (Azure AI Speech)\n' +
      'or\n' +
      '  OPENAI_API_KEY=...                                    (OpenAI)\n' +
      'then run: npm run voice-tour'
  );
  process.exit(1);
}
const service = services[name];

// ---------------------------------------------------------------- catalogue text per language
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const catalogue = readJson('src/data/catalogue.json');

/** Same rule as applyCatalogueLanguage() in src/data/catalogue.js: translation, else English. */
function familiesIn(lang) {
  const overlay = lang === 'en' ? null : readJson(`src/data/catalogue.${lang}.json`);
  return catalogue.map((f) => ({
    id: f.id,
    name: overlay?.families?.[f.id]?.name || f.name,
    tagline: overlay?.families?.[f.id]?.tagline || f.tagline,
    count: f.areas.reduce((n, a) => n + a.offerings.length, 0),
    areas: f.areas.map((a) => ({ id: a.id, name: overlay?.areas?.[a.id]?.name || a.name })),
  }));
}

// ---------------------------------------------------------------- record
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { files: {}, voices: {} };
manifest.files ||= {};
manifest.voices ||= {};

const langs = onlyLang ? [onlyLang] : VOICE_TOUR_LANGUAGES;
let recorded = 0;
let kept = 0;
for (const lang of langs) {
  if (!VOICE_TOUR_LANGUAGES.includes(lang)) throw new Error(`Unknown language "${lang}"`);
  const voice = `${name}:${service.voice(lang)}`;
  const voiceChanged = manifest.voices[lang] && manifest.voices[lang] !== voice;
  manifest.files[lang] ||= {};
  mkdirSync(join(outDir, lang), { recursive: true });
  for (const stop of buildVoiceTour(lang, familiesIn(lang))) {
    const file = join(outDir, lang, `${stop.id}.mp3`);
    if (!force && !voiceChanged && manifest.files[lang][stop.id] === stop.hash && existsSync(file)) {
      kept++;
      continue;
    }
    process.stdout.write(`  ${lang}/${stop.id}.mp3 … `);
    const audio = await service.speak(stop.text, lang);
    writeFileSync(file, audio);
    manifest.files[lang][stop.id] = stop.hash;
    recorded++;
    console.log(`${Math.round(audio.length / 1024)} KB`);
    // Saved after every file, so an interrupted run keeps what it has done.
    manifest.voices[lang] = voice;
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Voice tour: ${recorded} recorded, ${kept} unchanged (${name}). Files in public/voice-tour/.`);
