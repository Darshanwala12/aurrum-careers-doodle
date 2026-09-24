import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { TalkingHead } from '@met4citizen/talkinghead/modules/talkinghead.mjs';
import { LipsyncEn } from '@met4citizen/talkinghead/modules/lipsync-en.mjs';

// elena.glb is meshopt-compressed (36.8 MB → 3 MB). TalkingHead 1.7.0 creates
// its own GLTFLoader without a meshopt decoder, so give every loader one.
if (!GLTFLoader.prototype.__aurrumMeshopt) {
  const load = GLTFLoader.prototype.load;
  GLTFLoader.prototype.load = function (...args) {
    if (!this.meshoptDecoder) this.setMeshoptDecoder(MeshoptDecoder);
    return load.apply(this, args);
  };
  GLTFLoader.prototype.__aurrumMeshopt = true;
}
import { STATES } from '../../data/states.js';
import { speechEvents } from '../voiceAdapter.js';

/**
 * Elena as a realistic 3D human, rendered with TalkingHead (MIT,
 * github.com/met4citizen/TalkingHead) and a CC0 MakeHuman/MPFB model
 * (public/avatars/elena.glb, compressed from TalkingHead's mpfb.glb).
 *
 * TalkingHead supplies natural idle motion, blinking, eye contact, breathing,
 * moods, hand gestures and viseme lip-sync. Lip-sync is driven here without
 * TTS audio: each utterance is given a silent audio clip plus estimated word
 * timings, and live word-boundary events from the browser voice re-sync the
 * mouth whenever it drifts.
 */
const AVATAR_URL = '/avatars/elena.glb';

// Pose/expression per character state.
const MOOD = {
  [STATES.GREETING]: 'happy', [STATES.WAVING]: 'happy', [STATES.HAPPY]: 'happy',
  [STATES.EXCITED]: 'happy', [STATES.CELEBRATING]: 'happy', [STATES.SUCCESS]: 'happy',
  [STATES.ENCOURAGING]: 'happy', [STATES.CONFIDENT]: 'happy',
};
const GESTURE = {
  [STATES.GREETING]: ['handup', 2.5], [STATES.WAVING]: ['handup', 2.5],
  [STATES.POINTING_RIGHT]: ['index', 3, true], [STATES.POINTING_LEFT]: ['index', 3],
  [STATES.POINTING_UP]: ['index', 3, true], [STATES.POINTING_DOWN]: ['index', 3],
  [STATES.SUCCESS]: ['thumbup', 2.5], [STATES.CELEBRATING]: ['thumbup', 2.5],
  [STATES.ENCOURAGING]: ['ok', 2.5], [STATES.THINKING]: ['shrug', 1.6],
};

// Browser voices speak roughly 14 characters/second; punctuation adds a pause.
function plan(text, fromWord = 0, msPerWord = null) {
  const words = text.split(/\s+/).filter(Boolean).slice(fromWord);
  const out = { words: [], wtimes: [], wdurations: [] };
  let t = 0;
  for (const w of words) {
    const d = msPerWord ?? Math.max(160, w.replace(/[^\p{L}\p{N}]/gu, '').length * 68 + 60);
    out.words.push(w); out.wtimes.push(t); out.wdurations.push(d);
    t += d + (msPerWord ? 0 : /[.!?]$/.test(w) ? 380 : /[,;:—–]$/.test(w) ? 200 : 0);
  }
  out.total = t + 200;
  return out;
}

// Realistic color direction (client-specified palette). Two strategies per
// material, named per the mesh names actually present in elena.glb (checked
// via the GLB's JSON chunk):
//  - 'flatten': drop the texture map and use a flat color. Needed wherever
//    the base color is already white (full pass-through) — a tint can only
//    ever darken/shift a texture's existing hue, it can never desaturate a
//    colored print to something else (e.g. the old blue gym-tee texture).
//  - 'tint': keep the texture (skin shading/detail matters) and multiply it
//    by a color — shifts tone/warmth without flattening the surface.
const RECOLOR = {
  'Human.female_casualsuit01': { mode: 'flatten', hex: 0x1c1e20 }, // blazer → charcoal black
  'Human.ponytail01': { mode: 'flatten', hex: 0x241c19 }, // hair → deep natural brown
  'Human.body': { mode: 'tint', hex: 0xc98f72 }, // skin → warm medium-light beige
  'Human.high-poly': { mode: 'tint', hex: 0xc98f72 }, // face → same skin tone
  'Human.mindfront_eyebrows_02': { mode: 'flatten', hex: 0x352722 }, // eyebrows → dark brown
};
// Not targetable: iris/lip color are baked into the face texture with no
// separate material to select, so they can't be recolored without editing
// the texture image itself — out of scope for a runtime material tint.
function recolor(scene) {
  if (!scene) return;
  scene.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      const spec = RECOLOR[m.name];
      if (!spec || !m.color) return;
      if (spec.mode === 'flatten') m.map = null;
      m.color.setHex(spec.hex);
      m.needsUpdate = true;
    });
  });
}

