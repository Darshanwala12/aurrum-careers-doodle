import { useEffect, useRef, useState } from 'react';
import { STATES } from '../data/states.js';
import './character-avatar.css';

const CHARACTER_URL = '/avatars/elena-character.jpg';

// Broad state buckets → a CSS animation class. Full detail isn't needed here
// (this is a single photo, not rigged geometry) — just enough motion
// language to read as "alive" and to visibly react to what's happening.
const STATE_CLASS = {
  [STATES.THINKING]: 'is-thinking',
  [STATES.LISTENING]: 'is-listening',
  [STATES.WAVING]: 'is-waving',
  [STATES.GREETING]: 'is-waving',
  [STATES.EXCITED]: 'is-excited',
  [STATES.CELEBRATING]: 'is-excited',
  [STATES.SUCCESS]: 'is-excited',
  [STATES.HAPPY]: 'is-happy',
  [STATES.CONFIDENT]: 'is-happy',
  [STATES.ENCOURAGING]: 'is-happy',
};

/**
 * The custom character portrait, animated dynamically with CSS rather than
 * rigged geometry: idle float, a talk-pulse synced to speech, a listening
 * lean-in, a thinking tilt, and a greeting bounce. Cursor-follow parallax
 * (desktop only) adds a little presence without any extra assets.
 */
export default function CharacterAvatar({ state = STATES.IDLE, speaking = false, size = 220 }) {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.matchMedia('(hover: none)').matches) return undefined;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - (r.left + r.width / 2)) / r.width) * 8;
      const y = ((e.clientY - (r.top + r.height / 2)) / r.height) * 5;
      setTilt({ x, y });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const stateClass = STATE_CLASS[state] ?? 'is-idle';

  return (
    <div
      ref={wrapRef}
      className={`character-avatar ${stateClass} ${speaking ? 'is-speaking' : ''}`}
      style={{ width: size, height: size * 1.3 }}
    >
      <div
        className="character-avatar__tilt"
        style={{ transform: `rotate(${tilt.x * 0.3}deg) translate(${tilt.x}px, ${tilt.y}px)` }}
      >
        <span className="character-avatar__glow" aria-hidden="true" />
        <img
          className="character-avatar__img"
          src={CHARACTER_URL}
          alt="Elena, your Aurrum career advisor"
          draggable="false"
        />
        {speaking && (
          <span className="character-avatar__waves" aria-hidden="true">
            <span /><span /><span />
          </span>
        )}
      </div>
    </div>
  );
}
