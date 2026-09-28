import { VISEMES } from '../avatar/character/config.js';
export const speechEvents = new EventTarget();
let activeSpeech = null, owner = null, activeStop = null;
export const VOICE_SETTINGS_KEY = 'zenz-voice-settings-v1';
export const DEFAULT_VOICE_SETTINGS = { profile: 'warm', voiceId: '', volume: 0.9, rate: 1, pitch: 1.04, language: 'en-GB', greetingName: '' };
export const VOICE_PROFILES = {
  professional: { label: 'Professional', rate: 0.96, pitch: 0.98 },
  warm: { label: 'Warm', rate: 0.98, pitch: 1.04 },
  friendly: { label: 'Friendly', rate: 1.02, pitch: 1.08 },
  energetic: { label: 'Energetic', rate: 1.1, pitch: 1.12 },
  calm: { label: 'Calm', rate: 0.9, pitch: 0.96 },
};
export const getVoiceSettings = () => {
  try { return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(localStorage.getItem(VOICE_SETTINGS_KEY) || '{}') }; } catch { return { ...DEFAULT_VOICE_SETTINGS }; }
};
export const saveVoiceSettings = (next) => {
  const value = { ...getVoiceSettings(), ...next };
  try { localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(value)); } catch { /* private browsing can decline storage */ }
  return value;
};
export const getActiveSpeech = () => activeSpeech;
const emit = (type, detail = {}) => {
  if (type === 'start') activeSpeech = detail;
  if (type === 'end') activeSpeech = null;
  speechEvents.dispatchEvent(new CustomEvent(type, { detail }));
};
export function createBrowserVoice() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const id = {}; let generation = 0, utterance = null;
  const stop = () => {
    generation++;
    if (owner === id) { owner = null; activeStop = null; synth?.cancel(); emit('end'); }
    utterance = null;
  };
  return {
    supported: Boolean(synth), stop,
    speak(text, { onStart, onBoundary, onEnd } = {}) {
      stop(); if (!synth) { onEnd?.(); return; }
      activeStop?.(); synth.cancel(); emit('end'); owner = id; activeStop = stop;
      const token = generation, live = () => generation === token && owner === id;
      const settings = getVoiceSettings();
      const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith(settings.language.slice(0, 2).toLowerCase()));
      const female = /female|libby|sonia|hazel|susan|kate|serena|fiona|moira|karen|samantha|zira|aria|jenny|emma|google uk english female/i;
      const preferred = voices.filter(v => female.test(v.name));
      const voice = voices.find(v => v.voiceURI === settings.voiceId) ?? preferred.find(v => new RegExp(settings.language, 'i').test(v.lang)) ?? preferred[0] ?? voices[0];
      const u = new SpeechSynthesisUtterance(text); utterance = u;
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? settings.language; u.volume = settings.volume; u.rate = settings.rate; u.pitch = settings.pitch;
      u.onstart = () => { if (live()) { emit('start', { text }); onStart?.(); } };
      u.onboundary = e => {
        if (live() && (!e.name || e.name === 'word')) { emit('boundary', { text, charIndex: e.charIndex }); onBoundary?.(e.charIndex); }
      };
      const finish = () => {
        if (!live()) return;
        owner = null; activeStop = null; utterance = null; emit('end'); onEnd?.();
      };
      u.onend = finish; u.onerror = finish;
      synth.speak(utterance);
    },
  };
}
/** POST {text} -> {audioUrl, visemes:[{start,end,value}], words:[{start,charIndex}]}
 * Times are seconds on the audio clock. No client-side credentials.
 */
export function createAudioVoice(endpoint, fallback = createBrowserVoice()) {
  const id = {};
  let generation = 0, abort, audio, frame;
  const stop = () => {
    generation++; abort?.abort(); cancelAnimationFrame(frame);
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; }
    if (owner === id) { owner = null; activeStop = null; emit('end'); }
    fallback.stop();
  };
  return {
    supported: true, stop,
    async speak(text, callbacks = {}) {
      stop(); activeStop?.(); owner = id; activeStop = stop;
      const token = generation; abort = new AbortController();
      const live = () => token === generation;
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: getVoiceSettings() }), signal: abort.signal });
        if (!response.ok) throw new Error('TTS unavailable');
        const data = await response.json(); if (!live()) return;
        if (typeof data.audioUrl !== 'string') throw new Error('Missing audio URL');
        const url = new URL(data.audioUrl, window.location.href);
        if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('TTS audio must be same-origin');
        const visemes = (Array.isArray(data.visemes) ? data.visemes : []).filter(v => VISEMES.includes(v.value) && Number.isFinite(v.start) && Number.isFinite(v.end) && v.start >= 0 && v.end > v.start).sort((a, b) => a.start - b.start);
        if (!visemes.length) throw new Error('TTS requires viseme timings');
        const words = (Array.isArray(data.words) ? data.words : []).filter(w => Number.isFinite(w.start) && Number.isInteger(w.charIndex) && w.charIndex >= 0 && w.charIndex < text.length).sort((a, b) => a.start - b.start);
        audio = new Audio(url.href); const current = audio; let word = 0, started = false, finished = false;
        const finish = () => { if (live() && !finished) { finished = true; cancelAnimationFrame(frame); if (owner === id) { owner = null; activeStop = null; emit('end'); } callbacks.onEnd?.(); } };
        current.onended = finish; current.onerror = finish;
        current.onplaying = () => { if (live() && !started) { started = true; emit('start', { text, audio: current, visemes }); callbacks.onStart?.(); } };
        await current.play(); if (!live()) { current.pause(); return; }
        const tick = () => {
          if (!live() || current.ended || finished) return;
          while (word < words.length && current.currentTime >= words[word].start) callbacks.onBoundary?.(words[word++].charIndex);
          frame = requestAnimationFrame(tick);
        }; tick();
      } catch (error) { if (live() && error.name !== 'AbortError') { audio?.pause(); audio = null; fallback.speak(text, callbacks); } }
    },
  };
}
export function createVoice() {
  return import.meta.env.VITE_AURRUM_TTS_ENDPOINT ? createAudioVoice(import.meta.env.VITE_AURRUM_TTS_ENDPOINT) : createBrowserVoice();
}
