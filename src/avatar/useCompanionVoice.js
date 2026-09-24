import { useCallback, useEffect, useRef, useState } from 'react';
import { knowledgeBase, FALLBACK_ANSWER } from '../data/scenes.js';

/**
 * Honest implementation note (brief §5/§6): true real-time LLM+STT+TTS with
 * barge-in requires a paid streaming voice vendor and a hosted backend,
 * neither of which exist in this environment. What's built here is the
 * browser-native equivalent that ships working today with zero external
 * keys: Web Speech API for voice in/out, and transparent keyword matching
 * against an approved knowledge base (§18) — never a hallucinated LLM call.
 * The `askText`/`ask` surface is deliberately the same shape a real
 * STT->LLM->TTS pipeline would expose, so swapping in a vendor later only
 * touches this file.
 */
function findAnswer(input) {
  const lower = input.toLowerCase();
  const hit = knowledgeBase.find((entry) => entry.k.some((keyword) => lower.includes(keyword)));
  return hit ? hit.a : FALLBACK_ANSWER;
}

export function useCompanionVoice({ onExchange, muted } = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognition));
    if (!SpeechRecognition) return;
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-GB';
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const answer = findAnswer(transcript);
      onExchange?.({ transcript, answer });
      speak(answer);
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    recogRef.current = recog;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onExchange]);

  const speak = useCallback(
    (text) => {
      if (muted || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    },
    [muted]
  );

  // "Interruption handling" (brief §17) within what the browser actually
  // supports: starting to listen immediately cancels any in-progress TTS
  // playback, so the character stops talking the moment the visitor speaks.
  const startListening = useCallback(() => {
    if (!recogRef.current) return;
    window.speechSynthesis?.cancel();
    setListening(true);
    try {
      recogRef.current.start();
    } catch {
      setListening(false);
    }
  }, []);

  const askText = useCallback(
    (text) => {
      const answer = findAnswer(text);
      onExchange?.({ transcript: text, answer });
      speak(answer);
      return answer;
    },
    [onExchange, speak]
  );

  return { listening, supported, startListening, askText, speak };
}
