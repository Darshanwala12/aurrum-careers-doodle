import { useEffect, useId, useRef } from 'react';
import gsap from 'gsap';
import { resolveState } from './stateMap.js';
import { speechEvents } from '../ai/voiceAdapter.js';

// ---------- Mouth ----------
const CY = 147;
const mouthPath = (w, lift, top, bottom) =>
  `M ${100 - w} ${CY - lift} Q 100 ${CY + lift * 0.5 - 1 - top} ${100 + w} ${CY - lift} Q 100 ${CY + lift * 0.5 + 2 + bottom} ${100 - w} ${CY - lift} Z`;

const REST = {
  friendly:   [14.5, 3.4, 1.6], explaining: [14, 2.2, 1.4], concerned: [12, -1.6, 1.3],
  confident:  [15, 3.2, 1.4],   calm:       [13, 1.8, 1.4],  motivating: [16.5, 4.4, 3.5],
  curious:    [11.5, 1.2, 1.4], serious:    [13, 0, 1],       surprised:  [7.5, 0, 6.5],
};
const VISEME = {
  sil: null,
  PP:  [13, 0, 0.4],
  FF:  [13, 0, 3.2],
  nn:  [13, 0.5, 3.5],
  aa:  [12.5, 2, 10],
  E:   [15.5, 1, 5],
  O:   [9, 2.5, 8.5],
  U:   [6.5, 1.8, 5.5],
};
function visemeFor(v, expr) {
  const [rw, lift, rb] = REST[expr] ?? REST.friendly;
  const s = VISEME[v];
  if (!s) return { d: mouthPath(rw, lift, 0, rb), teeth: 0 };
  const smile = Math.max(0, lift) * 0.5;
  return { d: mouthPath(s[0], smile, s[1], s[2]), teeth: v === 'aa' || v === 'E' || v === 'FF' || v === 'nn' ? 1 : v === 'O' ? 0.5 : 0 };
}
function wordVisemes(word) {
  const out = [];
  for (const ch of word.toLowerCase().replace(/[^a-z]/g, '')) {
    const v = 'a'.includes(ch) ? 'aa' : 'eiy'.includes(ch) ? 'E' : ch === 'o' ? 'O' : 'uwq'.includes(ch) ? 'U'
      : 'mbp'.includes(ch) ? 'PP' : 'fv'.includes(ch) ? 'FF' : 'nn';
    if (out[out.length - 1] !== v) out.push(v);
  }
  return out.slice(0, 7).length ? out.slice(0, 7) : ['nn'];
}

// ---------- Eyebrows ----------
const EYEBROW = {
  friendly:   { l: 'M 62 92 Q 74 86 86 91',  r: 'M 114 91 Q 126 86 138 92' },
  explaining: { l: 'M 62 90 Q 74 83 86 89',  r: 'M 114 89 Q 126 83 138 90' },
  concerned:  { l: 'M 62 88 Q 74 94 86 90',  r: 'M 114 90 Q 126 94 138 88' },
  confident:  { l: 'M 62 89 Q 76 82 88 88',  r: 'M 112 88 Q 124 82 138 89' },
  calm:       { l: 'M 62 91 Q 74 88 86 91',  r: 'M 114 91 Q 126 88 138 91' },
  motivating: { l: 'M 60 87 Q 76 79 88 87',  r: 'M 112 87 Q 124 79 140 87' },
  curious:    { l: 'M 62 89 Q 72 80 84 90',  r: 'M 116 90 Q 128 80 138 89' },
  serious:    { l: 'M 62 90 Q 74 87 86 90',  r: 'M 114 90 Q 126 87 138 90' },
  surprised:  { l: 'M 60 84 Q 74 76 88 84',  r: 'M 112 84 Q 126 76 140 84' },
};

// ---------- Arms ----------
const ARM_HIDDEN = { rotate: 24, opacity: 0 };
const ARM_POSE = {
  wave:          { rotate: -62, opacity: 1 },
  'point-right': { rotate: -18, opacity: 1 },
  'point-left':  { rotate: -18, opacity: 1 },
  'point-up':    { rotate: -78, opacity: 1 },
  'point-down':  { rotate: 22,  opacity: 1 },
  explain:       { rotate: -30, opacity: 1 },
  thumb:         { rotate: -48, opacity: 1 },
  chin:          { rotate: -114, opacity: 1 },
  none:          ARM_HIDDEN,
};
const HAND_FOR = {
  wave: 'wave', 'point-right': 'point', 'point-left': 'point', 'point-up': 'point', 'point-down': 'point',
  explain: 'open', thumb: 'thumb', chin: 'fist', none: 'open',
};

