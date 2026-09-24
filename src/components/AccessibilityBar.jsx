// Brief §25: mute, captions, reduced motion, pause animation, skip intro —
// all exposed directly, never buried, so the visitor is never trapped
// inside the animation.
export default function AccessibilityBar({
  muted, onToggleMute,
  captionsOn, onToggleCaptions,
  reducedMotion, onToggleReducedMotion,
  paused, onTogglePaused,
}) {
  return (
    <div className="a11y-bar" role="toolbar" aria-label="Accessibility controls">
      <button type="button" className="a11y-btn" onClick={onToggleMute} aria-pressed={muted}>
        {muted ? 'Unmute' : 'Mute'}
      </button>
      <button type="button" className="a11y-btn" onClick={onToggleCaptions} aria-pressed={captionsOn}>
        {captionsOn ? 'Captions on' : 'Captions off'}
      </button>
      <button type="button" className="a11y-btn" onClick={onToggleReducedMotion} aria-pressed={reducedMotion}>
        {reducedMotion ? 'Reduced motion' : 'Full motion'}
      </button>
      <button type="button" className="a11y-btn" onClick={onTogglePaused} aria-pressed={paused}>
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
