import { useEffect, useState } from 'react';
import CharacterCanvas from './CharacterCanvas.jsx';
import { ANIMATIONS, EMOTIONS } from './config.js';
import { createVoice } from '../../ai/voiceAdapter.js';
import './lab.css';
const views = [['Front', 0], ['Side', Math.PI / 2], ['Back', Math.PI], ['Three-quarter', -.65]];
export default function CharacterLab() {
  const [emotion, setEmotion] = useState('neutral'), [animation, setAnimation] = useState('idle');
  const [voice] = useState(createVoice);
  useEffect(() => () => voice.stop(), [voice]);
  const [halfBody, setHalfBody] = useState(false);
  const [failure, setFailure] = useState(false);
  return <main className="character-lab">
    <p>AURRUM / ORIGINAL CHARACTER DESIGN</p><h1>Meet Elena</h1>
    <p>One character. Four views. A navy suit, white blouse, plum bob and teal eyes.</p>
    <div className="character-lab__controls">
      <label>Emotion <select value={emotion} onChange={e => setEmotion(e.target.value)}>{Object.keys(EMOTIONS).map(e => <option key={e}>{e}</option>)}</select></label>
      <label>Animation <select value={animation} onChange={e => setAnimation(e.target.value)}>{ANIMATIONS.map(e => <option key={e}>{e}</option>)}</select></label>
      <label><input type="checkbox" checked={halfBody} onChange={e => setHalfBody(e.target.checked)} /> Half body</label>
      <label><input type="checkbox" checked={failure} onChange={e => setFailure(e.target.checked)} /> Simulate load failure</label>
      <button onClick={() => { setEmotion('encouraging'); setAnimation('explaining'); voice.speak('Your next step is closer than you think. Let us turn your experience into a career story you are proud to tell.', { onEnd: () => setAnimation('idle') }); }}>Test speech</button>
      <button onClick={() => { voice.stop(); setAnimation('idle'); }}>Stop speech</button>
      <a href="/avatars/elena-original.glb" download>Download GLB</a>
    </div>
    <div className="character-lab__views">{views.map(([label, view]) => <figure key={label}>
      <div><CharacterCanvas key={String(failure)} modelUrl={failure ? '/avatars/missing-character.glb' : undefined} character={{ emotion, animation }} halfBody={halfBody} view={view} /></div><figcaption>{label}</figcaption>
    </figure>)}</div>
    <p>53 bones · 13 morph targets · 10 animation clips · Original geometry and materials</p>
    <a href="/">Return to the website</a>
  </main>;
}