// ---------- Pencil grain (once, shared) ----------
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
    img.data[i + 3] = Math.random() < 0.5 ? 22 : 0;
  }
  ctx.putImageData(img, 0, 0);
  grainURL = c.toDataURL();
  return grainURL;
}

const INK = '#2c1c0f';

export default function DoodleCompanion({ state = 'idle', speaking = false, size = 260, text = '' }) {
  const { expression, arm } = resolveState(state);
  const uid = useId().replace(/:/g, '');
  const id  = (n) => `${uid}-${n}`;
  const url = (n) => `url(#${id(n)})`;

  const svgRef      = useRef(null);
  const mouthRef    = useRef(null);
  const mouthClipRef= useRef(null);
  const teethRef    = useRef(null);
  const browLRef    = useRef(null);
  const browRRef    = useRef(null);
  const eyesRef     = useRef(null);
  const headRef     = useRef(null);
  const torsoRef    = useRef(null);
  const armRRef     = useRef(null);
  const armLRef     = useRef(null);
  const pupilsRef   = useRef(null);
  const browsRef    = useRef(null);
  const wristRRef   = useRef(null);
  const wristLRef   = useRef(null);

  const exprRef = useRef(expression);
  exprRef.current = expression;
  const textRef = useRef(text);
  textRef.current = text;
  const listening = state === 'listening';
  const thinking  = state === 'thinking';
  const handKind  = HAND_FOR[arm] ?? 'open';

  const setMouth = (v, dur = 0.08) => {
    const m = visemeFor(v, exprRef.current);
    if (mouthRef.current)     gsap.to([mouthRef.current, mouthClipRef.current], { attr: { d: m.d }, duration: dur, ease: 'power1.out', overwrite: 'auto' });
    if (teethRef.current)     gsap.to(teethRef.current,  { opacity: m.teeth, duration: dur, overwrite: 'auto' });
  };

  // Blink
  useEffect(() => {
    let cancelled = false; let t;
    const blink = () => {
      if (cancelled || !eyesRef.current) return;
      gsap.to(eyesRef.current, { scaleY: 0.06, duration: 0.065, transformOrigin: 'center', yoyo: true, repeat: 1, ease: 'power1.inOut' });
      t = setTimeout(blink, Math.random() < 0.18 ? 240 : 2000 + Math.random() * 3400);
    };
    t = setTimeout(blink, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // Idle: gentle head sway + breathing torso
  useEffect(() => {
    if (!headRef.current || !torsoRef.current) return;
    const head   = gsap.to(headRef.current,  { rotate: 1.6,  svgOrigin: '100 190', duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const breath = gsap.to(torsoRef.current, { scaleY: 1.013, svgOrigin: '100 320', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    // Subtle weight-shift: slight left-right swing on torso
    const sway   = gsap.to(torsoRef.current, { rotate: 0.5, svgOrigin: '100 320', duration: 4.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.9 });
    return () => { head.kill(); breath.kill(); sway.kill(); };
  }, []);

  // Expression: brows + resting mouth
  useEffect(() => {
    const brow = EYEBROW[expression] ?? EYEBROW.friendly;
    if (browLRef.current) gsap.to(browLRef.current, { attr: { d: brow.l }, duration: 0.45, ease: 'power2.out' });
    if (browRRef.current) gsap.to(browRRef.current, { attr: { d: brow.r }, duration: 0.45, ease: 'power2.out' });
    if (!speaking) setMouth('sil', 0.4);
  }, [expression]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arms: swing into pose, optional wrist oscillation while speaking
  useEffect(() => {
    const useLeft = arm === 'point-left';
    const active  = useLeft ? armLRef  : armRRef;
    const idle    = useLeft ? armRRef  : armLRef;
    const wActive = useLeft ? wristLRef : wristRRef;
    const wIdle   = useLeft ? wristRRef : wristLRef;
    if (!active.current || !idle.current) return;
    const origin = (ref) => (ref === armLRef ? '62 228' : '138 228');
    const mirror = (ref, p) => (ref === armLRef ? { ...p, rotate: -p.rotate } : p);
    const pose = ARM_POSE[arm] ?? ARM_HIDDEN;
    gsap.to(active.current, { ...mirror(active, pose), svgOrigin: origin(active), duration: 0.65, ease: 'back.out(1.6)' });
    gsap.to(idle.current,   { ...mirror(idle, ARM_HIDDEN), svgOrigin: origin(idle), duration: 0.38, ease: 'power2.in' });
    if (wIdle.current)  gsap.to(wIdle.current,  { rotate: 0, duration: 0.3 });

    let wave;
    if (arm === 'wave') {
      wave = gsap.to(active.current, { rotate: pose.rotate - 14, svgOrigin: origin(active), duration: 0.25, yoyo: true, repeat: 6, ease: 'sine.inOut', delay: 0.55 });
    }

    // Subtle wrist oscillation while arm is visible
    let wrist;
    if (pose.opacity === 1 && wActive.current) {
      wrist = gsap.to(wActive.current, { rotate: 4, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.7 });
    }

    return () => {
      wave?.kill(); wrist?.kill();
      gsap.to(active.current, { ...mirror(active, ARM_HIDDEN), svgOrigin: origin(active), duration: 0.38, ease: 'power2.in' });
      if (wActive.current) gsap.to(wActive.current, { rotate: 0, duration: 0.3 });
    };
  }, [arm]);

  // Eyes: saccades / listening / thinking
  useEffect(() => {
    const pupils = pupilsRef.current;
    if (!pupils) return;
    if (listening) { gsap.to(pupils, { x: 0, y: 0, duration: 0.28 }); return; }
    if (thinking)  { gsap.to(pupils, { x: -2.6, y: -2, duration: 0.32, ease: 'power2.out' }); return; }
    let t;
    const look = () => {
      const away = Math.random() < 0.35;
      gsap.to(pupils, { x: away ? gsap.utils.random(-2.4, 2.4) : 0, y: away ? gsap.utils.random(-1.4, 1) : 0, duration: 0.11, ease: 'power2.out' });
      t = setTimeout(look, 900 + Math.random() * 2400);
    };
    t = setTimeout(look, 1100);
    return () => clearTimeout(t);
  }, [listening, thinking]);

  // Head + brows while speaking / listening / thinking
  useEffect(() => {
    const head  = headRef.current;
    const brows = browsRef.current;
    if (!head || !brows) return;

    if (thinking) {
      // Tilt head slightly right + look up-left
      gsap.to(head, { rotate: -5, x: 0, svgOrigin: '100 190', duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    if (listening) {
      // Lean forward very slightly
      gsap.to(head, { rotate: -2.5, y: -1.5, svgOrigin: '100 190', duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    // Reset position
    gsap.to(head, { rotate: 0, x: 0, y: 0, svgOrigin: '100 190', duration: 0.55, ease: 'power2.out', overwrite: 'auto' });

    if (!speaking) return;
    // Speaking: initial nod + periodic micro-nods + brow lifts
    gsap.fromTo(head, { y: 0 }, { y: 2, duration: 0.16, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    const nods  = gsap.to(head,  { y: 2, svgOrigin: '100 190', duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.7 });
    const lifts = setInterval(() => gsap.to(brows, { y: -2.4, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' }), 1600 + Math.random() * 800);
    return () => { nods.kill(); clearInterval(lifts); gsap.to([brows, head], { y: 0, duration: 0.2 }); };
  }, [speaking, listening, thinking]);

  // Lip-sync
  useEffect(() => {
    if (!speaking) { setMouth('sil', 0.25); return undefined; }
    const queue = []; let lastBoundary = 0; let current = '';
    const started = performance.now();
    const onBoundary = (e) => {
      const word = (e.detail.text || '').slice(e.detail.charIndex).match(/^\S+/)?.[0] ?? '';
      queue.length = 0; queue.push(...wordVisemes(word)); lastBoundary = performance.now();
    };
    speechEvents.addEventListener('boundary', onBoundary);
    const tick = () => {
      const now = performance.now(); let v;
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

  // Mouse parallax (desktop only)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e) => {
      const r = svg.getBoundingClientRect();
      gsap.to(headRef.current, {
        x: gsap.utils.clamp(-5, 5, ((e.clientX - (r.left + r.width / 2)) / r.width) * 9),
        y: gsap.utils.clamp(-3, 3, ((e.clientY - (r.top  + r.height / 2)) / r.height) * 5),
        duration: 0.55, ease: 'power2.out',
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const rest  = visemeFor('sil', expression);
  const grain = getGrain();

  // Arm + hand shape
  const armShape = (
    <>
      {/* Sleeve — deep navy matches the blazer */}
      <path d="M 132 220 Q 152 219 170 221.5 Q 176 227 170 233 Q 152 235 132 236 Z" fill={url('blazer-arm')} />
      <path d="M 134 221 Q 152 220 169 222.5 M 134 235 Q 152 234 169 232.5" fill="none" stroke="#fff" strokeWidth="0.7" opacity="0.15" strokeLinecap="round" />
      {/* cuff */}
      <path d="M 169 222 L 173.5 222.3 Q 176.5 227 173.5 232.4 L 169 232.6 Z" fill="#f5ede0" stroke={INK} strokeWidth="0.7" />
      {/* hand group — wrapped for wrist micro-rotation */}
      <g ref={arm === 'point-left' ? wristLRef : wristRRef} style={{ transformOrigin: '173px 227px' }}>
        <g fill={url('skin-arm')} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" strokeLinecap="round">
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
        {/* ── Skin ── */}
        <radialGradient id={id('skin')} cx="44%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#fce8d4" />
          <stop offset="40%"  stopColor="#f0c9a0" />
          <stop offset="80%"  stopColor="#d9a070" />
          <stop offset="100%" stopColor="#c4895a" />
        </radialGradient>
        <radialGradient id={id('skin-arm')} cx="40%" cy="30%" r="75%">
          <stop offset="0%"   stopColor="#f8dfc4" />
          <stop offset="100%" stopColor="#c9895a" />
        </radialGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#b8794f" />
          <stop offset="50%"  stopColor="#d9a070" />
        </linearGradient>
        {/* ── Hair: warm dark-chocolate with amber highlight ── */}
        <linearGradient id={id('hair')} x1="0.25" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="#4a2e1c" />
          <stop offset="35%"  stopColor="#311a0e" />
          <stop offset="100%" stopColor="#1e0e07" />
        </linearGradient>
        <linearGradient id={id('hair-hi')} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%"   stopColor="#7a4f2e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3d2213"  stopOpacity="0" />
        </linearGradient>
        {/* ── Blazer: deep navy teal (luxe/premium) ── */}
        <linearGradient id={id('blazer')} x1="0.15" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#1f5570" />
          <stop offset="55%"  stopColor="#133d52" />
          <stop offset="100%" stopColor="#0a2636" />
        </linearGradient>
        <linearGradient id={id('blazer-arm')} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%"   stopColor="#1a4e68" />
          <stop offset="100%" stopColor="#0d3044" />
        </linearGradient>
        <linearGradient id={id('blazer-lapel')} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#1d5875" />
          <stop offset="100%" stopColor="#0e3b52" />
        </linearGradient>
        {/* ── Eyes ── */}
        <radialGradient id={id('iris')} cx="40%" cy="36%" r="64%">
          <stop offset="0%"   stopColor="#b07840" />
          <stop offset="55%"  stopColor="#6a3e20" />
          <stop offset="85%"  stopColor="#341c0c" />
          <stop offset="100%" stopColor="#1a0c05" />
        </radialGradient>
        {/* ── Cheek blush ── */}
        <radialGradient id={id('cheek')} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#d96a58" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#d96a58" stopOpacity="0" />
        </radialGradient>
        {/* ── Lips: rose-mauve ── */}
        <linearGradient id={id('lip')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#a84656" />
          <stop offset="100%" stopColor="#c46a72" />
        </linearGradient>
        {/* ── Studio light bloom behind Elena ── */}
        <radialGradient id={id('glow')} cx="50%" cy="28%" r="55%">
          <stop offset="0%"   stopColor="#fff8f0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff8f0" stopOpacity="0" />
        </radialGradient>
        {/* ── Filters ── */}
        <filter id={id('wash')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
        {grain && (
          <pattern id={id('grain')} patternUnits="userSpaceOnUse" width="48" height="48">
            <image href={grain} width="48" height="48" />
          </pattern>
        )}
        {/* ── Clip paths ── */}
        <clipPath id={id('face-clip')}>
          <path d="M 60 106 Q 60 62 100 60 Q 140 62 140 106 Q 140 140 124 160 Q 112 174 100 174 Q 88 174 76 160 Q 60 140 60 106 Z" />
        </clipPath>
        <clipPath id={id('body-clip')}>
          <path d="M 30 320 Q 32 244 62 225 Q 82 214 100 214 Q 118 214 138 225 Q 168 244 170 320 Z" />
        </clipPath>
        <clipPath id={id('eye-l')}><path d="M 69 113 Q 80 103.5 91 112.5 Q 80 119 69 113 Z" /></clipPath>
        <clipPath id={id('eye-r')}><path d="M 109 112.5 Q 120 103.5 131 113 Q 120 119 109 112.5 Z" /></clipPath>
        <clipPath id={id('mouth')}><path ref={mouthClipRef} d={rest.d} /></clipPath>
      </defs>

      {/* ── Studio light glow (behind everything) ── */}
      <ellipse cx="100" cy="80" rx="88" ry="100" fill={url('glow')} />

      {/* ═══════════════ BODY ═══════════════ */}
      <g ref={torsoRef}>
        {/* Blazer body */}
        <path d="M 30 320 Q 32 244 62 225 Q 82 214 100 214 Q 118 214 138 225 Q 168 244 170 320 Z" fill={url('blazer')} />
        <g clipPath={url('body-clip')}>
          {/* Shading: shoulder facets, side folds, ambient occlusion under collar */}
          <g filter={url('wash')} opacity="0.5">
            <path d="M 30 268 Q 44 238 66 228 Q 50 264 46 320 L 30 320 Z" fill="#0a2032" />
            <path d="M 170 268 Q 156 238 134 228 Q 150 264 154 320 L 170 320 Z" fill="#0a2032" />
            <path d="M 70 234 Q 88 268 96 308 L 86 308 Q 76 272 64 246 Z" fill="#1a4258" opacity="0.6" />
            <path d="M 130 234 Q 112 268 104 308 L 114 308 Q 124 272 136 246 Z" fill="#1a4258" opacity="0.6" />
          </g>
          {/* Shoulder highlight */}
          <path d="M 66 232 Q 62 248 58 264" fill="none" stroke="#5aa0c0" strokeWidth="2" opacity="0.18" strokeLinecap="round" />
          <path d="M 134 232 Q 138 248 142 264" fill="none" stroke="#5aa0c0" strokeWidth="2" opacity="0.18" strokeLinecap="round" />
          {grain && <rect x="26" y="208" width="148" height="116" fill={url('grain')} opacity="0.7" />}
        </g>

        {/* Blouse (ivory V-neck) */}
        <path d="M 81 217 L 100 266 L 119 217 Q 100 209 81 217 Z" fill="#faf4ec" />
        <path d="M 85 218 Q 100 240 115 218" fill="none" stroke="#ded4c4" strokeWidth="1.3" />
        <path d="M 97 246 Q 100 252 103 246"  fill="none" stroke="#ded4c4" strokeWidth="0.9" />

        {/* Lapels: slightly lighter navy with interior highlight edge */}
        <path d="M 79 218 L 100 270 L 89 285 L 67 234 Q 70 224 79 218 Z" fill={url('blazer-lapel')} />
        <path d="M 121 218 L 100 270 L 111 285 L 133 234 Q 130 224 121 218 Z" fill={url('blazer-lapel')} />
        {/* lapel highlight edge */}
        <path d="M 73 230 L 89 285 M 127 230 L 111 285" stroke="#5ab4d8" strokeWidth="0.8" opacity="0.22" strokeLinecap="round" />

        {/* Pocket square — pale ivory */}
        <path d="M 122 252 L 136 250 L 137 258 L 126 260 Z" fill="#f5eede" stroke={INK} strokeWidth="0.6" opacity="0.85" />
        <path d="M 124 252 Q 128 248 133 252 M 129 250 L 130 246" stroke={INK} strokeWidth="0.55" opacity="0.6" fill="none" />

        {/* Gold pin */}
        <circle cx="123" cy="245" r="3.2" fill="#c9a445" stroke="#8a6520" strokeWidth="0.65" />
        <circle cx="122" cy="244" r="1.1" fill="#f6dfa0" />

        {/* Ink outlines */}
        <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 30 320 Q 32 244 62 225 Q 82 214 100 214 Q 118 214 138 225 Q 168 244 170 320" strokeWidth="1.2" />
          <path d="M 79 218 L 100 270 L 89 285 L 67 234 Q 70 224 79 218" strokeWidth="1" />
          <path d="M 121 218 L 100 270 L 111 285 L 133 234 Q 130 224 121 218" strokeWidth="1" />
          <path d="M 81 217 L 100 266 L 119 217" strokeWidth="0.75" opacity="0.75" />
          <path d="M 36 298 Q 42 256 60 234" strokeWidth="0.55" opacity="0.45" />
        </g>
      </g>

      {/* ═══════════════ HEAD ═══════════════ */}
      <g ref={headRef}>
        {/* Long hair (behind face) */}
        <path
          d="M 100 36 C 57 36 40 70 43 112 C 45 152 34 188 49 214 C 64 222 78 210 77 197 C 70 170 64 140 64 112 L 136 112 C 136 140 130 170 123 197 C 122 210 136 222 151 214 C 166 188 155 152 157 112 C 160 70 143 36 100 36 Z"
          fill={url('hair')}
        />
        {/* Amber highlight on hair */}
        <path
          d="M 100 36 C 57 36 40 70 43 112 C 45 140 38 170 46 206 C 56 212 68 206 68 197 C 66 170 62 140 63 112 L 82 112 Q 88 80 100 60 Z"
          fill={url('hair-hi')}
          opacity="0.55"
        />
        <g fill="none" strokeLinecap="round">
          <path d="M 52 120 C 50 150 46 180 52 208 M 58 128 C 57 160 58 188 66 206 M 148 120 C 150 150 154 180 148 208 M 142 128 C 143 160 142 188 134 206" stroke="#6b4530" strokeWidth="0.9" opacity="0.55" />
          <path d="M 47 140 C 44 168 42 190 47 210 M 153 140 C 156 168 158 190 153 210" stroke="#1d110b" strokeWidth="1.1" opacity="0.6" />
        </g>

        {/* Neck + under-jaw shadow */}
        <path d="M 83 156 Q 84 190 78 214 Q 100 226 122 214 Q 116 190 117 156 Z" fill={url('neck')} />
        <path d="M 83 168 Q 100 186 117 168 L 117 158 L 83 158 Z" fill="#9c6040" opacity="0.4" filter={url('wash')} />

        {/* Face */}
        <path d="M 60 106 Q 60 62 100 60 Q 140 62 140 106 Q 140 140 124 160 Q 112 174 100 174 Q 88 174 76 160 Q 60 140 60 106 Z" fill={url('skin')} />
        <g clipPath={url('face-clip')}>
          <g filter={url('wash')}>
            <path d="M 60 100 Q 64 140 84 170 L 60 170 Z" fill="#c07a55" opacity="0.35" />
            <path d="M 140 100 Q 136 140 116 170 L 140 170 Z" fill="#c07a55" opacity="0.35" />
            <ellipse cx="78"  cy="104" rx="13" ry="5.5" fill="#c4805c" opacity="0.24" />
            <ellipse cx="122" cy="104" rx="13" ry="5.5" fill="#c4805c" opacity="0.24" />
            <path d="M 95 116 Q 92 130 91 136 L 95 136 Z" fill="#b87a58" opacity="0.38" />
            <ellipse cx="100" cy="70" rx="34" ry="12" fill="#a8704a" opacity="0.28" />
          </g>
          {/* Cheek blush */}
          <ellipse cx="73"  cy="133" rx="12" ry="7.5" fill={url('cheek')} />
          <ellipse cx="127" cy="133" rx="12" ry="7.5" fill={url('cheek')} />
          {/* Specular highlight on forehead/nose bridge */}
          <path d="M 104 88 Q 110 112 107 126" stroke="#fff" strokeWidth="3.5" opacity="0.1" fill="none" filter={url('soft')} />
          {grain && <rect x="56" y="56" width="90" height="122" fill={url('grain')} opacity="0.65" />}
        </g>
        {/* Face outline */}
        <path d="M 60 106 Q 60 62 100 60 Q 140 62 140 106 Q 140 140 124 160 Q 112 174 100 174 Q 88 174 76 160 Q 60 140 60 106" fill="none" stroke={INK} strokeWidth="1.05" opacity="0.7" strokeLinecap="round" />

        {/* Ears + earrings */}
        <path d="M 61 118 Q 55 122 58 134 Q 60 138 63 136" fill="#d99e78" stroke={INK} strokeWidth="0.8" />
        <path d="M 139 118 Q 145 122 142 134 Q 140 138 137 136" fill="#d99e78" stroke={INK} strokeWidth="0.8" />
        {/* Teardrop earrings — rose gold */}
        <ellipse cx="59.5" cy="140" rx="2.8" ry="3.6" fill="#d4956a" stroke="#9a6535" strokeWidth="0.55" />
        <ellipse cx="140.5" cy="140" rx="2.8" ry="3.6" fill="#d4956a" stroke="#9a6535" strokeWidth="0.55" />
        <circle cx="59.5" cy="137" r="1.2" fill="#c9994a" stroke="#8a6326" strokeWidth="0.45" />
        <circle cx="140.5" cy="137" r="1.2" fill="#c9994a" stroke="#8a6326" strokeWidth="0.45" />

        {/* Eyebrows */}
        <g transform="translate(0 7)">
          <g ref={browsRef}>
            <path ref={browLRef} d={EYEBROW.friendly.l} fill="none" stroke="#2e1a0e" strokeWidth="2.8" strokeLinecap="round" />
            <path ref={browRRef} d={EYEBROW.friendly.r} fill="none" stroke="#2e1a0e" strokeWidth="2.8" strokeLinecap="round" />
            {/* Soft inner brow for thickness */}
            <path d={EYEBROW.friendly.l} fill="none" stroke="#5a3820" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            <path d={EYEBROW.friendly.r} fill="none" stroke="#5a3820" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
          </g>
        </g>

        {/* Eyes */}
        <g ref={eyesRef}>
          <path d="M 70 106 Q 80 99.5 90 106" fill="none" stroke="#a8704f" strokeWidth="0.9" opacity="0.65" />
          <path d="M 110 106 Q 120 99.5 130 106" fill="none" stroke="#a8704f" strokeWidth="0.9" opacity="0.65" />
          {/* Whites */}
          <path d="M 69 113 Q 80 103.5 91 112.5 Q 80 119 69 113 Z" fill="#faf5ee" />
          <path d="M 109 112.5 Q 120 103.5 131 113 Q 120 119 109 112.5 Z" fill="#faf5ee" />
          {/* Irises + pupils + catchlights */}
          <g ref={pupilsRef}>
            <g clipPath={url('eye-l')}>
              <circle cx="80" cy="111.5" r="5.1" fill={url('iris')} />
              {/* Limbal ring */}
              <circle cx="80" cy="111.5" r="5.1" fill="none" stroke="#150a04" strokeWidth="1.1" />
              <circle cx="80" cy="111.5" r="2.2" fill="#0e0604" />
              <circle cx="81.8" cy="109.5" r="1.3" fill="#fff" />
              <circle cx="78.2" cy="113.4" r="0.55" fill="#fff" opacity="0.55" />
            </g>
            <g clipPath={url('eye-r')}>
              <circle cx="120" cy="111.5" r="5.1" fill={url('iris')} />
              <circle cx="120" cy="111.5" r="5.1" fill="none" stroke="#150a04" strokeWidth="1.1" />
              <circle cx="120" cy="111.5" r="2.2" fill="#0e0604" />
              <circle cx="121.8" cy="109.5" r="1.3" fill="#fff" />
              <circle cx="118.2" cy="113.4" r="0.55" fill="#fff" opacity="0.55" />
            </g>
          </g>
          {/* Upper-lid shadow */}
          <path d="M 69 113 Q 80 103.5 91 112.5 Q 80 107 69 113 Z" fill="#5a3020" opacity="0.22" />
          <path d="M 109 112.5 Q 120 103.5 131 113 Q 120 107 109 112.5 Z" fill="#5a3020" opacity="0.22" />
          {/* Lids + lashes */}
          <path d="M 67.5 113 Q 80 102 92 112" fill="none" stroke="#160c06" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 108 112 Q 120 102 132.5 113"  fill="none" stroke="#160c06" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 67.5 113 l -3 -1.8 M 70 110 l -2.4 -2.6 M 73.5 107.4 l -1.6 -2.8 M 132.5 113 l 3 -1.8 M 130 110 l 2.4 -2.6 M 126.5 107.4 l 1.6 -2.8" stroke="#160c06" strokeWidth="1.15" strokeLinecap="round" />
          <path d="M 71 115 Q 80 119.8 89 114.8 M 111 114.8 Q 120 119.8 129 115" fill="none" stroke="#9c6446" strokeWidth="0.85" opacity="0.75" />
        </g>

        {/* Nose */}
        <path d="M 97.5 114 Q 95.5 128 92.5 135 Q 95.5 139.5 100 139" fill="none" stroke="#a06040" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 93.5 136.6 q 2 1.6 4 0.8 M 102.5 137.6 q 2 0.8 4 -0.8" fill="none" stroke="#8a4e30" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M 101.8 117.5 Q 103 128 104.5 132" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.25" strokeLinecap="round" />
        <path d="M 98.2 140.5 L 98.8 143.6 M 101.8 140.5 L 101.2 143.6" stroke="#b07050" strokeWidth="0.65" opacity="0.55" />

        {/* Glasses — thin gold wire frames */}
        <g fill="none" stroke="#3a2a14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <circle cx="80"  cy="112" r="14.5" />
          <circle cx="120" cy="112" r="14.5" />
          <path d="M 94.5 111 Q 100 107.5 105.5 111" />
          <path d="M 65.5 110 L 58 107" />
          <path d="M 134.5 110 L 142 107" />
        </g>
        {/* Lens shine */}
        <circle cx="80"  cy="112" r="14.5" fill="none" stroke="#c9a445" strokeWidth="0.4" opacity="0.4" />
        <circle cx="120" cy="112" r="14.5" fill="none" stroke="#c9a445" strokeWidth="0.4" opacity="0.4" />
        <circle cx="80"  cy="112" r="14.5" fill="#fff" opacity="0.04" />
        <circle cx="120" cy="112" r="14.5" fill="#fff" opacity="0.04" />

        {/* Mouth */}
        <path ref={mouthRef} d={rest.d} fill="#50141e" stroke={url('lip')} strokeWidth="3.2" strokeLinejoin="round" />
        <g clipPath={url('mouth')}>
          <g ref={teethRef} opacity="0">
            <path d="M 86 143 Q 100 141.5 114 143 L 114 147.6 Q 100 149 86 147.6 Z" fill="#f5f0e8" />
            <path d="M 90 154 Q 100 150.5 110 154 L 110 160 L 90 160 Z" fill="#a83040" opacity="0.8" />
          </g>
        </g>
        <path d="M 95 150.2 Q 100 151.6 105 150.2" stroke="#fff" strokeWidth="0.85" opacity="0.3" fill="none" strokeLinecap="round" />

        {/* Front hair (swooped) */}
        <path d="M 58 108 C 54 66 74 46 102 46 C 132 46 148 66 142 106 C 138 86 128 72 112 66 C 100 76 80 82 62 96 Z" fill={url('hair')} />
        {/* Hair highlight streak over fringe */}
        <path d="M 96 56 C 82 66 70 80 66 96" fill="none" stroke="#8a5a32" strokeWidth="2.5" opacity="0.45" strokeLinecap="round" />
        <path d="M 104 52 C 90 62 78 76 72 92" fill="none" stroke="#6a4020" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
        <g fill="none" strokeLinecap="round">
          <path d="M 112 66 C 102 76 84 82 66 93 M 118 58 C 130 64 138 78 140 96 M 90 52 C 76 58 64 74 62 96 M 104 50 C 90 58 76 72 70 90" stroke="#7a5238" strokeWidth="0.9" opacity="0.7" />
          <path d="M 122 62 C 132 72 136 86 137 100 M 96 56 C 84 64 72 78 66 94" stroke="#20130c" strokeWidth="0.9" opacity="0.5" />
          <path d="M 64 98 C 60 116 62 132 58 146" stroke="#3d251a" strokeWidth="0.85" opacity="0.8" />
          <path d="M 138 100 C 142 118 139 134 143 150" stroke="#3d251a" strokeWidth="0.85" opacity="0.8" />
        </g>
        <path d="M 58 108 C 54 66 74 46 102 46 C 132 46 148 66 142 106" fill="none" stroke={INK} strokeWidth="0.95" opacity="0.65" strokeLinecap="round" />
        <path d="M 100 36 C 57 36 40 70 43 112 C 45 152 34 188 49 214 M 100 36 C 143 36 160 70 157 112 C 155 152 166 188 151 214" fill="none" stroke={INK} strokeWidth="1.05" opacity="0.65" strokeLinecap="round" />
      </g>

      {/* ═══════════════ ARMS (above everything, never hidden by hair) ═══════════════ */}
      <g>
        <g ref={armLRef} opacity="0">
          <g transform="matrix(-1 0 0 1 200 0)">{armShape}</g>
        </g>
        <g ref={armRRef} opacity="0">{armShape}</g>
      </g>
    </svg>
  );
}
