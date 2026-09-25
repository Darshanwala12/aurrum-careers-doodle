import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useNarration } from '../avatar/useNarration.js';
import { personas } from '../data/scenes.js';
import DoodleCompanion from '../avatar/CareerCounsellorAvatar.jsx';
import MichelleAvatar from '../ai/components/MichelleAvatar.jsx';

const webglOK = (() => {
  try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
})();

const LINE_1 = "Hi. I'm Elena.";
const LINE_2 = "Tell me where you are in your career, and I'll show you where we can help.";

/**
 * Brief §26/§28: the first 10 seconds. No header, no hero, no three buttons —
 * just the character entering, greeting, then asking who the visitor is.
 * Dismissible two ways: pick a persona ("I'll tell you") or skip straight
 * into the generic story ("Show me everything") — never a dead end.
 */
export default function IntroGate({ onDone }) {
  const [line, setLine] = useState(1);
  const rootRef = useRef(null);
  const { displayed, speaking } = useNarration(line === 1 ? LINE_1 : line === 2 ? LINE_2 : '');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = rootRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set('.intro-gate__figure, .intro-gate__caption', { opacity: 1, y: 0 });
        return;
      }
      gsap.timeline()
        .from('.intro-gate__figure', { opacity: 0, y: 24, duration: 1, ease: 'power2.out' })
        .from('.intro-gate__caption', { opacity: 0, y: 10, duration: 0.6 }, '-=0.3');
    }, el);
    return () => ctx.revert();
  }, []);

  // Advance once line 1 has actually finished being spoken (real TTS paces
  // slower/faster than a fixed word-count timer ever could), with a timeout
  // fallback in case speech is blocked/unsupported and never starts.
  const spokeLine1 = useRef(false);
  const [avatar3d, setAvatar3d] = useState('loading');
  useEffect(() => {
    if (line !== 1) return;
    if (speaking) spokeLine1.current = true;
    if (spokeLine1.current && !speaking) { setLine(2); return; }
    const t = setTimeout(() => setLine(2), 4000);
    return () => clearTimeout(t);
  }, [line, speaking]);

  return (
    <div className="intro-gate" ref={rootRef}>
      <div className="intro-gate__brand">
        <img src="/brand/aurrum-logo-light.webp" alt="Aurrum Careers" className="logo-chip__img logo-chip__img--light" />
          <img src="/brand/aurrum-logo-dark.webp" alt="Aurrum Careers" className="logo-chip__img logo-chip__img--dark" />
      </div>
      <div className="intro-gate__figure">
        {webglOK && avatar3d !== 'failed' && (
          <div className={`aurrum-ai-character__avatar is-3d ${avatar3d === 'ready' ? 'is-ready' : ''}`}>
            <MichelleAvatar
              state="greeting"
              speaking={speaking}
              onReady={() => setAvatar3d('ready')}
              onError={() => setAvatar3d('failed')}
            />
          </div>
        )}
        {(!webglOK || avatar3d !== 'ready') && (
          <DoodleCompanion state="greeting" speaking={speaking} size={200} text={displayed} />
        )}
      </div>
      <p className="intro-gate__caption" aria-live="polite">{displayed}</p>

      {line >= 2 && (
        <div className="intro-gate__actions">
          <div className="intro-gate__personas">
            {personas.map((p) => (
              <button key={p.id} type="button" className="btn btn--outline btn--sm" onClick={() => onDone(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary" onClick={() => onDone(null)}>
            Show me everything
          </button>
        </div>
      )}
    </div>
  );
}
