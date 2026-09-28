import { useEffect, useState } from 'react';
import { VOICE_PROFILES, createVoice, getVoiceSettings, saveVoiceSettings } from './voiceAdapter.js';

const SAMPLE = 'Hello, I am Zenz. Let us make your next career move feel clear and achievable.';
const LANGUAGES = [['en-GB', 'English (UK)'], ['en-US', 'English (US)'], ['en-IN', 'English (India)']];

export default function VoiceControlPanel({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(getVoiceSettings);
  const [voices, setVoices] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const [uploadName, setUploadName] = useState('');
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return undefined;
    const sync = () => setVoices(synth.getVoices());
    sync(); synth.addEventListener?.('voiceschanged', sync);
    return () => synth.removeEventListener?.('voiceschanged', sync);
  }, []);
  const update = (next) => { const saved = saveVoiceSettings(next); setSettings(saved); onSettingsChange?.(saved); };
  const chooseProfile = (profile) => update({ profile, rate: VOICE_PROFILES[profile].rate, pitch: VOICE_PROFILES[profile].pitch });
  const preview = () => createVoice().speak(SAMPLE);
  const selectedVoices = voices.filter(v => v.lang.toLowerCase().startsWith(settings.language.slice(0, 2).toLowerCase()));
  return <section className="zenz-voice-panel" aria-label="Zenz voice controls">
    <header><div><span>ZENZ VOICE LIBRARY</span><h3>Make Zenz sound like your guide.</h3></div><button type="button" onClick={onClose} aria-label="Close voice controls">×</button></header>
    <div className="zenz-voice-panel__profiles">
      {Object.entries(VOICE_PROFILES).map(([id, voice]) => <button key={id} type="button" className={settings.profile === id ? 'is-selected' : ''} onClick={() => chooseProfile(id)}>{voice.label}</button>)}
    </div>
    <label>Available voice<select value={settings.voiceId} onChange={e => update({ voiceId: e.target.value })}><option value="">Auto-select best available</option>{selectedVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}</select></label>
    <div className="zenz-voice-panel__sliders">
      <label>Volume <input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e => update({ volume: +e.target.value })} /></label>
      <label>Speed <input type="range" min="0.75" max="1.25" step="0.05" value={settings.rate} onChange={e => update({ rate: +e.target.value })} /></label>
      <label>Pitch <input type="range" min="0.8" max="1.25" step="0.05" value={settings.pitch} onChange={e => update({ pitch: +e.target.value })} /></label>
    </div>
    <label>Language<select value={settings.language} onChange={e => update({ language: e.target.value, voiceId: '' })}>{LANGUAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label>Greeting name<input value={settings.greetingName} maxLength="32" onChange={e => update({ greetingName: e.target.value.replace(/[^\p{L}\s'-]/gu, '') })} placeholder="Optional" /></label>
    <div className="zenz-voice-panel__preview"><button type="button" onClick={preview}>▶ Preview voice</button><span>Controls apply to introductions, guidance, CVs, applications, LinkedIn, interviews, encouragement and trial CTAs.</span></div>
    <div className="zenz-voice-panel__upload"><strong>Authorized Zenz voice</strong><label><input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} /> I confirm I have rights and permission to use this voice.</label><input type="file" accept="audio/*" disabled={!authorized} onChange={e => setUploadName(e.target.files?.[0]?.name || '')} /><small>{uploadName ? `${uploadName} is available for local preview.` : 'Custom synthesis remains disabled until an authorized server-side TTS provider is configured.'}</small></div>
  </section>;
}
