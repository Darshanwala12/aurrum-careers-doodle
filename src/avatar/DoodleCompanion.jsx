import { useEffect, useId, useRef } from 'react';
import gsap from 'gsap';
import { resolveState } from './stateMap.js';
import { speechEvents } from '../ai/voiceAdapter.js';

/**
 * Elena — "real-human doodle": realistic proportions drawn as a premium
 * editorial illustration (ink outlines, soft gouache shading, pencil grain).
 *
 * Public API is unchanged: { state, speaking, size } plus optional `text`
 * (the full line being spoken) for caption-paced lip-sync when there is no
 * live voice. With the browser voice on, the mouth follows each spoken word
 * via speechEvents.
 */

// ---------- Mouth ----------
// Every mouth shape shares one path structure (upper lip curve, lower lip
// curve back) so GSAP can morph between them.
const CY = 147;
const mouthPath = (w, lift, top, bottom) =>
  `M ${100 - w} ${CY - lift} Q 100 ${CY + lift * 0.5 - 1 - top} ${100 + w} ${CY - lift} Q 100 ${CY + lift * 0.5 + 2 + bottom} ${100 - w} ${CY - lift} Z`;

// Resting mouth per expression: [width, corner lift, lower-lip drop]
const REST = {
  friendly: [14.5, 3.4, 1.6], explaining: [14, 2, 1.4], concerned: [12, -1.6, 1.3],
  confident: [14.5, 3, 1.4], calm: [13, 1.6, 1.4], motivating: [16.5, 4.4, 3.5],
  curious: [11, 1, 1.4], serious: [13, 0, 1], surprised: [7.5, 0, 6.5],
};
// Lip-sync mouth shapes (Oculus-style visemes): [width, top lift, lower drop]
const VISEME = {
  sil: null,            // expression's resting mouth
  PP: [13, 0, 0.4],     // m / b / p — lips pressed
  FF: [13, 0, 3.2],     // f / v — lower lip under the teeth
  nn: [13, 0.5, 3.5],   // most consonants — slightly open
  aa: [12.5, 2, 10],    // "ah"
  E: [15.5, 1, 5],      // "ee"
  O: [9, 2.5, 8.5],     // "oh"
  U: [6.5, 1.8, 5.5],   // "oo"
};
function visemeFor(v, expr) {
  const [rw, lift, rb] = REST[expr] ?? REST.friendly;
  const s = VISEME[v];
  if (!s) return { d: mouthPath(rw, lift, 0, rb), teeth: 0 };
  const smile = Math.max(0, lift) * 0.5; // speech keeps a little of the smile
  return { d: mouthPath(s[0], smile, s[1], s[2]), teeth: v === 'aa' || v === 'E' || v === 'FF' || v === 'nn' ? 1 : v === 'O' ? 0.5 : 0 };
}
// Letters → mouth shapes (rule-based, small and fast).
function wordVisemes(word) {
  const out = [];
  for (const ch of word.toLowerCase().replace(/[^a-z]/g, '')) {
    const v = 'a'.includes(ch) ? 'aa' : 'eiy'.includes(ch) ? 'E' : ch === 'o' ? 'O' : 'uwq'.includes(ch) ? 'U'
      : 'mbp'.includes(ch) ? 'PP' : 'fv'.includes(ch) ? 'FF' : 'nn';
    if (out[out.length - 1] !== v) out.push(v);
  }
  return out.slice(0, 7).length ? out.slice(0, 7) : ['nn'];
}

const EYEBROW = {
  friendly:   { l: 'M 62 92 Q 74 86 86 91', r: 'M 114 91 Q 126 86 138 92' },
  explaining: { l: 'M 62 90 Q 74 83 86 89', r: 'M 114 89 Q 126 83 138 90' },
  concerned:  { l: 'M 62 88 Q 74 94 86 90', r: 'M 114 90 Q 126 94 138 88' },
  confident:  { l: 'M 62 89 Q 76 82 88 88', r: 'M 112 88 Q 124 82 138 89' },
  calm:       { l: 'M 62 91 Q 74 88 86 91', r: 'M 114 91 Q 126 88 138 91' },
  motivating: { l: 'M 60 87 Q 76 79 88 87', r: 'M 112 87 Q 124 79 140 87' },
  curious:    { l: 'M 62 89 Q 72 80 84 90', r: 'M 116 90 Q 128 80 138 89' },
  serious:    { l: 'M 62 90 Q 74 87 86 90', r: 'M 114 90 Q 126 87 138 90' },
  surprised:  { l: 'M 60 84 Q 74 76 88 84', r: 'M 112 84 Q 126 76 140 84' },
};

