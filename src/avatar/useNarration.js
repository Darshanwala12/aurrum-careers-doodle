import { useEffect, useRef, useState } from 'react';
import { createBrowserVoice } from '../ai/voiceAdapter.js';

// Reveals a caption progressively while `speaking` is true, driving the
// character's talk-cycle (DoodleCompanion's mouth/gesture animation) AND —
// unless muted or reduced-motion — actually speaking the line aloud through
// the browser's TTS, the same voice used for chat answers. Used both by the
// intro screen's greeting and the scroll-synced scene narration, so Elena
// talks (audibly, not just captioned) from the very first load onward.
export function useNarration(text, { muted = false } = {}) {
  const [displayed, setDisplayed] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef(null);
  const voiceRef = useRef(null);
  if (!voiceRef.current) voiceRef.current = createBrowserVoice();

  useEffect(() => {
    const voice = voiceRef.current;
    clearTimeout(timerRef.current);
    if (!text) {
      setDisplayed('');
      setSpeaking(false);
      voice.stop();
      return undefined;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || muted) {
      setDisplayed(text);
      setSpeaking(false);
      voice.stop();
      return undefined;
    }

    if (!voice.supported) {
      // No SpeechSynthesis in this browser: fall back to a timed word-by-word
      // reveal so the character still visibly "talks" in sync with something.
      setSpeaking(true);
      const words = text.split(' ');
      let i = 0;
      const tick = () => {
        i += 1;
        setDisplayed(words.slice(0, i).join(' '));
        if (i < words.length) timerRef.current = setTimeout(tick, 150);
        else setSpeaking(false);
      };
      timerRef.current = setTimeout(tick, 150);
      return () => clearTimeout(timerRef.current);
    }

    setDisplayed('');
    setSpeaking(true);
    voice.speak(text, {
      onBoundary: (charIndex) => setDisplayed(text.slice(0, charIndex)),
      onEnd: () => { setDisplayed(text); setSpeaking(false); },
    });
    return () => voice.stop();
  }, [text, muted]);

  return { displayed, speaking };
}
