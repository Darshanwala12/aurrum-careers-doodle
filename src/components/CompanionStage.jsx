import { lazy, Suspense } from 'react';
import AccessibilityBar from './AccessibilityBar.jsx';
import { scrollToId } from '../animations/useSmoothScroll.js';
import { scenes, navScenes } from '../data/scenes.js';

// The AI character layer (conversation engine, voice, doodle world) is code-
// split so the page renders first; until it arrives the plain character shows.
const AiCharacter = lazy(() => import('../ai/AiCharacter.jsx'));

export default function CompanionStage({
  activeSceneId,
  overrideText,
  onOverrideConsumed,
  muted, onToggleMute,
  captionsOn, onToggleCaptions,
  reducedMotion, onToggleReducedMotion,
  paused, onTogglePaused,
}) {
  const scene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];

  return (
    <div className="companion-stage">
      <Suspense
        fallback={
          <div className="companion-stage__row">
            <div className="companion-stage__figure">
              <span role="status">Preparing Elena…</span>
            </div>
          </div>
        }
      >
        <AiCharacter
          scene={scene}
          overrideText={overrideText} onOverrideConsumed={onOverrideConsumed}
          muted={muted} onToggleMute={onToggleMute}
          captionsOn={captionsOn}
          paused={paused}
          reducedMotion={reducedMotion}
        />
      </Suspense>

      <ol className="journey-nav" aria-label="Story progress — jump to a point">
        {navScenes.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`journey-nav__item ${s.id === activeSceneId ? 'is-active' : ''}`}
              onClick={() => scrollToId(s.id)}
              aria-current={s.id === activeSceneId ? 'true' : undefined}
            >
              <span className="journey-nav__dot" />
              <span className="journey-nav__index">{s.navIndex}</span>
              <span className="journey-nav__label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <AccessibilityBar
        muted={muted} onToggleMute={onToggleMute}
        captionsOn={captionsOn} onToggleCaptions={onToggleCaptions}
        reducedMotion={reducedMotion} onToggleReducedMotion={onToggleReducedMotion}
        paused={paused} onTogglePaused={onTogglePaused}
      />
    </div>
  );
}
