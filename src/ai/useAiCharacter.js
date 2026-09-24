import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATES } from '../data/states.js';
import { createLocalProvider } from './providers/localProvider.js';
import { createRemoteProvider } from './providers/remoteProvider.js';
import { createBrowserVoice } from './voiceAdapter.js';

/**
 * The AI character's brain: conversation history, the visible state machine
 * (idle → listening → thinking → speaking/explaining → success/error), voice
 * in/out, interruption, replay, and the "visual response" metadata (doodle
 * world object, page section) for the current answer.
 *
 * Provider choice: VITE_AURRUM_AI_ENDPOINT set → remote LLM via your backend
 * (falls back to local on failure); otherwise local knowledge retrieval.
 */
const MIN_THINK_MS = 650; // long enough to read as "thinking", short enough to feel responsive

export function useAiCharacter({ muted = false, voice: voiceOverride } = {}) {
  const provider = useMemo(() => {
    const local = createLocalProvider();
    const endpoint = import.meta.env.VITE_AURRUM_AI_ENDPOINT;
    return endpoint ? createRemoteProvider(endpoint, local) : local;
  }, []);
  const voice = useMemo(() => voiceOverride ?? createBrowserVoice(), [voiceOverride]);

  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking | error
  const [history, setHistory] = useState([]);    // [{role, text, topic?}]
  const [current, setCurrent] = useState(null);  // knowledge entry being explained
  const [spoken, setSpoken] = useState('');      // caption text revealed so far
  const [interim, setInterim] = useState('');    // live speech-recognition transcript
  const [micSupported, setMicSupported] = useState(false);

  const recogRef = useRef(null);
  const abortRef = useRef(null);
  const wordTimerRef = useRef(null);
  const historyRef = useRef(history);
  historyRef.current = history;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const currentRef = useRef(current);
  currentRef.current = current;

  // Bumped on every stop/deliver; late callbacks from a cancelled utterance
  // (speechSynthesis fires onend asynchronously) are ignored.
  const tokenRef = useRef(0);

  const clearWordTimer = () => clearTimeout(wordTimerRef.current);

  // Stop talking immediately (Stop button, barge-in, new question).
  const stop = useCallback(() => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    voice.stop();
    clearWordTimer();
    setStatus((s) => (s === 'speaking' || s === 'thinking' ? 'idle' : s));
    // Show the full answer text once speech is cut short.
    if (currentRef.current) setSpoken(currentRef.current.answer);
  }, [voice]);

  // Speak an entry. Captions follow the real TTS word boundaries when
  // available; when muted (or TTS gives no boundaries) a word timer drives
  // captions and lip movement instead so the character still "talks".
  const deliver = useCallback((entry) => {
    const text = entry.answer;
    const token = ++tokenRef.current;
    const live = () => token === tokenRef.current;
    setCurrent(entry);
    setSpoken('');
    setStatus('speaking');

    const words = text.split(' ');
    const runTimer = (from = 0) => {
      let i = from;
      const tick = () => {
        if (!live()) return;
        i += 1;
        setSpoken(words.slice(0, i).join(' '));
        if (i < words.length) wordTimerRef.current = setTimeout(tick, 170);
        else setStatus('idle');
      };
      wordTimerRef.current = setTimeout(tick, 120);
    };

    if (mutedRef.current || !voice.supported) { runTimer(); return; }

    let gotBoundary = false;
    // Some voices never fire word boundaries — fall back to the timer.
    const safety = setTimeout(() => { if (!gotBoundary && live()) runTimer(); }, 900);
    voice.speak(text, {
      onBoundary: (charIndex) => {
        if (!live()) return;
        gotBoundary = true;
        clearTimeout(safety);
        const end = text.indexOf(' ', charIndex);
        setSpoken(end === -1 ? text : text.slice(0, end));
      },
      onEnd: () => {
        clearTimeout(safety);
        if (!live()) return;
        clearWordTimer();
        setSpoken(text);
        setStatus('idle');
      },
    });
  }, [voice]);

  const ask = useCallback(async (raw) => {
    const text = raw.trim();
    if (!text) return;
    stop();
    setInterim('');
    const priorHistory = historyRef.current;
    setHistory((h) => [...h, { role: 'user', text }]);
    setStatus('thinking');
    setCurrent(null);
    setSpoken('');

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const [entry] = await Promise.all([
        provider.respond({ text, history: priorHistory, signal: controller.signal }),
        new Promise((r) => setTimeout(r, MIN_THINK_MS)),
      ]);
      if (controller.signal.aborted) return;
      setHistory((h) => [...h, { role: 'assistant', text: entry.answer, topic: entry.id }]);
      deliver(entry);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus('error');
      setCurrent({ id: 'error', answer: "Sorry — I lost my train of thought there. Could you ask that again?", state: STATES.EMPATHETIC });
      setSpoken("Sorry — I lost my train of thought there. Could you ask that again?");
    }
  }, [provider, deliver, stop]);

  // Live avatar mode: another engine (Anam) produces the conversation; it
  // pushes messages and its speaking state in here so captions, history,
  // doodles and section highlights keep working unchanged.
  const addHistory = useCallback((m) => setHistory((h) => [...h, m]), []);
  const setLive = useCallback(({ status: st, current: cur, spoken: sp } = {}) => {
    tokenRef.current += 1; // cancel any local speech/timers
    voice.stop();
    clearWordTimer();
    if (cur !== undefined) setCurrent(cur);
    if (sp !== undefined) setSpoken(sp);
    if (st) setStatus(st);
  }, [voice]);

  const replay = useCallback(() => { if (current) { stop(); deliver(current); } }, [current, deliver, stop]);

  /** Say something without a user question (opening line, scroll narration). */
  const say = useCallback((entry) => { stop(); deliver(entry); }, [deliver, stop]);

  // Speech recognition (voice in). Created only when listen() is first
  // called, so no recognizer (or mic permission prompt) exists unless voice
  // input is actually used. Starting to listen interrupts any speech.
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    setMicSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => { try { recogRef.current?.abort(); } catch { /* not started */ } };
  }, []);

  const listen = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (!recogRef.current) {
      const recog = new SR();
      recog.lang = 'en-GB';
      recog.continuous = false;
      recog.interimResults = true;
      recog.onresult = (e) => {
        const res = e.results[e.results.length - 1];
        const t = res[0].transcript;
        if (res.isFinal) { setInterim(''); askRef.current(t); } else setInterim(t);
      };
      recog.onerror = () => { setStatus((st) => (st === 'listening' ? 'idle' : st)); setInterim(''); };
      recog.onend = () => setStatus((st) => (st === 'listening' ? 'idle' : st));
      recogRef.current = recog;
    }
    stop();
    setStatus('listening');
    try { recogRef.current.start(); } catch { setStatus('idle'); }
  }, [stop]);

  const stopListening = useCallback(() => {
    try { recogRef.current?.stop(); } catch { /* not started */ }
  }, []);

  // Muting mid-sentence silences the voice but keeps the captions going.
  useEffect(() => {
    if (muted && status === 'speaking') {
      voice.stop();
      const done = spoken.split(' ').length;
      const words = (current?.answer ?? '').split(' ');
      clearWordTimer();
      let i = done;
      const tick = () => {
        i += 1;
        setSpoken(words.slice(0, i).join(' '));
        if (i < words.length) wordTimerRef.current = setTimeout(tick, 170);
        else setStatus('idle');
      };
      wordTimerRef.current = setTimeout(tick, 170);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  useEffect(() => () => { voice.stop(); clearWordTimer(); }, [voice]);

  // Map conversation status onto the character's pose vocabulary.
  const characterState =
    status === 'listening' ? STATES.LISTENING
    : status === 'thinking' ? STATES.THINKING
    : status === 'error' ? STATES.EMPATHETIC
    : current ? (status === 'idle' && current.success ? STATES.SUCCESS : current.state ?? STATES.EXPLAINING)
    : STATES.IDLE;

  return {
    status, characterState, speaking: status === 'speaking',
    history, current, spoken, interim,
    micSupported, providerName: provider.name,
    ask, say, stop, replay, listen, stopListening, addHistory, setLive,
  };
}
