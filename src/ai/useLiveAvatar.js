import { useCallback, useEffect, useRef, useState } from 'react';
import { liveAvatarStatus, startLiveAvatar } from './liveAvatar.js';
import { findTopic } from './providers/localProvider.js';
import { STATES } from '../data/states.js';

/**
 * Runs a photoreal Anam cara-4 session and feeds it into the existing
 * character UI (useAiCharacter): captions, history, listening/thinking/
 * speaking states, and — by matching what's said against the Aurrum
 * knowledge base — the doodle objects and page-section highlights.
 *
 * status: unavailable | available | connecting | live | error
 */
export function useLiveAvatar(ai, { muted }) {
  const [status, setStatus] = useState('unavailable');
  const [error, setError] = useState('');
  const [micMuted, setMicMuted] = useState(false);
  const videoRef = useRef(null);
  const sessionRef = useRef(null);
  const topicRef = useRef(null);
  const bufRef = useRef('');
  const aiRef = useRef(ai);
  aiRef.current = ai;

  // Is the token server running and configured? Live mode is off unless
  // VITE_AURRUM_LIVE_AVATAR=true, so no button or error shows by default.
  useEffect(() => {
    if (import.meta.env.VITE_AURRUM_LIVE_AVATAR !== 'true') return undefined;
    let alive = true;
    liveAvatarStatus().then((s) => { if (alive && s.configured) setStatus('available'); });
    return () => { alive = false; };
  }, []);

  const end = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus((s) => (s === 'unavailable' ? s : 'available'));
    aiRef.current.setLive({ status: 'idle' });
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current || sessionRef.current) return;
    setStatus('connecting');
    setError('');
    const live = () => aiRef.current;
    const entryFor = (topic) => ({
      ...(topic ?? {}),
      id: topic?.id ?? 'live',
      answer: '',
      state: topic?.state ?? STATES.EXPLAINING,
    });
    try {
      sessionRef.current = await startLiveAvatar(videoRef.current, {
        onReady: () => { setStatus('live'); live().setLive({ status: 'idle', current: null, spoken: '' }); },
        onEnd: () => { sessionRef.current = null; setStatus('available'); live().setLive({ status: 'idle' }); },
        onUserSpeaking: (on) => live().setLive({ status: on ? 'listening' : 'thinking' }),
        onUserText: (text) => {
          live().addHistory({ role: 'user', text });
          topicRef.current = findTopic(text);
        },
        onAvatarSpeaking: (on) => {
          if (on) {
            bufRef.current = '';
            live().setLive({ status: 'speaking', current: entryFor(topicRef.current), spoken: '' });
          } else {
            live().setLive({ status: 'idle' });
          }
        },
        onAvatarChunk: (t) => {
          // liveAvatar.js always passes the cumulative text so far.
          bufRef.current = t;
          live().setLive({ spoken: t });
        },
        onAvatarText: (text) => {
          const topic = topicRef.current ?? findTopic(text); // e.g. the opening line has no question
          live().addHistory({ role: 'assistant', text, topic: topic?.id });
          live().setLive({ spoken: text, current: { ...entryFor(topic), answer: text } });
          topicRef.current = null;
        },
      }, { micOn: true });
      setMicMuted(false);
    } catch (err) {
      console.warn('[Elena live]', err);
      sessionRef.current = null;
      setError(err.message || 'Could not connect.');
      setStatus('error');
    }
  }, []);

  // Typed questions go to the live avatar's LLM.
  const ask = useCallback((text) => {
    const s = sessionRef.current;
    if (!s) return false;
    const t = text.trim();
    if (!t) return true;
    s.interrupt();
    aiRef.current.addHistory({ role: 'user', text: t });
    topicRef.current = findTopic(t);
    aiRef.current.setLive({ status: 'thinking', current: null, spoken: '' });
    s.ask(t);
    return true;
  }, []);

  const interrupt = useCallback(() => sessionRef.current?.interrupt(), []);

  const toggleMic = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    const next = !micMuted;
    await s.setMicMuted(next);
    setMicMuted(next);
  }, [micMuted]);

  // Site mute button silences the avatar's voice.
  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, status]);

  // Leaving the page ends the (billed) session.
  useEffect(() => () => sessionRef.current?.stop(), []);

  return { status, error, isLive: status === 'live', videoRef, start, end, ask, interrupt, micMuted, toggleMic };
}