// ---------- Arms ----------
// Rotation of the (right) arm around the shoulder; 0 = straight out to the side.
const ARM_HIDDEN = { rotate: 24, opacity: 0 };
const ARM_POSE = {
  wave:          { rotate: -62, opacity: 1 },
  'point-right': { rotate: -18, opacity: 1 },
  'point-left':  { rotate: -18, opacity: 1 },
  'point-up':    { rotate: -78, opacity: 1 },
  'point-down':  { rotate: 22, opacity: 1 },
  explain:       { rotate: -30, opacity: 1 },
  thumb:         { rotate: -48, opacity: 1 },
  chin:          { rotate: -114, opacity: 1 },
  none:          ARM_HIDDEN,
};
const HAND_FOR = {
  wave: 'wave', 'point-right': 'point', 'point-left': 'point', 'point-up': 'point', 'point-down': 'point',
  explain: 'open', thumb: 'thumb', chin: 'fist', none: 'open',
};

// ---------- Pencil grain (generated once, reused by every instance) ----------
let grainURL = null;
function getGrain() {
  if (grainURL || typeof document === 'undefined') return grainURL;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() < 0.5 ? 26 : 0;
  }
  ctx.putImageData(img, 0, 0);
  grainURL = c.toDataURL();
  return grainURL;
}

const INK = '#4a2e22';

