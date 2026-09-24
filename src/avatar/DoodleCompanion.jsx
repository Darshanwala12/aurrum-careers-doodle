import { useEffect, useId, useRef } from 'react';
import gsap from 'gsap';
import { resolveState } from './stateMap.js';
import { speechEvents } from '../ai/voiceAdapter.js';

// ── Mouth / viseme ────────────────────────────────────────────────────
const MY = 148;
const mouthPath = (w, lift, top, bottom) =>
  `M ${100 - w} ${MY - lift} Q 100 ${MY + lift * 0.5 - 1 - top} ${100 + w} ${MY - lift} Q 100 ${MY + lift * 0.5 + 2 + bottom} ${100 - w} ${MY - lift} Z`;

const REST = {
  friendly: [14.5, 3.4, 1.6], explaining: [14, 2.2, 1.4], concerned: [12, -1.6, 1.3],
  confident: [15, 3.2, 1.4], calm: [13, 1.8, 1.4], motivating: [16.5, 4.4, 3.5],
  curious: [11.5, 1.2, 1.4], serious: [13, 0, 1], surprised: [7.5, 0, 6.5],
};
const VISEME = {
  sil: null, PP: [13, 0, 0.4], FF: [13, 0, 3.2], nn: [13, 0.5, 3.5],
  aa: [12.5, 2, 10], E: [15.5, 1, 5], O: [9, 2.5, 8.5], U: [6.5, 1.8, 5.5],
};
function visemeFor(v, expr) {
  const [rw, lift, rb] = REST[expr] ?? REST.friendly;
  const s = VISEME[v];
  if (!s) return { d: mouthPath(rw, lift, 0, rb), teeth: 0 };
  const smile = Math.max(0, lift) * 0.5;
  return { d: mouthPath(s[0], smile, s[1], s[2]), teeth: ['aa','E','FF','nn'].includes(v) ? 1 : v === 'O' ? 0.5 : 0 };
}
function wordVisemes(word) {
  const out = [];
  for (const ch of word.toLowerCase().replace(/[^a-z]/g, '')) {
    const v = 'a'.includes(ch) ? 'aa' : 'eiy'.includes(ch) ? 'E' : ch === 'o' ? 'O'
      : 'uwq'.includes(ch) ? 'U' : 'mbp'.includes(ch) ? 'PP' : 'fv'.includes(ch) ? 'FF' : 'nn';
    if (out[out.length - 1] !== v) out.push(v);
  }
  return out.slice(0, 7).length ? out.slice(0, 7) : ['nn'];
}

// ── Eyebrows ──────────────────────────────────────────────────────────
const BROW = {
  friendly:   { l: 'M 64 97 Q 76 91 90 95',  r: 'M 110 95 Q 124 91 136 97' },
  explaining: { l: 'M 64 95 Q 76 88 90 93',  r: 'M 110 93 Q 124 88 136 95' },
  concerned:  { l: 'M 64 93 Q 76 99 90 94',  r: 'M 110 94 Q 124 99 136 93' },
  confident:  { l: 'M 65 94 Q 78 87 91 93',  r: 'M 109 93 Q 122 87 135 94' },
  calm:       { l: 'M 64 96 Q 76 92 90 96',  r: 'M 110 96 Q 124 92 136 96' },
  motivating: { l: 'M 62 93 Q 76 85 90 91',  r: 'M 110 91 Q 124 85 138 93' },
  curious:    { l: 'M 65 93 Q 74 84 88 93',  r: 'M 112 93 Q 126 84 135 93' },
  serious:    { l: 'M 64 95 Q 76 92 90 95',  r: 'M 110 95 Q 124 92 136 95' },
  surprised:  { l: 'M 62 90 Q 76 81 90 88',  r: 'M 110 88 Q 124 81 138 90' },
};

// ── Arm poses ─────────────────────────────────────────────────────────
const ARM_HIDDEN = { rotate: 24, opacity: 0 };
const ARM_POSE = {
  wave:          { rotate: -62, opacity: 1 },
  'point-right': { rotate: -18, opacity: 1 },
  'point-left':  { rotate: -18, opacity: 1 },
  'point-up':    { rotate: -78, opacity: 1 },
  'point-down':  { rotate: 22,  opacity: 1 },
  explain:       { rotate: -30, opacity: 1 },
  thumb:         { rotate: -48, opacity: 1 },
  chin:          { rotate: -114,opacity: 1 },
  none:          ARM_HIDDEN,
};
const HAND_FOR = {
  wave: 'wave', 'point-right': 'point', 'point-left': 'point',
  'point-up': 'point', 'point-down': 'point', explain: 'open',
  thumb: 'thumb', chin: 'fist', none: 'relaxed',
};

