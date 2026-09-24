import { useEffect, useState } from 'react';
import { THINKING_PHRASES } from '../knowledge.js';

/**
 * The "AI is thinking" visual language: a hand-drawn thought bubble with a
 * scribble that draws itself, cycling short handwritten phrases. Replaces a
 * spinner. Listening shows animated sound strokes instead.
 */
export default function ThoughtDoodles({ status, interim }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (status !== 'thinking') { setI(0); return; }
    const t = setInterval(() => setI((n) => Math.min(n + 1, THINKING_PHRASES.length - 1)), 700);
    return () => clearInterval(t);
  }, [status]);

  if (status === 'thinking') {
    return (
      <div className="aurrum-ai-character__thought" role="status" aria-live="polite">
        <svg viewBox="0 0 120 40" aria-hidden="true" className="aurrum-ai-character__scribble">
          <path pathLength="1" d="M6 24 C 16 6, 26 34, 36 18 S 56 6, 64 22 S 84 34, 94 16 S 110 12, 114 22" />
        </svg>
        <span>{THINKING_PHRASES[i]}</span>
        <i className="aurrum-ai-character__thought-dot" />
        <i className="aurrum-ai-character__thought-dot aurrum-ai-character__thought-dot--sm" />
      </div>
    );
  }

  if (status === 'listening') {
    return (
      <div className="aurrum-ai-character__thought aurrum-ai-character__thought--listen" role="status" aria-live="polite">
        <span className="aurrum-ai-character__wave" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>{interim ? `“${interim}”` : 'Listening…'}</span>
      </div>
    );
  }

  return null;
}
