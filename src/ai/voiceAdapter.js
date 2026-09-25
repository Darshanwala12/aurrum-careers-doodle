/**
 * Voice/avatar adapter seam.
 *
 * The character's mouth, expressions and gestures are driven by three events:
 * onStart, onBoundary (each spoken word) and onEnd. The default adapter below
 * uses the browser's built-in speech synthesis, which needs no credentials.
 *
 * To use a hosted real-time avatar/voice vendor (HeyGen LiveAvatar, Tavus,
 * Synthesia Interactive, bitHuman, …), write an adapter with the same shape
 * using that vendor's official SDK and pass it to useAiCharacter({ voice }).
 * Nothing else in the UI needs to change.
 *
 *   speak(text, { onStart, onBoundary, onEnd }) -> void
 *   stop() -> void
 */
/**
 * Live speech events for anything that animates to the voice (the 3D
 * avatar's lip-sync): 'start' {text}, 'boundary' {text, charIndex}, 'end'.
 */
export const speechEvents = new EventTarget();
const emit = (type, detail) => speechEvents.dispatchEvent(new CustomEvent(type, { detail }));

export function createBrowserVoice() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  let voice = null;

  // Elena is a woman: prefer known female voices (Windows, Edge neural,
  // Chrome, macOS/iOS names), UK English first, and never fall back to a
  // voice known to be male.
  const FEMALE = /female|woman|libby|sonia|maisie|hazel|susan|mia|kate|serena|stephanie|fiona|moira|tessa|karen|samantha|victoria|zira|aria|jenny|michelle|emma|ava|allison|natasha|clara|catherine|google uk english female|google us english/i;
  const MALE = /\bmale\b|george|ryan|thomas|oliver|guy|david|mark|james|daniel|fred|alex|arthur|christopher|eric|roger|steffan|william|google uk english male/i;
  const pickVoice = () => {
    const voices = (synth?.getVoices() ?? []).filter((v) => /^en/i.test(v.lang));
    const female = voices.filter((v) => FEMALE.test(v.name) && !/\bmale\b/i.test(v.name.replace(/female/i, '')));
    const notMale = voices.filter((v) => !MALE.test(v.name.replace(/female/i, '')));
    const rank = (list) =>
      list.find((v) => /en-GB/i.test(v.lang) && /natural|online|neural/i.test(v.name)) ??
      list.find((v) => /en-GB/i.test(v.lang)) ??
      list.find((v) => /natural|online|neural/i.test(v.name)) ??
      list[0];
    voice = rank(female) ?? rank(notMale) ?? null;
  };
  if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  }

  const trySpeak = (text, cbs) => {
    const { onStart, onBoundary, onEnd } = cbs;
    synth.cancel();
    if (!voice) pickVoice(); // voices can load after the first call
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = 1;
    // No female voice installed at all: raise the pitch so the default
    // voice at least doesn't sound like a man.
    u.pitch = voice && FEMALE.test(voice.name) ? 1.05 : 1.35;
    let started = false;
    u.onstart = () => { started = true; emit('start', { text }); onStart?.(); };
    u.onboundary = (e) => {
      if (e.name !== 'word' && e.name !== undefined) return;
      emit('boundary', { text, charIndex: e.charIndex });
      onBoundary?.(e.charIndex);
    };
    u.onend = () => { emit('end', { text }); onEnd?.(); };
    u.onerror = (e) => {
      // Some browsers (notably page-load-time calls, before any user
      // gesture) silently refuse the very first utterance ('not-allowed' /
      // 'interrupted') instead of firing onstart. Retry once on the visitor's
      // first tap/click/key anywhere on the page, so the intro greeting is
      // never permanently lost to that autoplay restriction.
      if (!started && e.error !== 'canceled' && e.error !== 'interrupted') {
        const retry = () => trySpeak(text, cbs);
        document.addEventListener('pointerdown', retry, { once: true });
        document.addEventListener('keydown', retry, { once: true });
      }
      emit('end', { text }); onEnd?.();
    };
    synth.speak(u);
  };

  return {
    supported: Boolean(synth),
    speak(text, { onStart, onBoundary, onEnd } = {}) {
      if (!synth) { onEnd?.(); return; }
      trySpeak(text, { onStart, onBoundary, onEnd });
    },
    stop() { synth?.cancel(); emit('end', {}); },
  };
}