// Valid TalkingHead views, widest to tightest: 'full' (full body — desktop
// story/chat), 'mid' (half body — mobile chat sheet), 'upper' (chest up),
// 'head' (headshot — launcher/thumbnail icon sizes where anything wider is
// wasted pixels).
export default function RealisticAvatar({ state = STATES.IDLE, speaking = false, text = '', cameraView = 'full', onReady, onError }) {
  const nodeRef = useRef(null);
  const headRef = useRef(null);
  const [ready, setReady] = useState(false);
  const syncRef = useRef({ text: '', start: 0, plan: null, voice: false });

  // Create the avatar once.
  useEffect(() => {
    const node = nodeRef.current;
    let disposed = false;
    let head;
    try {
      head = new TalkingHead(node, {
        ttsEndpoint: null,
        lipsyncModules: [],         // loaded manually below (its dynamic import breaks under bundlers)
        lipsyncLang: 'en',
        cameraView,
        cameraRotateEnable: false,
        cameraZoomEnable: false,
        cameraPanEnable: false,
        modelFPS: 30,
        modelPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        avatarIdleEyeContact: 0.6,
        avatarSpeakingEyeContact: 0.85,
        avatarIdleHeadMove: 0.4,
        lightAmbientIntensity: 2.2,
        lightDirectIntensity: 24,
        lightDirectColor: 0xfff1e6,
        mixerGainSpeech: 0,         // the clips are silent; the browser voice is heard
      });
      head.lipsync.en = new LipsyncEn();
    } catch (err) {
      onError?.(err); // no WebGL
      return undefined;
    }
    headRef.current = head;

    head.showAvatar({ url: AVATAR_URL, body: 'F', avatarMood: 'neutral', lipsyncLang: 'en' })
      .then(() => {
        if (disposed) return;
        recolor(head.scene);
        setReady(true);
        onReady?.();
      })
      .catch((err) => { if (!disposed) onError?.(err); });

    const ro = new ResizeObserver(() => { if (node.clientWidth && node.clientHeight) head.onResize(); });
    ro.observe(node);

    // Save battery: stop rendering when off-screen or the tab is hidden.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) head.start(); else head.stop(); });
    io.observe(node);
    const onVis = () => { if (document.hidden) head.stop(); else head.start(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      disposed = true;
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      try { head.stop(); head.dispose?.(); } catch { /* already gone */ }
      // TalkingHead leaves its canvas behind; remove it so a remount doesn't stack a second one.
      node.replaceChildren();
      headRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Silent clip + word timings → TalkingHead's own viseme lip-sync.
  const speakPlan = (text, fromWord = 0, msPerWord = null) => {
    const head = headRef.current;
    if (!head?.armature || !head.audioCtx) return;
    const p = plan(text, fromWord, msPerWord);
    if (!p.words.length) return;
    const sr = head.audioCtx.sampleRate;
    const audio = head.audioCtx.createBuffer(1, Math.ceil((p.total / 1000) * sr), sr);
    head.stopSpeaking();
    head.speakAudio({ audio, words: p.words, wtimes: p.wtimes, wdurations: p.wdurations });
    syncRef.current = { ...syncRef.current, text, start: performance.now(), plan: p, from: fromWord };
  };

  // Framing can change without remounting (e.g. the same panel switching
  // between mobile and desktop breakpoints) — retarget the existing camera.
  useEffect(() => {
    const head = headRef.current;
    if (!ready || !head) return;
    head.setView(cameraView);
  }, [cameraView, ready]);

  // Captions-only speech (muted, or scene narration): match the caption pace.
  useEffect(() => {
    const head = headRef.current;
    if (!ready || !head) return;
    if (speaking && text) {
      if (!syncRef.current.voice || syncRef.current.text !== text) speakPlan(text, 0, 165);
    } else {
      head.stopSpeaking();
      syncRef.current = { text: '', start: 0, plan: null, voice: false };
    }
  }, [speaking, text, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real voice: restart on voice start, re-sync on word boundaries, stop on end.
  useEffect(() => {
    if (!ready) return undefined;
    const onStart = (e) => { syncRef.current.voice = true; speakPlan(e.detail.text); };
    const onBoundary = (e) => {
      const s = syncRef.current;
      if (!s.plan || s.text !== e.detail.text) return;
      const wordIndex = e.detail.text.slice(0, e.detail.charIndex).split(/\s+/).filter(Boolean).length;
      const i = wordIndex - (s.from ?? 0);
      const expected = s.plan.wtimes[i];
      if (expected == null) return;
      const drift = performance.now() - s.start - expected;
      if (Math.abs(drift) > 350) speakPlan(e.detail.text, wordIndex);
    };
    const onEnd = () => { syncRef.current.voice = false; headRef.current?.stopSpeaking(); };
    speechEvents.addEventListener('start', onStart);
    speechEvents.addEventListener('boundary', onBoundary);
    speechEvents.addEventListener('end', onEnd);
    return () => {
      speechEvents.removeEventListener('start', onStart);
      speechEvents.removeEventListener('boundary', onBoundary);
      speechEvents.removeEventListener('end', onEnd);
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mood, gestures and gaze per state.
  useEffect(() => {
    const head = headRef.current;
    if (!ready || !head) return;
    head.setMood(MOOD[state] ?? 'neutral');
    const g = GESTURE[state];
    if (g) head.playGesture(g[0], g[1], Boolean(g[2]));
    if (state === STATES.LISTENING) head.lookAtCamera(1500);
    if (state === STATES.THINKING) {
      const r = nodeRef.current.getBoundingClientRect();
      head.lookAt(r.left + r.width * 0.15, r.top, 1400); // glance up and away while thinking
    }
  }, [state, ready]);

  // The canvas is always shown; it simply stays empty until the model loads.
  return <div ref={nodeRef} className="aurrum-ai-character__3d" aria-hidden="true" />;
}
