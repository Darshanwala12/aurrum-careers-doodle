import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNarration } from '../avatar/useNarration.js';
import { scrollToId } from '../animations/useSmoothScroll.js';
import { useAiCharacter } from './useAiCharacter.js';
import { useLiveAvatar } from './useLiveAvatar.js';
import { SUGGESTED_PROMPTS, OPENING_LINE, knowledge } from './knowledge.js';
import { personas } from '../data/scenes.js';
import DoodleWorld from './components/DoodleWorld.jsx';
import ThoughtDoodles from './components/ThoughtDoodles.jsx';
import DoodleCompanion from '../avatar/CartoonCompanion.jsx';
import './aurrum-ai-character.css';

const HIGHLIGHT_CLASS = 'aurrum-ai-character-highlight';
// Page persona buttons → knowledge topic (for the doodle object + section).
const PERSONA_TOPIC = { working: 'professional', unsure: 'counselling' };

function useIsCompact() {
  const q = '(max-width: 899px)';
  const [compact, setCompact] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mql = window.matchMedia(q);
    const on = () => setCompact(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return compact;
}

/**
 * Aurrum AI career companion — the conversational layer living inside the
 * existing page. Between questions it narrates the scroll story (scene text);
 * once the visitor asks something it answers, draws the matching doodle
 * object, and softly highlights the related existing section.
 */
export default function AiCharacter({ scene, overrideText, onOverrideConsumed, muted, onToggleMute, captionsOn, paused }) {
  const ai = useAiCharacter({ muted });
  // Photoreal Anam cara-4 avatar: offered only when the token server is configured.
  const live = useLiveAvatar(ai, { muted });
  const compact = useIsCompact();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  // Scrolling to a new scene (after an answer has finished) returns the
  // character to narrating that scene; conversation history is kept.
  const [dismissedFor, setDismissedFor] = useState(null);
  useEffect(() => {
    if (ai.status === 'idle' && ai.current) setDismissedFor(scene.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);
  useEffect(() => { setDismissedFor(null); }, [ai.current]);

  const pending = ai.status === 'thinking' || ai.status === 'listening';
  const showAnswer = Boolean(ai.current) && dismissedFor !== scene.id && !pending;
  const inConversation = showAnswer || pending;
  // In a live session the real avatar does all the talking — no scripted narration.
  const narration = useNarration(!inConversation && !paused && !live.isLive ? scene.text : '', { muted });

  const caption = showAnswer ? ai.spoken : pending ? ''
    : live.isLive ? 'Elena is listening — just start talking, or type a question below.'
    : narration.displayed;
  const speaking = showAnswer ? ai.speaking : narration.speaking;
  // Full sentence being spoken (the 3D lip-sync plans the whole line).
  const lineText = showAnswer ? ai.current.answer : inConversation ? '' : scene.text;
  const state = inConversation ? ai.characterState : scene.state;

  // VOICE → UNDERSTANDING → VISUAL RESPONSE: softly activate the related
  // existing section while it's being explained.
  const section = showAnswer ? ai.current?.section : null;
  useEffect(() => {
    if (!section || ai.status !== 'speaking') return;
    const el = document.getElementById(section);
    if (!el) return;
    el.classList.add(HIGHLIGHT_CLASS);
    return () => el.classList.remove(HIGHLIGHT_CLASS);
  }, [section, ai.status]);

  // Jump to the relevant content automatically as soon as the answer names
  // one — the character explains while the page brings that section into
  // view, rather than making the visitor click "Show me" every time.
  useEffect(() => {
    if (!ai.current?.section) return;
    scrollToId(ai.current.section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.current]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [ai.history.length, showHistory]);

  // A persona picked on the page: the character responds with that
  // persona's existing reply copy, plus the matching visuals.
  useEffect(() => {
    if (!overrideText) return;
    const persona = personas.find((p) => p.reply === overrideText);
    const topic = persona && (PERSONA_TOPIC[persona.id] ?? persona.id);
    const entry = knowledge.find((k) => k.id === topic) ?? {};
    ai.say({ ...entry, id: topic ?? 'persona', answer: overrideText, section: null });
    onOverrideConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideText]);

  // Paused (a11y bar) also silences any answer in progress.
  useEffect(() => { if (paused) { ai.stop(); live.interrupt(); } }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile: the live video lives in the sheet, so closing the sheet ends the session.
  useEffect(() => { if (compact && !expanded && live.isLive) live.end(); }, [compact, expanded, live.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes the mobile sheet.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('aurrum-ai-character-lock');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('aurrum-ai-character-lock');
    };
  }, [expanded]);

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    if (!live.ask(draft)) ai.ask(draft);
    setDraft('');
  };
  const askPrompt = (q) => { if (!live.ask(q)) ai.ask(q); };
  const stopTalking = () => (live.isLive ? live.interrupt() : ai.stop());
  const showMe = () => {
    if (!section) return;
    setExpanded(false);
    scrollToId(section);
  };

  const followups = showAnswer && ai.current?.followups?.length ? ai.current.followups : SUGGESTED_PROMPTS;
  const busy = ai.status === 'speaking' || ai.status === 'thinking';

  // Desktop: full body, as the primary visual of the panel. Mobile chat
  // sheet: half body ('mid') — full body would be mostly empty space in a
  // narrow phone-width column, and would risk cropping into the composer.
  const figure = (size) => (
    <div className={`aurrum-ai-character__stage aurrum-ai-character__stage--${ai.status}`}>
      <div className={`aurrum-ai-character__avatar ${live.isLive ? 'is-live' : ''}`}>
        {/* Photoreal live Elena (Anam cara-4 WebRTC stream). */}
        {live.status !== 'unavailable' && (
          <video
            ref={live.videoRef}
            className={`aurrum-ai-character__video ${live.isLive ? 'is-live' : ''}`}
            autoPlay
            playsInline
            aria-label="Live video of Elena, your Aurrum career advisor"
          />
        )}
        {!live.isLive && (
          <div className="aurrum-ai-character__fallback">
            <DoodleCompanion state={state} speaking={speaking && !paused} size={size} text={lineText} />
          </div>
        )}
        <svg className="aurrum-ai-character__accent" viewBox="0 0 60 30" aria-hidden="true">
          <path pathLength="1" d="M4 22 Q 16 4, 30 16 T 56 8" />
        </svg>
      </div>
      <ThoughtDoodles status={ai.status} interim={ai.interim} />
      {showAnswer && (
        <DoodleWorld world={ai.current.world} note={ai.current.note} active={ai.status === 'speaking'} />
      )}
    </div>
  );

  const full = (
    <>
      {figure(compact ? 150 : 190)}

      {captionsOn && (
        <p className="aurrum-ai-character__caption" aria-live="polite">
          {caption}
          {speaking && !paused && <span className="aurrum-ai-character__cursor" aria-hidden="true">▍</span>}
        </p>
      )}

      {live.status !== 'unavailable' && (
        <div className="aurrum-ai-character__live" role="group" aria-label="Live conversation">
          {live.isLive ? (
            <>
              <span className="aurrum-ai-character__live-dot" aria-hidden="true" /> Live
              <button type="button" className="aurrum-ai-character__live-btn" onClick={live.toggleMic} aria-pressed={live.micMuted}>
                {live.micMuted ? 'Unmute mic' : 'Mute mic'}
              </button>
              <button type="button" className="aurrum-ai-character__live-btn" onClick={live.end}>End</button>
            </>
          ) : (
            <button
              type="button"
              className="aurrum-ai-character__live-start"
              onClick={live.start}
              disabled={live.status === 'connecting'}
            >
              {live.status === 'connecting' ? 'Connecting to Elena…' : '● Talk live with Elena'}
            </button>
          )}
          {live.status === 'error' && <span className="aurrum-ai-character__live-err" role="alert">{live.error}</span>}
        </div>
      )}

      <div className="aurrum-ai-character__composer">
        <form className="aurrum-ai-character__voice" onSubmit={submit}>
          <label htmlFor="aurrum-ai-input" className="aurrum-ai-character__sr">Type your question for Elena</label>
          <input
            id="aurrum-ai-input"
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Elena anything…"
            autoComplete="off"
          />
          <button type="submit" className="aurrum-ai-character__send" disabled={!draft.trim()} aria-label="Ask">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </form>
        <div className="aurrum-ai-character__controls" role="group" aria-label="Conversation controls">
          {/* Desktop has Mute in the accessibility bar; the mobile sheet needs its own. */}
          {compact && (
            <button type="button" className="aurrum-ai-character__icon" onClick={onToggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7" />}
              </svg>
            </button>
          )}
          <button type="button" className="aurrum-ai-character__icon" onClick={stopTalking} disabled={!busy && !live.isLive} aria-label="Stop speaking" title="Stop">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" /></svg>
          </button>
          <button type="button" className="aurrum-ai-character__icon" onClick={ai.replay} disabled={!ai.current || busy || live.isLive} aria-label="Replay answer" title="Replay">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></svg>
          </button>
          <button
            type="button"
            className="aurrum-ai-character__icon"
            onClick={() => setShowHistory((v) => !v)}
            disabled={ai.history.length === 0}
            aria-pressed={showHistory}
            aria-label="Conversation history"
            title="History"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9" /></svg>
          </button>
        </div>
      </div>

      <div className="aurrum-ai-character__prompts" role="list" aria-label="Suggested questions">
        {section && (
          <button type="button" role="listitem" className="aurrum-ai-character__prompt aurrum-ai-character__prompt--accent" onClick={showMe}>
            Show me on the page ↓
          </button>
        )}
        {followups.slice(0, section ? 3 : 4).map((q) => (
          <button key={q} type="button" role="listitem" className="aurrum-ai-character__prompt" onClick={() => askPrompt(q)}>
            {q}
          </button>
        ))}
      </div>

      {showHistory && ai.history.length > 0 && (
        <div className="aurrum-ai-character__history" role="dialog" aria-label="Conversation history">
          <div className="aurrum-ai-character__history-head">
            <span>Conversation</span>
            <button type="button" className="aurrum-ai-character__icon" onClick={() => setShowHistory(false)} aria-label="Close history">✕</button>
          </div>
          <ol ref={logRef} aria-label="Conversation transcript">
            <li className="is-assistant">{OPENING_LINE}</li>
            {ai.history.map((m, i) => (
              <li key={i} className={m.role === 'user' ? 'is-user' : 'is-assistant'}>
                <span className="aurrum-ai-character__sr">{m.role === 'user' ? 'You: ' : 'Elena: '}</span>
                {m.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );

  // Mobile/tablet: a minimal floating chat-launcher (no reserved top-bar
  // space — content uses the full screen) that opens a full-height chat
  // sheet with its own header, matching a standard chatbot pattern.
  if (compact) {
    return (
      <>
        {/* Portaled to <body> — `.companion-stage` has backdrop-filter,
            which (like `transform`) creates a new containing block for
            position:fixed descendants. Left in place, the launcher was
            anchoring to that top bar instead of the viewport, so "bottom"
            landed near the top of the screen instead of the actual bottom. */}
        {createPortal(
          <button
            type="button"
            className="aurrum-ai-character__launcher"
            onClick={() => setExpanded(true)}
            aria-label="Talk to Elena, your Aurrum career advisor"
            aria-expanded={expanded}
          >
            <DoodleCompanion state={state} speaking={speaking && !paused} size={40} />
            {busy && <span className="aurrum-ai-character__launcher-dot" aria-hidden="true" />}
          </button>,
          document.body
        )}

        {expanded && createPortal(
          <div className="aurrum-ai-character aurrum-ai-character--sheet" role="dialog" aria-modal="true" aria-label="Conversation with Elena">
            <div className="aurrum-ai-character__sheet-head">
              <div className="aurrum-ai-character__sheet-head-avatar">
                <DoodleCompanion state={state} speaking={speaking && !paused} size={42} />
              </div>
              <div className="aurrum-ai-character__sheet-head-text">
                <strong>Elena</strong>
                <span>{ai.status === 'thinking' ? 'Thinking…' : ai.status === 'listening' ? 'Listening…' : 'Aurrum career advisor'}</span>
              </div>
              <button type="button" className="aurrum-ai-character__close" onClick={() => setExpanded(false)} aria-label="Close conversation">✕</button>
            </div>
            {full}
          </div>,
          document.body
        )}
      </>
    );
  }

  return <div className="aurrum-ai-character">{full}</div>;
}
