/**
 * Photoreal live avatar via Anam cara-4 (WebRTC streaming).
 *
 * Anam runs the real-time pipeline — speech recognition, LLM (grounded in
 * the Elena system prompt), natural TTS, photorealistic lip-synced video,
 * and barge-in — streaming it over WebRTC to a <video> element.
 *
 * Architecture:
 *   browser → /api/avatar/session → server gets short-lived Anam session token
 *   browser ← token ← server
 *   browser uses @anam-ai/js-sdk with token → WebRTC stream → <video>
 *
 * The API key never leaves the server (server/avatar-server.mjs).
 */

export async function liveAvatarStatus() {
  try {
    const r = await fetch('/api/avatar/status', { cache: 'no-store' });
    if (!r.ok) return { configured: false };
    return await r.json();
  } catch {
    return { configured: false }; // server not running → illustrated Elena only
  }
}

/**
 * Start a session and stream it into `videoEl`.
 *
 * handlers:
 *   onReady()                  — WebRTC connected, video playing
 *   onEnd(reason)              — session closed
 *   onUserSpeaking(bool)       — user mic activity
 *   onUserText(text)           — complete user utterance transcript
 *   onAvatarSpeaking(bool)     — avatar started / finished speaking
 *   onAvatarChunk(text)        — incremental avatar speech text (for caption)
 *   onAvatarText(text)         — complete avatar utterance transcript
 */
export async function startLiveAvatar(videoEl, handlers = {}, { micOn = true } = {}) {
  // Lazy-load the SDK so the main bundle stays small.
  const { createClient, AnamEvent } = await import('@anam-ai/js-sdk');

  const r = await fetch('/api/avatar/session', { method: 'POST' });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.sessionToken) {
    throw new Error(body.error || `Session request failed (${r.status})`);
  }

  const client = createClient(body.sessionToken);

  // ── Connection lifecycle ──────────────────────────────────────────────────
  client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
    handlers.onReady?.();
  });
  client.addListener(AnamEvent.CONNECTION_CLOSED, (reason) => {
    handlers.onEnd?.(reason);
  });

  // ── User speech ───────────────────────────────────────────────────────────
  client.addListener(AnamEvent.USER_SPEECH_STARTED, () => {
    handlers.onUserSpeaking?.(true);
  });
  client.addListener(AnamEvent.USER_SPEECH_ENDED, () => {
    handlers.onUserSpeaking?.(false);
  });

  // ── Message stream: user transcripts + avatar speech ─────────────────────
  let assistantBuf = '';
  let assistantSpeaking = false;
  let userBuf = '';

  client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (evt) => {
    if (evt.role === 'user') {
      userBuf += evt.content;
      if (evt.endOfSpeech) {
        handlers.onUserText?.(userBuf.trim());
        userBuf = '';
      }
    } else {
      // assistant
      if (!assistantSpeaking) {
        assistantSpeaking = true;
        assistantBuf = '';
        handlers.onAvatarSpeaking?.(true);
      }
      assistantBuf += evt.content;
      handlers.onAvatarChunk?.(assistantBuf);
      if (evt.endOfSpeech) {
        assistantSpeaking = false;
        handlers.onAvatarSpeaking?.(false);
        handlers.onAvatarText?.(assistantBuf.trim());
        assistantBuf = '';
      }
    }
  });

  // Anam's streamToVideoElement requires a DOM id string.
  // We assign one dynamically so callers can pass a bare ref.
  const vid = videoEl;
  if (!vid.id) vid.id = 'aurrum-anam-' + Math.random().toString(36).slice(2, 8);
  await client.streamToVideoElement(vid.id);

  if (!micOn) client.muteInputAudio();

  let _micMuted = !micOn;

  return {
    /** Typed question → avatar's LLM answers in its own voice. */
    ask: (text) => client.sendUserMessage(text),
    /** Barge-in: stop the avatar mid-sentence. */
    interrupt: () => client.interruptPersona(),
    setMicMuted: async (muted) => {
      _micMuted = muted;
      muted ? client.muteInputAudio() : client.unmuteInputAudio();
    },
    get micMuted() { return _micMuted; },
    stop: async () => client.stopStreaming(),
  };
}
