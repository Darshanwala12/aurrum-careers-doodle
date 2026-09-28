import { useEffect, useRef, useState } from 'react';
import { useAiCharacter } from '../../ai/useAiCharacter.js';
import TaraAvatar from './TaraAvatar.jsx';
import './tara-demo.css';

const STARTERS = [
  ['Improve my CV', 'Can you help improve my CV?'],
  ['Find right roles', 'How do I find the right roles?'],
  ['Interview prep', 'How can I prepare for an interview?'],
  ['Change career', 'I want to change careers'],
];

function visualState(ai, response) {
  if (ai.status === 'thinking') return { emotion: 'thinking', action: 'thinking' };
  if (ai.status === 'listening') return { emotion: 'encouraging', action: 'idle' };
  if (ai.status === 'error') return { emotion: 'confused', action: 'idle' };
  const state = (ai.speaking ? ai.current : response)?.state ?? '';
  if (!state) return { emotion: 'neutral', action: 'idle' };
  if (/POINTING/.test(state)) return { emotion: 'encouraging', action: 'pointing' };
  if (/SUCCESS|CELEBRATING/.test(state)) return { emotion: 'excited', action: 'celebrating' };
  if (/ENCOURAGING|EMPATHETIC/.test(state)) return { emotion: 'encouraging', action: 'explaining' };
  if (/CONFIDENT/.test(state)) return { emotion: 'happy', action: 'explaining' };
  return { emotion: 'happy', action: 'talking' };
}

export default function TaraDemoPage() {
  const ai = useAiCharacter();
  const [draft, setDraft] = useState('');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [responseGesture, setResponseGesture] = useState(null);
  const inputRef = useRef(null);
  const visual = visualState(ai, responseGesture);
  const caption = ai.status === 'thinking' ? 'Tara is thinking through the best next step…'
    : ai.status === 'listening' ? 'Tara is listening…'
      : ai.spoken || 'Ask Tara about your CV, job search, career change or interviews.';
  const promptRows = ai.current?.followups?.slice(0, 3) ?? STARTERS.map(([, q]) => q);

  const stopRef = useRef(ai.stop);
  stopRef.current = ai.stop;
  useEffect(() => () => stopRef.current(), []);
  useEffect(() => {
    if (!ai.current || ai.status === 'thinking') return undefined;
    setResponseGesture(ai.current);
    const timer = window.setTimeout(() => setResponseGesture(null), 5200);
    return () => window.clearTimeout(timer);
  }, [ai.current, ai.status]);
  const ask = (question) => { ai.ask(question); setDraft(''); inputRef.current?.focus(); };
  const submit = (event) => { event.preventDefault(); if (draft.trim()) ask(draft); };

  return <main className={`tara-demo ${reducedMotion ? 'tara-demo--reduced' : ''}`}>
    <header className="tara-demo__header">
      <a href="/" className="tara-demo__back">← Aurrum Careers</a>
      <span>New character demo</span>
      <button type="button" onClick={() => setReducedMotion(v => !v)} aria-pressed={reducedMotion}>
        {reducedMotion ? 'Motion off' : 'Motion on'}
      </button>
    </header>
    <section className="tara-demo__hero">
      <div className="tara-demo__intro">
        <p className="tara-demo__eyebrow">TARA / CAREER COUNSELLOR</p>
        <h1>A funny, friendly guide for the next move in your career.</h1>
        <p className="tara-demo__lede">This page is a dynamic motion prototype for Tara’s approved character design. Her action changes with the advice she gives.</p>
        <div className="tara-demo__states" aria-label="Current character state">
          <span>Emotion: <strong>{visual.emotion}</strong></span>
          <span>Action: <strong>{visual.action}</strong></span>
        </div>
      </div>
      <div className="tara-demo__stage-wrap">
        <TaraAvatar {...visual} speaking={ai.speaking} reducedMotion={reducedMotion} />
        <div className="tara-demo__stage-caption" aria-live="polite">{caption}</div>
      </div>
    </section>
    <section className="tara-demo__chat" aria-label="Talk with Tara">
      <div className="tara-demo__quick" role="list">
        {STARTERS.map(([label, question]) => <button type="button" role="listitem" key={label} onClick={() => ask(question)}>{label}</button>)}
      </div>
      <form onSubmit={submit} className="tara-demo__composer">
        <label className="tara-demo__sr" htmlFor="tara-question">Ask Tara a career question</label>
        <input id="tara-question" ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask Tara anything…" autoComplete="off" />
        <button type="submit" disabled={!draft.trim() || ai.status === 'thinking'}>{ai.status === 'thinking' ? 'Thinking…' : 'Ask Tara'}</button>
      </form>
      <div className="tara-demo__answer" aria-live="polite">
        <p className="tara-demo__status">{ai.status === 'thinking' ? 'Thinking' : ai.speaking ? 'Tara is speaking' : 'Ready'}</p>
        <p>{caption}</p>
        <div className="tara-demo__answer-actions">
          <button type="button" onClick={ai.stop} disabled={ai.status !== 'thinking' && !ai.speaking}>Stop</button>
          <button type="button" onClick={ai.replay} disabled={!ai.current || ai.speaking}>Replay</button>
        </div>
      </div>
      <div className="tara-demo__followups" aria-label="Suggested follow-up questions">
        {promptRows.map(question => <button type="button" key={question} onClick={() => ask(question)}>{question}</button>)}
      </div>
    </section>
    <aside className="tara-demo__truth">
      <strong>3D runtime:</strong> Tara now renders through the existing animation-ready GLB pipeline: full-body clips drive her arms and legs, and speech events drive facial morph targets for blinking and lip movement. The Tara design pack remains the source for the final dedicated production mesh.
      <a href="/docs/tara-character/CHARACTER-SPEC.md">Open Tara’s 3D production specification</a>
    </aside>
  </main>;
}