export default function DoodleCompanion({ state = 'idle', speaking = false, size = 260, text = '' }) {
  const { expression, arm } = resolveState(state);
  const uid = useId().replace(/:/g, '');
  const id = (n) => `${uid}-${n}`;
  const url = (n) => `url(#${id(n)})`;

  const svgRef = useRef(null);
  const mouthRef = useRef(null);
  const mouthClipRef = useRef(null);
  const teethRef = useRef(null);
  const browLRef = useRef(null);
  const browRRef = useRef(null);
  const eyesRef = useRef(null);
  const headRef = useRef(null);
  const torsoRef = useRef(null);
  const armRRef = useRef(null);
  const armLRef = useRef(null);
  const pupilsRef = useRef(null);
  const browsRef = useRef(null);
  const exprRef = useRef(expression);
  exprRef.current = expression;
  const textRef = useRef(text);
  textRef.current = text;
  const listening = state === 'listening';
  const thinking = state === 'thinking';
  const handKind = HAND_FOR[arm] ?? 'open';

  const setMouth = (v, dur = 0.08) => {
    const m = visemeFor(v, exprRef.current);
    if (mouthRef.current) gsap.to([mouthRef.current, mouthClipRef.current], { attr: { d: m.d }, duration: dur, ease: 'power1.out', overwrite: 'auto' });
    if (teethRef.current) gsap.to(teethRef.current, { opacity: m.teeth, duration: dur, overwrite: 'auto' });
  };

  // Blink.
  useEffect(() => {
    let cancelled = false;
    let t;
    const blink = () => {
      if (cancelled || !eyesRef.current) return;
      gsap.to(eyesRef.current, { scaleY: 0.08, duration: 0.07, transformOrigin: 'center', yoyo: true, repeat: 1, ease: 'power1.inOut' });
      t = setTimeout(blink, Math.random() < 0.15 ? 250 : 2200 + Math.random() * 3600); // occasional double blink
    };
    t = setTimeout(blink, 1000);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // Idle head sway + breathing.
  useEffect(() => {
    if (!headRef.current || !torsoRef.current) return;
    const head = gsap.to(headRef.current, { rotate: 1.4, svgOrigin: '100 190', duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const breath = gsap.to(torsoRef.current, { scaleY: 1.012, svgOrigin: '100 320', duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    return () => { head.kill(); breath.kill(); };
  }, []);

  // Expression: brows + resting mouth.
  useEffect(() => {
    const brow = EYEBROW[expression] ?? EYEBROW.friendly;
    if (browLRef.current) gsap.to(browLRef.current, { attr: { d: brow.l }, duration: 0.5, ease: 'power2.out' });
    if (browRRef.current) gsap.to(browRRef.current, { attr: { d: brow.r }, duration: 0.5, ease: 'power2.out' });
    if (!speaking) setMouth('sil', 0.45);
  }, [expression]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gestures: swing the arm in; the hand shape is chosen in render.
  useEffect(() => {
    const useLeft = arm === 'point-left';
    const active = useLeft ? armLRef : armRRef;
    const idle = useLeft ? armRRef : armLRef;
    if (!active.current || !idle.current) return;
    const origin = (ref) => (ref === armLRef ? '62 228' : '138 228');
    const mirror = (ref, p) => (ref === armLRef ? { ...p, rotate: -p.rotate } : p);
    const pose = ARM_POSE[arm] ?? ARM_HIDDEN;
    gsap.to(active.current, { ...mirror(active, pose), svgOrigin: origin(active), duration: 0.7, ease: 'back.out(1.4)' });
    gsap.to(idle.current, { ...mirror(idle, ARM_HIDDEN), svgOrigin: origin(idle), duration: 0.4, ease: 'power2.in' });
    let wave;
    if (arm === 'wave') {
      wave = gsap.to(active.current, { rotate: pose.rotate - 12, svgOrigin: origin(active), duration: 0.28, yoyo: true, repeat: 5, ease: 'sine.inOut', delay: 0.6 });
    }
    return () => {
      wave?.kill();
      gsap.to(active.current, { ...mirror(active, ARM_HIDDEN), svgOrigin: origin(active), duration: 0.4, ease: 'power2.in' });
    };
  }, [arm]);

  // Eyes: saccades; eye contact while listening; up-and-away while thinking.
  useEffect(() => {
    const pupils = pupilsRef.current;
    if (!pupils) return;
    if (listening) { gsap.to(pupils, { x: 0, y: 0, duration: 0.3 }); return; }
    if (thinking) { gsap.to(pupils, { x: -2.4, y: -1.8, duration: 0.35, ease: 'power2.out' }); return; }
    let t;
    const look = () => {
      const away = Math.random() < 0.35;
      gsap.to(pupils, { x: away ? gsap.utils.random(-2.4, 2.4) : 0, y: away ? gsap.utils.random(-1.4, 1) : 0, duration: 0.12, ease: 'power2.out' });
      t = setTimeout(look, 900 + Math.random() * 2600);
    };
    t = setTimeout(look, 1200);
    return () => clearTimeout(t);
  }, [listening, thinking]);

  // Speaking: head nod at the start, eyebrow lifts for emphasis. Listening: lean in.
  useEffect(() => {
    const head = headRef.current;
    const brows = browsRef.current;
    if (!head || !brows) return;
    if (listening) { gsap.to(head, { rotate: -3, svgOrigin: '100 190', duration: 0.5, ease: 'power2.out', overwrite: 'auto' }); return; }
    if (!speaking) return;
    gsap.fromTo(head, { y: 0 }, { y: 2.5, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    const lift = setInterval(() => gsap.to(brows, { y: -2.2, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut' }), 1700 + Math.random() * 900);
    return () => { clearInterval(lift); gsap.to(brows, { y: 0, duration: 0.2 }); };
  }, [speaking, listening]);

  // Lip-sync. With the live voice, each word boundary queues that word's
  // mouth shapes. Without it, follow the caption pace (165 ms/word) through
  // `text`, or a natural talking cycle if no text is given.
  useEffect(() => {
    if (!speaking) { setMouth('sil', 0.25); return undefined; }
    const queue = [];
    let lastBoundary = 0;
    let current = '';
    const started = performance.now();
    const onBoundary = (e) => {
      const word = (e.detail.text || '').slice(e.detail.charIndex).match(/^\S+/)?.[0] ?? '';
      const vs = wordVisemes(word);
      queue.length = 0;
      queue.push(...vs);
      lastBoundary = performance.now();
    };
    speechEvents.addEventListener('boundary', onBoundary);
    const tick = () => {
      const now = performance.now();
      let v;
      if (queue.length) v = queue.shift();
      else if (now - lastBoundary < 700) v = current === 'sil' ? 'nn' : 'sil';
      else {
        const words = (textRef.current || '').split(/\s+/).filter(Boolean);
        if (words.length) {
          const elapsed = now - started;
          const w = words[Math.min(words.length - 1, Math.floor(elapsed / 165))];
          const vs = wordVisemes(w);
          v = vs[Math.floor(((elapsed % 165) / 165) * vs.length)];
        } else {
          v = ['aa', 'nn', 'E', 'PP', 'O', 'nn', 'aa', 'E'][Math.floor(Math.random() * 8)];
        }
      }
      if (v !== current) { current = v; setMouth(v); }
    };
    const iv = setInterval(tick, 75);
    return () => { clearInterval(iv); speechEvents.removeEventListener('boundary', onBoundary); };
  }, [speaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop cursor-follow parallax.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e) => {
      const r = svg.getBoundingClientRect();
      gsap.to(headRef.current, {
        x: gsap.utils.clamp(-5, 5, ((e.clientX - (r.left + r.width / 2)) / r.width) * 9),
        y: gsap.utils.clamp(-3, 3, ((e.clientY - (r.top + r.height / 2)) / r.height) * 5),
        duration: 0.6, ease: 'power2.out',
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const rest = visemeFor('sil', expression);
  const grain = getGrain();

  // One arm (drawn extending to the viewer's right); the left arm is a mirror.
  const armShape = (
    <>
      {/* sleeve */}
      <path d="M 132 220 Q 152 219 170 221.5 Q 176 227 170 233 Q 152 235 132 236 Z" fill={url('blazer')} />
      <path d="M 134 221 Q 152 220 169 222.5 M 134 235 Q 152 234 169 232.5" fill="none" stroke={INK} strokeWidth="0.9" opacity="0.7" strokeLinecap="round" />
      <path d="M 169 222 L 173.5 222.3 Q 176.5 227 173.5 232.4 L 169 232.6 Z" fill="#f4ede3" stroke={INK} strokeWidth="0.7" />
      {/* hands */}
      <g fill={url('skin')} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" strokeLinecap="round">
        {handKind === 'point' && (
          <>
            <path d="M 173 222 Q 181 219.5 186 222.5 L 197 222.2 Q 199.5 223.8 197 225.6 L 186 226 Q 188 231 183 233.5 Q 176 234.5 173 231 Z" />
            <path d="M 184 228 Q 187 229.5 185 231.5 M 181.5 230.5 Q 184 232.5 181.5 233.5" fill="none" />
            <path d="M 176 221.6 Q 181 216.5 185.5 218.2 Q 186.5 220.2 183 221.5" />
          </>
        )}
        {handKind === 'open' && (
          <>
            <path d="M 173 222.5 Q 180 220 186 221.5 L 197.5 222 Q 199.5 223.3 197.5 224.6 L 188 225 L 198 226.4 Q 200 227.7 198 229 L 188 229 L 196 230.6 Q 197.8 232 195.8 233 L 185 233 Q 178 235 173 231.5 Z" />
            <path d="M 176 222 Q 180 215.5 185 216 Q 186.8 217.8 183.5 221" />
          </>
        )}
        {handKind === 'wave' && (
          <>
            <path d="M 173 222 Q 180 219 185.5 221 Q 189 226.5 185.5 232.5 Q 179 235 173 232 Z" />
            <path d="M 185 221.5 L 195 214.5 Q 197.5 215 196.5 217.5 L 187.8 224 L 199 221.2 Q 201 222.6 199 224.6 L 188.5 227 L 198.5 229.4 Q 200 231.4 197.6 232.2 L 187.6 229.8 L 194.6 236 Q 195.2 238.4 192.6 238 L 184.8 232" />
            <path d="M 176.5 221.4 Q 178.5 213.5 183.5 212.6 Q 185.6 213.8 183.6 217.6 L 182.2 221" />
          </>
        )}
        {handKind === 'thumb' && (
          <>
            <path d="M 172.5 221.5 Q 181 218.5 188 222 Q 191 227.5 188 233 Q 180 236 172.5 232.5 Z" />
            <path d="M 184 222.4 Q 181.5 214 186.5 209.5 Q 190 208.4 190.6 211.4 L 188.6 221.5" />
            <path d="M 184.5 226 Q 188.5 226.5 188.6 228.5 M 183.5 229.8 Q 187.8 230.4 187.5 232" fill="none" />
          </>
        )}
        {handKind === 'fist' && (
          <>
            <path d="M 172.5 221.5 Q 181.5 218.5 189 222 Q 192 227.5 189 233 Q 180.5 236 172.5 232.5 Z" />
            <path d="M 185 222.4 Q 188.8 223.6 188.2 226 M 185.2 226.6 Q 189.4 227.8 188.8 230.2 M 184.6 230.6 Q 188 231.6 187.4 233.2" fill="none" />
          </>
        )}
      </g>
    </>
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 320"
      width={size}
      height={size * 1.6}
      role="img"
      aria-label={`Elena, your Aurrum career advisor, ${expression} expression${speaking ? ', speaking' : ''}`}
    >
      <defs>
        <radialGradient id={id('skin')} cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#f7d9c2" />
          <stop offset="55%" stopColor="#ebbd9d" />
          <stop offset="100%" stopColor="#d49c7a" />
        </radialGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c48a68" />
          <stop offset="50%" stopColor="#e2ae8c" />
        </linearGradient>
        <linearGradient id={id('hair')} x1="0.2" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#5a3826" />
          <stop offset="50%" stopColor="#3d251a" />
          <stop offset="100%" stopColor="#261710" />
        </linearGradient>
        <linearGradient id={id('blazer')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1ecea" />
          <stop offset="100%" stopColor="#dcd5d0" />
        </linearGradient>
        <radialGradient id={id('iris')} cx="45%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#9a6a42" />
          <stop offset="70%" stopColor="#5a3620" />
          <stop offset="100%" stopColor="#2e1a0f" />
        </radialGradient>
        <radialGradient id={id('cheek')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e07a68" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#e07a68" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('lip')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9525d" />
          <stop offset="100%" stopColor="#cf6f73" />
        </linearGradient>
        {/* Soft gouache edges for shading washes */}
        <filter id={id('wash')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        {grain && (
          <pattern id={id('grain')} patternUnits="userSpaceOnUse" width="48" height="48">
            <image href={grain} width="48" height="48" />
          </pattern>
        )}
        <clipPath id={id('face-clip')}>
          <path d="M 60 106 Q 60 62 100 60 Q 140 62 140 106 Q 140 140 124 160 Q 112 174 100 174 Q 88 174 76 160 Q 60 140 60 106 Z" />
        </clipPath>
        <clipPath id={id('body-clip')}>
          <path d="M 34 320 Q 36 246 64 227 Q 84 216 100 216 Q 116 216 136 227 Q 164 246 166 320 Z" />
        </clipPath>
        <clipPath id={id('eye-l')}><path d="M 69 113 Q 80 103.5 91 112.5 Q 80 119 69 113 Z" /></clipPath>
        <clipPath id={id('eye-r')}><path d="M 109 112.5 Q 120 103.5 131 113 Q 120 119 109 112.5 Z" /></clipPath>
        <clipPath id={id('mouth')}><path ref={mouthClipRef} d={rest.d} /></clipPath>
      </defs>

      {/* ================= Body ================= */}
      <g ref={torsoRef}>
        {/* blazer */}
        <path d="M 34 320 Q 36 246 64 227 Q 84 216 100 216 Q 116 216 136 227 Q 164 246 166 320 Z" fill={url('blazer')} />
        <g clipPath={url('body-clip')}>
          {/* gouache shading: shoulders, side folds, under-lapel shadow */}
          <g filter={url('wash')} opacity="0.4">
            <path d="M 34 260 Q 46 236 66 230 Q 52 262 50 320 L 34 320 Z" fill="#b9b0a8" />
            <path d="M 166 260 Q 154 236 134 230 Q 148 262 150 320 L 166 320 Z" fill="#b9b0a8" />
            <path d="M 70 236 Q 86 262 96 300 L 88 304 Q 78 268 66 244 Z" fill="#c7bfb8" opacity="0.7" />
          </g>
          <path d="M 70 234 Q 64 246 60 262" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />
          {grain && <rect x="30" y="210" width="140" height="110" fill={url('grain')} opacity="0.9" />}
        </g>
        {/* blouse */}
        <path d="M 82 218 L 100 264 L 118 218 Q 100 211 82 218 Z" fill="#f4ede3" />
        <path d="M 86 219 Q 100 238 114 219" fill="none" stroke="#d9cbbb" strokeWidth="1.4" />
        <path d="M 96 244 Q 100 250 104 244" fill="none" stroke="#d9cbbb" strokeWidth="1" />
        {/* lapels */}
        <path d="M 80 219 L 100 268 L 90 283 L 69 236 Q 72 226 80 219 Z" fill="#eae4df" />
        <path d="M 120 219 L 100 268 L 110 283 L 131 236 Q 128 226 120 219 Z" fill="#eae4df" />
        <path d="M 74 232 L 90 283 M 126 232 L 110 283" stroke="#fff" strokeWidth="0.9" opacity="0.7" />
        {/* button + pocket */}
        <circle cx="100" cy="296" r="2.3" fill="#eae4df" stroke={INK} strokeWidth="0.6" />
        <path d="M 118 300 L 140 298" stroke={INK} strokeWidth="0.9" opacity="0.6" strokeLinecap="round" />
        {/* gold pin */}
        <circle cx="122" cy="247" r="3.1" fill="#c9994a" stroke="#8a6326" strokeWidth="0.6" />
        <circle cx="121.1" cy="246.1" r="0.9" fill="#f3d99e" />
        {/* ink outlines (hand-drawn: slightly uneven weight) */}
        <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 34 320 Q 36 246 64 227 Q 84 216 100 216 Q 116 216 136 227 Q 164 246 166 320" strokeWidth="1.3" />
          <path d="M 80 219 L 100 268 L 90 283 L 69 236 Q 72 226 80 219" strokeWidth="1" />
          <path d="M 120 219 L 100 268 L 110 283 L 131 236 Q 128 226 120 219" strokeWidth="1" />
          <path d="M 82 218 L 100 264 L 118 218" strokeWidth="0.8" opacity="0.8" />
          <path d="M 37 296 Q 42 256 60 234" strokeWidth="0.6" opacity="0.5" />
        </g>
      </g>

      {/* ================= Head ================= */}
      <g ref={headRef}>
        {/* long hair behind */}
        <path
          d="M 100 36 C 57 36 40 70 43 112 C 45 152 34 188 49 214 C 64 222 78 210 77 197 C 70 170 64 140 64 112 L 136 112 C 136 140 130 170 123 197 C 122 210 136 222 151 214 C 166 188 155 152 157 112 C 160 70 143 36 100 36 Z"
          fill={url('hair')}
        />
        <g fill="none" strokeLinecap="round">
          <path d="M 52 120 C 50 150 46 180 52 208 M 58 128 C 57 160 58 188 66 206 M 148 120 C 150 150 154 180 148 208 M 142 128 C 143 160 142 188 134 206" stroke="#6b4530" strokeWidth="1" opacity="0.6" />
          <path d="M 47 140 C 44 168 42 190 47 210 M 153 140 C 156 168 158 190 153 210" stroke="#1d110b" strokeWidth="1.2" opacity="0.6" />
        </g>
        {/* neck + shadow under the jaw */}
        <path d="M 83 156 Q 84 190 78 214 Q 100 226 122 214 Q 116 190 117 156 Z" fill={url('neck')} />
        <path d="M 83 168 Q 100 186 117 168 L 117 158 L 83 158 Z" fill="#a8704f" opacity="0.45" filter={url('wash')} />
        <path d="M 83.5 164 Q 84 192 78.5 213 M 116.5 164 Q 116 192 121.5 213" stroke={INK} strokeWidth="0.8" opacity="0.6" />

        {/* face */}
        <path d="M 60 106 Q 60 62 100 60 Q 140 62 140 106 Q 140 140 124 160 Q 112 174 100 174 Q 88 174 76 160 Q 60 140 60 106 Z" fill={url('skin')} />
        <g clipPath={url('face-clip')}>
          <g filter={url('wash')}>
            {/* temples, jaw, eye sockets, nose side */}
            <path d="M 60 100 Q 64 140 84 170 L 60 170 Z" fill="#c68766" opacity="0.4" />
            <path d="M 140 100 Q 136 140 116 170 L 140 170 Z" fill="#c68766" opacity="0.4" />
            <ellipse cx="80" cy="106" rx="12" ry="5" fill="#c9896a" opacity="0.28" />
            <ellipse cx="120" cy="106" rx="12" ry="5" fill="#c9896a" opacity="0.28" />
            <path d="M 95 116 Q 92 130 91 136 L 95 136 Z" fill="#c48262" opacity="0.4" />
            <ellipse cx="100" cy="72" rx="34" ry="10" fill="#b77a5a" opacity="0.35" />
          </g>
          <ellipse cx="74" cy="132" rx="11" ry="7" fill={url('cheek')} />
          <ellipse cx="126" cy="132" rx="11" ry="7" fill={url('cheek')} />
          <path d="M 105 90 Q 110 110 108 124" stroke="#fff" strokeWidth="3" opacity="0.12" fill="none" filter={url('wash')} />
          {grain && <rect x="56" y="56" width="90" height="122" fill={url('grain')} opacity="0.7" />}
        </g>
        <path d="M 60 106 Q 60 62 100 60 Q 140 62 140 106 Q 140 140 124 160 Q 112 174 100 174 Q 88 174 76 160 Q 60 140 60 106" fill="none" stroke={INK} strokeWidth="1.1" opacity="0.75" strokeLinecap="round" />
        {/* ears (mostly under hair) + earrings */}
        <path d="M 61 118 Q 55 122 58 134 Q 60 138 63 136" fill="#e2ad8b" stroke={INK} strokeWidth="0.8" />
        <path d="M 139 118 Q 145 122 142 134 Q 140 138 137 136" fill="#e2ad8b" stroke={INK} strokeWidth="0.8" />
        <circle cx="60.5" cy="139" r="2.3" fill="#c9994a" stroke="#8a6326" strokeWidth="0.5" />
        <circle cx="139.5" cy="139" r="2.3" fill="#c9994a" stroke="#8a6326" strokeWidth="0.5" />

        {/* eyebrows (hair-like double stroke) */}
        <g transform="translate(0 7)">
          <g ref={browsRef}>
            <path ref={browLRef} d={EYEBROW.friendly.l} fill="none" stroke="#3a2419" strokeWidth="3" strokeLinecap="round" />
            <path ref={browRRef} d={EYEBROW.friendly.r} fill="none" stroke="#3a2419" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>

        {/* eyes */}
        <g ref={eyesRef}>
          <path d="M 70 106 Q 80 99.5 90 106" fill="none" stroke="#a8704f" strokeWidth="1" opacity="0.7" />
          <path d="M 110 106 Q 120 99.5 130 106" fill="none" stroke="#a8704f" strokeWidth="1" opacity="0.7" />
          <path d="M 69 113 Q 80 103.5 91 112.5 Q 80 119 69 113 Z" fill="#faf5f0" />
          <path d="M 109 112.5 Q 120 103.5 131 113 Q 120 119 109 112.5 Z" fill="#faf5f0" />
          <g ref={pupilsRef}>
            <g clipPath={url('eye-l')}>
              <circle cx="80" cy="111.5" r="4.9" fill={url('iris')} stroke="#2a170d" strokeWidth="0.6" />
              <circle cx="80" cy="111.5" r="2.1" fill="#120a06" />
              <circle cx="81.7" cy="109.7" r="1.15" fill="#fff" />
              <circle cx="78.4" cy="113.2" r="0.5" fill="#fff" opacity="0.6" />
            </g>
            <g clipPath={url('eye-r')}>
              <circle cx="120" cy="111.5" r="4.9" fill={url('iris')} stroke="#2a170d" strokeWidth="0.6" />
              <circle cx="120" cy="111.5" r="2.1" fill="#120a06" />
              <circle cx="121.7" cy="109.7" r="1.15" fill="#fff" />
              <circle cx="118.4" cy="113.2" r="0.5" fill="#fff" opacity="0.6" />
            </g>
          </g>
          {/* upper-lid shadow on the eyeball */}
          <path d="M 69 113 Q 80 103.5 91 112.5 Q 80 107 69 113 Z" fill="#6b4030" opacity="0.25" />
          <path d="M 109 112.5 Q 120 103.5 131 113 Q 120 107 109 112.5 Z" fill="#6b4030" opacity="0.25" />
          {/* lid lines + lashes */}
          <path d="M 67.5 113 Q 80 102 92 112" fill="none" stroke="#1f120b" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M 108 112 Q 120 102 132.5 113" fill="none" stroke="#1f120b" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M 67.5 113 l -3 -1.8 M 70 110 l -2.4 -2.6 M 73 107.6 l -1.6 -2.8 M 132.5 113 l 3 -1.8 M 130 110 l 2.4 -2.6 M 127 107.6 l 1.6 -2.8" stroke="#1f120b" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M 71 115.2 Q 80 119.6 89 114.6 M 111 114.6 Q 120 119.6 129 115.2" fill="none" stroke="#9c6446" strokeWidth="0.9" opacity="0.8" />
        </g>

        {/* nose */}
        <path d="M 97.5 114 Q 95.5 128 92.5 135 Q 95.5 139.5 100 139" fill="none" stroke="#a86a4a" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 93.5 136.6 q 2 1.6 4 0.8 M 102.5 137.6 q 2 0.8 4 -0.8" fill="none" stroke="#8f553a" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M 102 118 Q 103 127 104.5 132" fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.3" strokeLinecap="round" />
        {/* philtrum */}
        <path d="M 98.2 140.5 L 98.8 143.6 M 101.8 140.5 L 101.2 143.6" stroke="#b67a5c" strokeWidth="0.7" opacity="0.6" />

        {/* glasses — round wire frames */}
        <g fill="none" stroke="#2a2118" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.92">
          <circle cx="80" cy="112" r="14.5" />
          <circle cx="120" cy="112" r="14.5" />
          <path d="M 94.5 111 Q 100 107.5 105.5 111" />
          <path d="M 65.5 110 L 58 107" />
          <path d="M 134.5 110 L 142 107" />
        </g>
        <circle cx="80" cy="112" r="14.5" fill="#fff" opacity="0.05" />
        <circle cx="120" cy="112" r="14.5" fill="#fff" opacity="0.05" />

        {/* mouth: dark interior + teeth (clipped to the mouth shape) + lips */}
        <path ref={mouthRef} d={rest.d} fill="#5e1f28" stroke={url('lip')} strokeWidth="3.4" strokeLinejoin="round" />
        <g clipPath={url('mouth')}>
          <g ref={teethRef} opacity="0">
            <path d="M 86 143 Q 100 141.5 114 143 L 114 147.6 Q 100 149 86 147.6 Z" fill="#f6f1ea" />
            <path d="M 90 154 Q 100 150.5 110 154 L 110 160 L 90 160 Z" fill="#b84a55" opacity="0.8" />
          </g>
        </g>
        <path d="M 95 150.2 Q 100 151.6 105 150.2" stroke="#fff" strokeWidth="0.9" opacity="0.35" fill="none" strokeLinecap="round" />

        {/* front hair: side-swept fringe + loose strands */}
        <path d="M 58 108 C 54 66 74 46 102 46 C 132 46 148 66 142 106 C 138 86 128 72 112 66 C 100 76 80 82 62 96 Z" fill={url('hair')} />
        <g fill="none" strokeLinecap="round">
          <path d="M 112 66 C 102 76 84 82 66 93 M 118 58 C 130 64 138 78 140 96 M 90 52 C 76 58 64 74 62 96 M 104 50 C 90 58 76 72 70 90" stroke="#7a5238" strokeWidth="1" opacity="0.75" />
          <path d="M 122 62 C 132 72 136 86 137 100 M 96 56 C 84 64 72 78 66 94" stroke="#20130c" strokeWidth="1" opacity="0.55" />
          {/* loose strands falling past the face */}
          <path d="M 64 98 C 60 116 62 132 58 146" stroke="#3d251a" strokeWidth="0.9" opacity="0.85" />
          <path d="M 138 100 C 142 118 139 134 143 150" stroke="#3d251a" strokeWidth="0.9" opacity="0.85" />
          <path d="M 108 64 C 116 72 121 78 124 90" stroke="#5a3826" strokeWidth="0.7" opacity="0.7" />
        </g>
        <path d="M 58 108 C 54 66 74 46 102 46 C 132 46 148 66 142 106" fill="none" stroke={INK} strokeWidth="1" opacity="0.7" strokeLinecap="round" />
        <path d="M 100 36 C 57 36 40 70 43 112 C 45 152 34 188 49 214 M 100 36 C 143 36 160 70 157 112 C 155 152 166 188 151 214" fill="none" stroke={INK} strokeWidth="1.1" opacity="0.7" strokeLinecap="round" />
      </g>

      {/* ================= Arms (above the head so gestures are never hidden) ================= */}
      <g>
        <g ref={armLRef} opacity="0">
          <g transform="matrix(-1 0 0 1 200 0)">{armShape}</g>
        </g>
        <g ref={armRRef} opacity="0">{armShape}</g>
      </g>
    </svg>
  );
}
