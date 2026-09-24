import { useEffect, useRef, useState } from 'react';

// Reveals a caption progressively while `speaking` is true (drives the
// character's talk-cycle in DoodleCompanion). Respects reduced-motion and
// a caller-provided mute flag by skipping the animated reveal entirely.
export function useNarration(text, { muted = false } = {}) {
  const [displayed, setDisplayed] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      setSpeaking(false);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || muted) {
      setDisplayed(text);
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    const words = text.split(' ');
    let i = 0;
    const tick = () => {
      i += 1;
      setDisplayed(words.slice(0, i).join(' '));
      if (i < words.length) {
        timerRef.current = setTimeout(tick, 150);
      } else {
        setSpeaking(false);
      }
    };
    timerRef.current = setTimeout(tick, 150);
    return () => clearTimeout(timerRef.current);
  }, [text, muted]);

  return { displayed, speaking };
}