export default function DoodleCompanion({ state = 'idle', speaking = false, size = 260, text = '' }) {
  const { expression, arm } = resolveState(state);
  const uid = useId().replace(/:/g, '');
  const id  = n => `${uid}-${n}`;
  const url = n => `url(#${id(n)})`;

  const svgRef       = useRef(null);
  const mouthRef     = useRef(null);
  const mouthClipRef = useRef(null);
  const teethRef     = useRef(null);
  const browLRef     = useRef(null);
  const browRRef     = useRef(null);
  const eyesRef      = useRef(null);
  const headRef      = useRef(null);
  const torsoRef     = useRef(null);
  const armRRef      = useRef(null);
  const armLRef      = useRef(null);
  const pupilsRef    = useRef(null);
  const browsRef     = useRef(null);
  const wristRRef    = useRef(null);
  const wristLRef    = useRef(null);

  const exprRef = useRef(expression); exprRef.current = expression;
  const textRef = useRef(text);       textRef.current = text;
  const listening = state === 'listening';
  const thinking  = state === 'thinking';
  const handKind  = HAND_FOR[arm] ?? 'relaxed';

  const setMouth = (v, dur = 0.08) => {
    const m = visemeFor(v, exprRef.current);
    if (mouthRef.current)
      gsap.to([mouthRef.current, mouthClipRef.current], { attr: { d: m.d }, duration: dur, ease: 'power1.out', overwrite: 'auto' });
    if (teethRef.current)
      gsap.to(teethRef.current, { opacity: m.teeth, duration: dur, overwrite: 'auto' });
  };

  // Blink
  useEffect(() => {
    let t; let dead = false;
    const blink = () => {
      if (dead || !eyesRef.current) return;
      gsap.to(eyesRef.current, { scaleY: 0.06, duration: 0.065, transformOrigin: 'center', yoyo: true, repeat: 1, ease: 'power1.inOut' });
      t = setTimeout(blink, Math.random() < 0.18 ? 240 : 2200 + Math.random() * 3400);
    };
    t = setTimeout(blink, 900);
    return () => { dead = true; clearTimeout(t); };
  }, []);

  // Idle breathing + head sway
  useEffect(() => {
    if (!headRef.current || !torsoRef.current) return;
    const h = gsap.to(headRef.current,  { rotate: 1.5,   svgOrigin: '100 200', duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const b = gsap.to(torsoRef.current, { scaleY: 1.013,  svgOrigin: '100 260', duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const s = gsap.to(torsoRef.current, { rotate: 0.45,   svgOrigin: '100 260', duration: 4.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.1 });
    return () => { h.kill(); b.kill(); s.kill(); };
  }, []);

  // Expression → brows + resting mouth
  useEffect(() => {
    const brow = BROW[expression] ?? BROW.friendly;
    if (browLRef.current) gsap.to(browLRef.current, { attr: { d: brow.l }, duration: 0.45, ease: 'power2.out' });
    if (browRRef.current) gsap.to(browRRef.current, { attr: { d: brow.r }, duration: 0.45, ease: 'power2.out' });
    if (!speaking) setMouth('sil', 0.4);
  }, [expression]); // eslint-disable-line

  // Arms
  useEffect(() => {
    const useLeft = arm === 'point-left';
    const active  = useLeft ? armLRef  : armRRef;
    const idle    = useLeft ? armRRef  : armLRef;
    const wActive = useLeft ? wristLRef : wristRRef;
    const wIdle   = useLeft ? wristRRef : wristLRef;
    if (!active.current || !idle.current) return;
    const orig   = ref => ref === armLRef ? '62 228' : '138 228';
    const mirror = (ref, p) => ref === armLRef ? { ...p, rotate: -p.rotate } : p;
    const pose   = ARM_POSE[arm] ?? ARM_HIDDEN;
    gsap.to(active.current, { ...mirror(active, pose),    svgOrigin: orig(active), duration: 0.65, ease: 'back.out(1.6)' });
    gsap.to(idle.current,   { ...mirror(idle, ARM_HIDDEN), svgOrigin: orig(idle),   duration: 0.38, ease: 'power2.in' });
    if (wIdle.current) gsap.to(wIdle.current, { rotate: 0, duration: 0.3 });

    let wave, wrist;
    if (arm === 'wave')
      wave = gsap.to(active.current, { rotate: pose.rotate - 13, svgOrigin: orig(active), duration: 0.25, yoyo: true, repeat: 6, ease: 'sine.inOut', delay: 0.55 });
    if (pose.opacity === 1 && wActive.current)
      wrist = gsap.to(wActive.current, { rotate: 4, duration: 0.58, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.75 });

    return () => {
      wave?.kill(); wrist?.kill();
      gsap.to(active.current, { ...mirror(active, ARM_HIDDEN), svgOrigin: orig(active), duration: 0.38, ease: 'power2.in' });
      if (wActive.current) gsap.to(wActive.current, { rotate: 0, duration: 0.3 });
    };
  }, [arm]);

  // Eye saccades / look direction
  useEffect(() => {
    const p = pupilsRef.current;
    if (!p) return;
    if (listening) { gsap.to(p, { x: 0, y: 0, duration: 0.28 }); return; }
    if (thinking)  { gsap.to(p, { x: -2.2, y: -2, duration: 0.32, ease: 'power2.out' }); return; }
    let t;
    const look = () => {
      const away = Math.random() < 0.35;
      gsap.to(p, { x: away ? gsap.utils.random(-2, 2) : 0, y: away ? gsap.utils.random(-1.2, 0.8) : 0, duration: 0.12, ease: 'power2.out' });
      t = setTimeout(look, 1100 + Math.random() * 2600);
    };
    t = setTimeout(look, 1200);
    return () => clearTimeout(t);
  }, [listening, thinking]);

  // Head / brows for speaking / listening / thinking
  useEffect(() => {
    const head  = headRef.current;
    const brows = browsRef.current;
    if (!head || !brows) return;
    if (thinking) {
      gsap.to(head, { rotate: -4.5, x: 0, svgOrigin: '100 200', duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    if (listening) {
      gsap.to(head, { rotate: -2, y: -1.5, svgOrigin: '100 200', duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    gsap.to(head, { rotate: 0, x: 0, y: 0, svgOrigin: '100 200', duration: 0.55, ease: 'power2.out', overwrite: 'auto' });
    if (!speaking) return;
    gsap.fromTo(head, { y: 0 }, { y: 2, duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    const nods  = gsap.to(head, { y: 2, svgOrigin: '100 200', duration: 1.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.7 });
    const lifts = setInterval(() => gsap.to(brows, { y: -2.2, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' }), 1700 + Math.random() * 700);
    return () => { nods.kill(); clearInterval(lifts); gsap.to([brows, head], { y: 0, duration: 0.2 }); };
  }, [speaking, listening, thinking]);

  // Lip sync
  useEffect(() => {
    if (!speaking) { setMouth('sil', 0.25); return undefined; }
    const queue = []; let lastBoundary = 0; let current = '';
    const started = performance.now();
    const onBoundary = e => {
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
          const w = words[Math.min(words.length - 1, Math.floor((now - started) / 165))];
          const vs = wordVisemes(w);
          v = vs[Math.floor((((now - started) % 165) / 165) * vs.length)];
        } else v = ['aa','nn','E','PP','O','nn','aa','E'][Math.floor(Math.random() * 8)];
      }
      if (v !== current) { current = v; setMouth(v); }
    };
    const iv = setInterval(tick, 75);
    return () => { clearInterval(iv); speechEvents.removeEventListener('boundary', onBoundary); };
  }, [speaking]); // eslint-disable-line

  // Mouse parallax
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = e => {
      const r = svg.getBoundingClientRect();
      gsap.to(headRef.current, {
        x: gsap.utils.clamp(-4, 4, ((e.clientX - (r.left + r.width / 2)) / r.width) * 8),
        y: gsap.utils.clamp(-2.5, 2.5, ((e.clientY - (r.top + r.height / 2)) / r.height) * 4),
        duration: 0.6, ease: 'power2.out',
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const rest = visemeFor('sil', expression);

  // ── Arm shape (right; mirrored for left via transform) ───────────
  const makeArm = (isLeft) => (
    <>
      <path d="M 132 220 Q 152 219 170 221.5 Q 176 227 170 233 Q 152 235 132 236 Z"
        fill={url('blazer-arm')} />
      <path d="M 134 221 Q 152 220.5 168 222.5 M 134 234.5 Q 152 234 168 232"
        fill="none" stroke="#4a8ab0" strokeWidth="0.6" opacity="0.18" strokeLinecap="round" />
      <path d="M 169 222 L 174 222.5 Q 177 227 174 232.5 L 169 233 Z"
        fill="#f8f4ee" stroke="#d0c8bc" strokeWidth="0.55" />
      {/* Gold cufflink */}
      <ellipse cx="172" cy="227.5" rx="2.2" ry="2.8" fill={url('gold')} />
      <ellipse cx="171.5" cy="226.8" rx="0.9" ry="1.1" fill="#f8e890" opacity="0.9" />
      {/* Watch on left arm */}
      {isLeft && (
        <g>
          <rect x="168.5" y="224.5" width="7" height="6" rx="1.5" fill="#0e2d4a" stroke={url('gold')} strokeWidth="0.65" />
          <rect x="169.5" y="225.5" width="5" height="4" rx="0.8" fill="#1a3d5c" />
          <path d="M 172 226.2 L 172 227.7 L 173.2 228.5" stroke="#e8c86a" strokeWidth="0.45" strokeLinecap="round" />
        </g>
      )}
      {/* Hand */}
      <g ref={isLeft ? wristLRef : wristRRef} style={{ transformOrigin: '174px 227px' }}>
        <g fill={url('skin-arm')} strokeLinecap="round" strokeLinejoin="round">
          {handKind === 'relaxed' && (<>
            <path d="M 173 222 Q 181.5 220 187 222.5 L 197 222 Q 199 223.5 197 225 L 187 225.5 Q 190 230.5 184.5 233 Q 177 235 173 231 Z" />
            <path d="M 175.5 222 Q 179.5 215 185.5 216 Q 187 218 183.5 222" />
            <path d="M 185 226 Q 189 226.8 188.5 229 M 184 230 Q 188 231 187.5 233" fill="none" stroke="#b07040" strokeWidth="0.5" opacity="0.5" />
          </>)}
          {handKind === 'wave' && (<>
            <path d="M 173 222 Q 181 219 186.5 221.5 Q 190 226.5 186.5 232.5 Q 179.5 236 173 232 Z" />
            <path d="M 186 222 L 196.5 215 Q 199 215.5 198 218 L 189 224.5 L 200 221.5 Q 202 223 200 225 L 190 228 L 200 229.5 Q 202 231.5 199.5 232.5 L 189.5 230 L 196 236 Q 197 238.5 194 238 L 186 232.5" />
            <path d="M 177 222 Q 179.5 213.5 185.5 213 Q 187.5 214.5 185 218.5 L 183.5 222" />
          </>)}
          {handKind === 'point' && (<>
            <path d="M 173 222 Q 181 219.5 186.5 222.5 L 197.5 222 Q 199.5 223.8 197.5 225.6 L 187 226 Q 189 231 183.5 233.5 Q 176.5 235.5 173 231 Z" />
            <path d="M 176.5 222 Q 181 215.5 186.5 217.5 Q 188 219.5 184.5 222" />
            <path d="M 185 228 Q 188.5 229 188 231.5 M 183 232 Q 186 233 185.5 235" fill="none" stroke="#b07040" strokeWidth="0.5" opacity="0.5" />
          </>)}
          {handKind === 'open' && (<>
            <path d="M 173 222.5 Q 181 220 187.5 221.5 L 198.5 222 Q 200.5 223.5 198.5 225.2 L 189 225.5 L 199.5 227.2 Q 201.5 228.8 199 230.5 L 189 230 L 197.5 231.5 Q 199.5 233 197 234.5 L 186.5 233.5 Q 179.5 236 173 232.5 Z" />
            <path d="M 177 222.5 Q 181.5 215 187 216 Q 188.5 218 185 222" />
          </>)}
          {handKind === 'thumb' && (<>
            <path d="M 172.5 222 Q 182 219 189.5 222.5 Q 192 228.5 189 234.5 Q 181 238 172.5 234 Z" />
            <path d="M 186.5 222.5 Q 183 214 188.5 209.5 Q 192.5 208 192.5 212 L 190 222" />
            <path d="M 186 226.5 Q 190 227 189.5 229.5 M 185.5 230.5 Q 189.5 231.5 189 233.5" fill="none" stroke="#b07040" strokeWidth="0.5" opacity="0.5" />
          </>)}
          {handKind === 'fist' && (<>
            <path d="M 172.5 222 Q 182 219 190 222.5 Q 192.5 228.5 189.5 234.5 Q 181.5 238 172.5 234 Z" />
            <path d="M 186.5 222.5 Q 190.5 224 190 226.5 M 186 227 Q 190.5 229 190 231.5 M 185.5 231.5 Q 189.5 233 188.5 235" fill="none" stroke="#b07040" strokeWidth="0.5" opacity="0.5" />
          </>)}
        </g>
      </g>
    </>
  );

  return (
    <svg ref={svgRef} viewBox="0 0 200 320" width={size} height={size * 1.6}
      role="img" aria-label={`Elena, Aurrum career advisor — ${expression}`}>
      <defs>
        {/* Skin */}
        <radialGradient id={id('skin-face')} cx="42%" cy="28%" r="70%">
          <stop offset="0%"   stopColor="#fde6c8" />
          <stop offset="42%"  stopColor="#f0c490" />
          <stop offset="82%"  stopColor="#d89464" />
          <stop offset="100%" stopColor="#c07040" />
        </radialGradient>
        <radialGradient id={id('skin-arm')} cx="35%" cy="25%" r="75%">
          <stop offset="0%"   stopColor="#fce2c4" />
          <stop offset="100%" stopColor="#c8804a" />
        </radialGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#c07848" />
          <stop offset="60%" stopColor="#d89264" />
        </linearGradient>
        {/* Hair */}
        <radialGradient id={id('hair')} cx="28%" cy="18%" r="76%">
          <stop offset="0%"   stopColor="#4a2c18" />
          <stop offset="38%"  stopColor="#2c1610" />
          <stop offset="100%" stopColor="#140808" />
        </radialGradient>
        <linearGradient id={id('hair-hi')} x1="0.18" y1="0" x2="0.5" y2="0.85">
          <stop offset="0%"   stopColor="#7a4e2e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3c1e10" stopOpacity="0" />
        </linearGradient>
        {/* Blazer — deep navy */}
        <linearGradient id={id('blazer')} x1="0.15" y1="0" x2="0.55" y2="1">
          <stop offset="0%"   stopColor="#1c4d6c" />
          <stop offset="50%"  stopColor="#0e3250" />
          <stop offset="100%" stopColor="#061e34" />
        </linearGradient>
        <linearGradient id={id('blazer-arm')} x1="0.1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#1a4c6a" />
          <stop offset="100%" stopColor="#092c48" />
        </linearGradient>
        <linearGradient id={id('blazer-lapel')} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%"   stopColor="#1e5575" />
          <stop offset="100%" stopColor="#0c3452" />
        </linearGradient>
        {/* Shirt */}
        <linearGradient id={id('shirt')} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8e0d4" />
        </linearGradient>
        {/* Teal */}
        <linearGradient id={id('teal')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1e8888" />
          <stop offset="100%" stopColor="#135868" />
        </linearGradient>
        {/* Gold */}
        <linearGradient id={id('gold')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#eacb6a" />
          <stop offset="100%" stopColor="#b88828" />
        </linearGradient>
        {/* Eyes */}
        <radialGradient id={id('iris')} cx="36%" cy="32%" r="64%">
          <stop offset="0%"   stopColor="#b88040" />
          <stop offset="52%"  stopColor="#6a3c1c" />
          <stop offset="86%"  stopColor="#2c1208" />
          <stop offset="100%" stopColor="#140804" />
        </radialGradient>
        {/* Blush */}
        <radialGradient id={id('blush')} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#e06858" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#e06858" stopOpacity="0" />
        </radialGradient>
        {/* Lips */}
        <linearGradient id={id('lip')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#b04a5e" />
          <stop offset="100%" stopColor="#c86878" />
        </linearGradient>
        {/* Studio glow */}
        <radialGradient id={id('glow')} cx="50%" cy="24%" r="55%">
          <stop offset="0%"   stopColor="#f8f2ea" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#f8f2ea" stopOpacity="0" />
        </radialGradient>
        {/* Filters */}
        <filter id={id('blur-s')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.0" />
        </filter>
        <filter id={id('blur-m')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.8" />
        </filter>
        {/* Clip paths */}
        <clipPath id={id('face-clip')}>
          <path d="M 64 90 C 63 52 80 50 100 50 C 120 50 137 52 136 90 C 137 126 120 155 108 165 C 104 168 100 168 96 165 C 80 155 63 126 64 90 Z" />
        </clipPath>
        <clipPath id={id('eye-l')}>
          <path d="M 68 110 Q 80 101 92 110 Q 80 119 68 110 Z" />
        </clipPath>
        <clipPath id={id('eye-r')}>
          <path d="M 108 110 Q 120 101 132 110 Q 120 119 108 110 Z" />
        </clipPath>
        <clipPath id={id('mouth-clip')}>
          <path ref={mouthClipRef} d={rest.d} />
        </clipPath>
      </defs>

      {/* Ambient studio glow */}
      <ellipse cx="100" cy="82" rx="88" ry="106" fill={url('glow')} />

      {/* ═══ BODY ═══ */}
      <g ref={torsoRef}>
        <path d="M 36 320 Q 38 242 64 208 Q 80 196 100 194 Q 120 196 136 208 Q 162 242 164 320 Z"
          fill={url('blazer')} />
        {/* Side depth shadows */}
        <path d="M 36 320 Q 38 268 50 240 Q 60 222 70 212 L 76 216 Q 64 232 56 258 Q 46 284 44 320 Z"
          fill="#030d1a" opacity="0.42" />
        <path d="M 164 320 Q 162 268 150 240 Q 140 222 130 212 L 124 216 Q 136 232 144 258 Q 154 284 156 320 Z"
          fill="#030d1a" opacity="0.42" />
        {/* Centre chest highlight */}
        <path d="M 97 196 Q 100 310 100 320 L 103 320 Q 103 310 100 196 Z" fill="#2a5e84" opacity="0.28" />
        {/* White shirt */}
        <path d="M 80 202 L 100 272 L 120 202 Q 110 196 100 194 Q 90 196 80 202 Z"
          fill={url('shirt')} />
        <path d="M 100 202 L 100 272" stroke="#ccc6b8" strokeWidth="0.8" opacity="0.7" />
        <circle cx="100" cy="220" r="1.8" fill="#dcd4c6" stroke="#b8b0a0" strokeWidth="0.45" />
        <circle cx="100" cy="236" r="1.8" fill="#dcd4c6" stroke="#b8b0a0" strokeWidth="0.45" />
        <circle cx="100" cy="252" r="1.8" fill="#dcd4c6" stroke="#b8b0a0" strokeWidth="0.45" />
        {/* Collar */}
        <path d="M 80 202 L 87 194 L 100 210 L 113 194 L 120 202 L 100 272 Z"
          fill={url('shirt')} />
        <path d="M 87 194 L 100 218 M 113 194 L 100 218"
          stroke="#ccc6b8" strokeWidth="0.6" opacity="0.65" />
        {/* Lapels */}
        <path d="M 80 202 L 100 272 L 88 292 L 56 248 Q 54 230 64 212 Z"
          fill={url('blazer-lapel')} />
        <path d="M 120 202 L 100 272 L 112 292 L 144 248 Q 146 230 136 212 Z"
          fill={url('blazer-lapel')} />
        <path d="M 64 214 L 90 292 M 136 214 L 110 292"
          stroke="#4a9ac0" strokeWidth="0.6" opacity="0.18" strokeLinecap="round" />
        {/* Teal pocket square */}
        <path d="M 118 246 L 134 243 L 135 252 L 122 254 Z" fill={url('teal')} opacity="0.9" />
        <path d="M 121 246 Q 128 240 133 244" stroke="#0a4858" strokeWidth="0.55" fill="none" opacity="0.75" />
        {/* Gold Aurrum pin */}
        <circle cx="120" cy="236" r="3.8" fill={url('gold')} />
        <circle cx="119.3" cy="235.3" r="1.5" fill="#f8e890" opacity="0.88" />
        <text x="120" y="237.2" textAnchor="middle" fontSize="3.8" fill="#7a5010"
          fontFamily="Georgia,serif" fontWeight="bold">A</text>
        {/* Blazer buttons */}
        <circle cx="100" cy="286" r="2.8" fill="#0a2c46" stroke="#1a4c6a" strokeWidth="0.6" />
        <circle cx="100" cy="272" r="2.8" fill="#0a2c46" stroke="#1a4c6a" strokeWidth="0.6" />
      </g>

      {/* ═══ HEAD ═══ */}
      <g ref={headRef}>
        {/* Back hair */}
        <path d="M 100 28 C 54 28 36 62 36 98 C 36 136 42 166 50 194 C 60 200 72 192 72 180 C 68 154 66 128 66 98 L 134 98 C 134 128 132 154 128 180 C 128 192 140 200 150 194 C 158 166 164 136 164 98 C 164 62 146 28 100 28 Z"
          fill={url('hair')} />
        <path d="M 100 28 C 54 28 36 62 38 98 C 44 86 58 70 72 62 C 82 56 92 50 100 50 Z"
          fill={url('hair-hi')} opacity="0.52" />
        <g fill="none" strokeLinecap="round">
          <path d="M 50 122 C 46 150 48 172 52 192" stroke="#3c1e10" strokeWidth="1.0" opacity="0.62" />
          <path d="M 44 132 C 40 162 44 184 50 196" stroke="#1a0c06" strokeWidth="1.0" opacity="0.52" />
          <path d="M 150 122 C 154 150 152 172 148 192" stroke="#3c1e10" strokeWidth="1.0" opacity="0.62" />
          <path d="M 156 132 C 160 162 156 184 150 196" stroke="#1a0c06" strokeWidth="1.0" opacity="0.52" />
        </g>

        {/* Neck */}
        <path d="M 84 162 Q 84 194 80 202 Q 100 212 120 202 Q 116 194 116 162 Z"
          fill={url('neck')} />
        <path d="M 84 170 Q 100 190 116 170 L 116 160 L 84 160 Z"
          fill="#a06840" opacity="0.28" filter={url('blur-s')} />

        {/* Face */}
        <path d="M 64 90 C 63 52 80 50 100 50 C 120 50 137 52 136 90 C 137 126 120 155 108 165 C 104 168 100 168 96 165 C 80 155 63 126 64 90 Z"
          fill={url('skin-face')} />
        <g clipPath={url('face-clip')}>
          <g filter={url('blur-s')} opacity="0.36">
            <path d="M 64 88 Q 68 132 86 168 L 64 168 Z" fill="#c07848" />
            <path d="M 136 88 Q 132 132 114 168 L 136 168 Z" fill="#c07848" />
          </g>
          <path d="M 104 84 Q 108 114 106 128"
            stroke="#fff" strokeWidth="4" opacity="0.07" fill="none" filter={url('blur-s')} />
          <ellipse cx="72"  cy="132" rx="13" ry="8" fill={url('blush')} />
          <ellipse cx="128" cy="132" rx="13" ry="8" fill={url('blush')} />
        </g>

        {/* Ears */}
        <path d="M 63 112 Q 56 116 58 128 Q 60 132 63 130" fill="#d49060" stroke="#b07040" strokeWidth="0.5" />
        <path d="M 137 112 Q 144 116 142 128 Q 140 132 137 130" fill="#d49060" stroke="#b07040" strokeWidth="0.5" />
        {/* Gold stud earrings */}
        <circle cx="60"  cy="120" r="3.4" fill={url('gold')} />
        <circle cx="59.4" cy="119.4" r="1.3" fill="#f8e890" opacity="0.9" />
        <circle cx="140" cy="120" r="3.4" fill={url('gold')} />
        <circle cx="139.4" cy="119.4" r="1.3" fill="#f8e890" opacity="0.9" />

        {/* Eyebrows */}
        <g ref={browsRef}>
          <path ref={browLRef} d={BROW.friendly.l} fill="none" stroke="#2a1808" strokeWidth="2.7" strokeLinecap="round" />
          <path ref={browRRef} d={BROW.friendly.r} fill="none" stroke="#2a1808" strokeWidth="2.7" strokeLinecap="round" />
          <path d={BROW.friendly.l} fill="none" stroke="#5a3418" strokeWidth="1.2" strokeLinecap="round" opacity="0.48" />
          <path d={BROW.friendly.r} fill="none" stroke="#5a3418" strokeWidth="1.2" strokeLinecap="round" opacity="0.48" />
        </g>

        {/* Eyes */}
        <g ref={eyesRef}>
          <ellipse cx="80"  cy="109" rx="13" ry="6.5" fill="#8a4c28" opacity="0.15" filter={url('blur-s')} />
          <ellipse cx="120" cy="109" rx="13" ry="6.5" fill="#8a4c28" opacity="0.15" filter={url('blur-s')} />
          <path d="M 68 110 Q 80 101 92 110 Q 80 119 68 110 Z"  fill="#faf6f0" />
          <path d="M 108 110 Q 120 101 132 110 Q 120 119 108 110 Z" fill="#faf6f0" />
          <g ref={pupilsRef}>
            <g clipPath={url('eye-l')}>
              <circle cx="80"  cy="110" r="5.6" fill={url('iris')} />
              <circle cx="80"  cy="110" r="5.6" fill="none" stroke="#18080a" strokeWidth="1.0" />
              <circle cx="80"  cy="110" r="2.4" fill="#0c0604" />
              <circle cx="82"  cy="107.6" r="1.6" fill="#fff" />
              <circle cx="77.8" cy="112.4" r="0.6" fill="#fff" opacity="0.5" />
            </g>
            <g clipPath={url('eye-r')}>
              <circle cx="120" cy="110" r="5.6" fill={url('iris')} />
              <circle cx="120" cy="110" r="5.6" fill="none" stroke="#18080a" strokeWidth="1.0" />
              <circle cx="120" cy="110" r="2.4" fill="#0c0604" />
              <circle cx="122" cy="107.6" r="1.6" fill="#fff" />
              <circle cx="117.8" cy="112.4" r="0.6" fill="#fff" opacity="0.5" />
            </g>
          </g>
          <path d="M 68 110 Q 80 101 92 110 Q 80 106 68 110 Z"  fill="#5a2e18" opacity="0.18" />
          <path d="M 108 110 Q 120 101 132 110 Q 120 106 108 110 Z" fill="#5a2e18" opacity="0.18" />
          <path d="M 66.5 110 Q 80 99.5 93.5 110"  fill="none" stroke="#180808" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M 106.5 110 Q 120 99.5 133.5 110" fill="none" stroke="#180808" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M 66.5 110 l -3 -1.9 M 69 107.2 l -2.4 -2.6 M 73 104.8 l -1.5 -2.8 M 133.5 110 l 3 -1.9 M 131 107.2 l 2.4 -2.6 M 127 104.8 l 1.5 -2.8"
            stroke="#180808" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M 70 113.5 Q 80 118.5 90 113.5 M 110 113.5 Q 120 118.5 130 113.5"
            fill="none" stroke="#9a6040" strokeWidth="0.75" opacity="0.62" />
        </g>

        {/* Nose */}
        <path d="M 99 114 Q 96 129 93 135" fill="none" stroke="#a87040" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 93.5 134 q 2 1.8 4 1 M 102.5 135 q 1.8 0.8 4 -1"
          fill="none" stroke="#906038" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M 102.5 117 Q 104 129 102 135"
          stroke="#fff" strokeWidth="1.3" opacity="0.16" fill="none" strokeLinecap="round" />
        <path d="M 97.5 141 L 97.8 144.5 M 102.5 141 L 102.2 144.5"
          stroke="#b07848" strokeWidth="0.6" opacity="0.48" />

        {/* Mouth */}
        <path ref={mouthRef} d={rest.d} fill="#501420" stroke={url('lip')} strokeWidth="3.1" strokeLinejoin="round" />
        <g clipPath={url('mouth-clip')}>
          <g ref={teethRef} opacity="0">
            <path d="M 86 144.5 Q 100 143 114 144.5 L 114 149 Q 100 150.5 86 149 Z" fill="#f0ece4" />
            <path d="M 90 154 Q 100 151 110 154 L 110 158.5 L 90 158.5 Z" fill="#a83040" opacity="0.8" />
          </g>
        </g>
        <path d="M 94.5 149 Q 100 150.5 105.5 149" stroke="#fff" strokeWidth="0.8" opacity="0.2" fill="none" strokeLinecap="round" />

        {/* Front hair / fringe */}
        <path d="M 62 94 C 60 58 78 46 100 46 C 122 46 140 58 138 94 C 132 78 120 68 108 64 C 100 73 80 75 66 88 Z"
          fill={url('hair')} />
        <path d="M 96 52 C 84 60 74 72 68 88" fill="none" stroke="#7a4a2a" strokeWidth="2.2" opacity="0.45" strokeLinecap="round" />
        <path d="M 102 50 C 90 58 80 70 74 84" fill="none" stroke="#5a3418" strokeWidth="1.4" opacity="0.28" strokeLinecap="round" />
        <path d="M 62 94 C 60 58 78 46 100 46 C 122 46 140 58 138 94"
          fill="none" stroke="#2a1808" strokeWidth="0.65" opacity="0.5" strokeLinecap="round" />

        {/* Professional updo bun */}
        <ellipse cx="100" cy="37" rx="21" ry="16" fill={url('hair')} />
        <ellipse cx="100" cy="37" rx="21" ry="16" fill={url('hair-hi')} opacity="0.36" />
        <path d="M 82 36 Q 100 30 118 36" fill="none" stroke="#6a4028" strokeWidth="1.0" opacity="0.52" strokeLinecap="round" />
        <path d="M 80 40 Q 100 34 120 40" fill="none" stroke="#3a2010" strokeWidth="0.9" opacity="0.36" strokeLinecap="round" />
        {/* Gold hair clip */}
        <rect x="87" y="35.5" width="26" height="4.5" rx="2.2" fill={url('gold')} />
        <path d="M 89 38 L 111 38" stroke="#f0d870" strokeWidth="0.6" opacity="0.58" />
        <circle cx="100" cy="37.7" r="1.5" fill="#f8e890" opacity="0.85" />
        {/* Face-framing tendrils */}
        <path d="M 64 90 C 64 76 68 64 74 60" fill="none" stroke="#2c1810" strokeWidth="1.0" opacity="0.52" strokeLinecap="round" />
        <path d="M 136 90 C 136 76 132 64 126 60" fill="none" stroke="#2c1810" strokeWidth="1.0" opacity="0.52" strokeLinecap="round" />
        {/* Back-hair outline */}
        <path d="M 100 28 C 56 28 36 62 36 98 C 36 136 42 168 50 194 M 100 28 C 144 28 164 62 164 98 C 164 136 158 168 150 194"
          fill="none" stroke="#2a1808" strokeWidth="0.82" opacity="0.48" strokeLinecap="round" />
      </g>

      {/* ═══ ARMS ═══ */}
      <g>
        <g ref={armLRef} opacity="0">
          <g transform="matrix(-1 0 0 1 200 0)">{makeArm(true)}</g>
        </g>
        <g ref={armRRef} opacity="0">{makeArm(false)}</g>
      </g>
    </svg>
  );
}
