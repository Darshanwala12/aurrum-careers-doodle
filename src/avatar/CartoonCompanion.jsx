import { useEffect, useId, useRef } from 'react';
import gsap from 'gsap';
import { resolveState } from './stateMap.js';
import { speechEvents } from '../ai/voiceAdapter.js';

// A funnier, more chibi-proportioned take on the career-advisor character:
// oversized round head (~60% of the figure), huge sparkly eyes, a stubby
// simplified body — same animation engine as DoodleCompanion (blink,
// breathing, viseme lip-sync, brow/arm state machine via stateMap.js) so it
// drops into the same call sites, just drawn with a cuter, funnier silhouette.

const MY = 150;
const mouthPath = (w, lift, top, bottom) =>
  `M ${100 - w} ${MY - lift} Q 100 ${MY + lift * 0.5 - 1 - top} ${100 + w} ${MY - lift} Q 100 ${MY + lift * 0.5 + 2 + bottom} ${100 - w} ${MY - lift} Z`;

const REST = {
  friendly:   [15, 4.2, 2.2], explaining: [14.5, 3, 2],  concerned: [11, -1, 1.4],
  confident:  [16, 4, 2],     calm:        [13.5, 2.6, 1.8], motivating: [18, 5.6, 4.5],
  curious:    [11, 1.6, 1.6], serious:     [12.5, 0.4, 1.2], surprised:  [8, 0, 8],
};
const VISEME = {
  sil: null, PP: [13, 0, 0.4], FF: [13, 0, 3.2], nn: [13, 0.5, 3.5],
  aa: [13.5, 2.4, 11], E: [16.5, 1.2, 5.5], O: [10, 3, 9], U: [7, 2, 6],
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

const BROW = {
  friendly:   { l: 'M 60 95 Q 74 86 90 92',  r: 'M 110 92 Q 126 86 140 95' },
  explaining: { l: 'M 60 92 Q 74 83 90 89',  r: 'M 110 89 Q 126 83 140 92' },
  concerned:  { l: 'M 60 90 Q 74 97 90 91',  r: 'M 110 91 Q 126 97 140 90' },
  confident:  { l: 'M 61 91 Q 76 82 91 89',  r: 'M 109 89 Q 124 82 139 91' },
  calm:       { l: 'M 60 94 Q 74 88 90 93',  r: 'M 110 93 Q 126 88 140 94' },
  motivating: { l: 'M 58 89 Q 74 78 90 86',  r: 'M 110 86 Q 126 78 142 89' },
  curious:    { l: 'M 61 88 Q 72 76 87 88',  r: 'M 113 88 Q 128 76 139 88' },
  serious:    { l: 'M 60 92 Q 74 89 90 92',  r: 'M 110 92 Q 126 89 140 92' },
  surprised:  { l: 'M 58 84 Q 74 72 90 82',  r: 'M 110 82 Q 126 72 142 84' },
};

const ARM_HIDDEN = { rotate: 18, opacity: 0 };
const ARM_POSE = {
  wave:          { rotate: -70, opacity: 1 },
  'point-right': { rotate: -16, opacity: 1 },
  'point-left':  { rotate: -16, opacity: 1 },
  'point-up':    { rotate: -86, opacity: 1 },
  'point-down':  { rotate: 20,  opacity: 1 },
  explain:       { rotate: -34, opacity: 1 },
  thumb:         { rotate: -52, opacity: 1 },
  chin:          { rotate: -120, opacity: 1 },
  none:          ARM_HIDDEN,
};

export default function CartoonCompanion({ state = 'idle', speaking = false, size = 260, text = '' }) {
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
  const bodyRef      = useRef(null);
  const armRRef      = useRef(null);
  const armLRef       = useRef(null);
  const pupilsRef    = useRef(null);
  const browsRef     = useRef(null);

  const exprRef = useRef(expression); exprRef.current = expression;
  const textRef = useRef(text);       textRef.current = text;
  const listening = state === 'listening';
  const thinking  = state === 'thinking';

  const setMouth = (v, dur = 0.08) => {
    const m = visemeFor(v, exprRef.current);
    if (mouthRef.current)
      gsap.to([mouthRef.current, mouthClipRef.current], { attr: { d: m.d }, duration: dur, ease: 'power1.out', overwrite: 'auto' });
    if (teethRef.current)
      gsap.to(teethRef.current, { opacity: m.teeth, duration: dur, overwrite: 'auto' });
  };

  // Blink — a touch snappier/more exaggerated than the professional model.
  useEffect(() => {
    let t; let dead = false;
    const blink = () => {
      if (dead || !eyesRef.current) return;
      gsap.to(eyesRef.current, { scaleY: 0.05, duration: 0.06, transformOrigin: 'center', yoyo: true, repeat: 1, ease: 'power1.inOut' });
      t = setTimeout(blink, Math.random() < 0.22 ? 220 : 1900 + Math.random() * 3000);
    };
    t = setTimeout(blink, 700);
    return () => { dead = true; clearTimeout(t); };
  }, []);

  // Idle: a bouncier head bob + body squash, funnier than a stately sway.
  useEffect(() => {
    if (!headRef.current || !bodyRef.current) return;
    const h = gsap.to(headRef.current, { y: -3, rotate: 2, svgOrigin: '100 150', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const b = gsap.to(bodyRef.current, { scaleY: 1.02, scaleX: 0.99, svgOrigin: '100 300', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    return () => { h.kill(); b.kill(); };
  }, []);

  useEffect(() => {
    const brow = BROW[expression] ?? BROW.friendly;
    if (browLRef.current) gsap.to(browLRef.current, { attr: { d: brow.l }, duration: 0.4, ease: 'power2.out' });
    if (browRRef.current) gsap.to(browRRef.current, { attr: { d: brow.r }, duration: 0.4, ease: 'power2.out' });
    if (!speaking) setMouth('sil', 0.4);
  }, [expression]); // eslint-disable-line

  useEffect(() => {
    const useLeft = arm === 'point-left';
    const active  = useLeft ? armLRef  : armRRef;
    const idle    = useLeft ? armRRef  : armLRef;
    if (!active.current || !idle.current) return;
    const orig   = ref => ref === armLRef ? '54 268' : '146 268';
    const mirror = (ref, p) => ref === armLRef ? { ...p, rotate: -p.rotate } : p;
    const pose   = ARM_POSE[arm] ?? ARM_HIDDEN;
    gsap.to(active.current, { ...mirror(active, pose),     svgOrigin: orig(active), duration: 0.6, ease: 'back.out(1.9)' });
    gsap.to(idle.current,   { ...mirror(idle, ARM_HIDDEN), svgOrigin: orig(idle),   duration: 0.35, ease: 'power2.in' });

    let wave;
    if (arm === 'wave')
      wave = gsap.to(active.current, { rotate: pose.rotate - 18, svgOrigin: orig(active), duration: 0.22, yoyo: true, repeat: 7, ease: 'sine.inOut', delay: 0.5 });

    return () => {
      wave?.kill();
      gsap.to(active.current, { ...mirror(active, ARM_HIDDEN), svgOrigin: orig(active), duration: 0.35, ease: 'power2.in' });
    };
  }, [arm]);

  useEffect(() => {
    const p = pupilsRef.current;
    if (!p) return;
    if (listening) { gsap.to(p, { x: 0, y: 0, duration: 0.26 }); return; }
    if (thinking)  { gsap.to(p, { x: -2.6, y: -2.4, duration: 0.3, ease: 'power2.out' }); return; }
    let t;
    const look = () => {
      const away = Math.random() < 0.35;
      gsap.to(p, { x: away ? gsap.utils.random(-2.4, 2.4) : 0, y: away ? gsap.utils.random(-1.4, 1) : 0, duration: 0.12, ease: 'power2.out' });
      t = setTimeout(look, 1000 + Math.random() * 2400);
    };
    t = setTimeout(look, 1000);
    return () => clearTimeout(t);
  }, [listening, thinking]);

  useEffect(() => {
    const head = headRef.current;
    const brows = browsRef.current;
    if (!head || !brows) return;
    if (thinking) { gsap.to(head, { rotate: -6, svgOrigin: '100 150', duration: 0.45, ease: 'power2.out', overwrite: 'auto' }); return; }
    if (listening) { gsap.to(head, { rotate: -2.5, y: -4, svgOrigin: '100 150', duration: 0.4, ease: 'power2.out', overwrite: 'auto' }); return; }
    gsap.to(head, { rotate: 0, x: 0, svgOrigin: '100 150', duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
    if (!speaking) return;
    const nods = gsap.to(head, { y: -6, svgOrigin: '100 150', duration: 0.75, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    const lifts = setInterval(() => gsap.to(brows, { y: -2.6, duration: 0.13, yoyo: true, repeat: 1, ease: 'power1.inOut' }), 1500 + Math.random() * 700);
    return () => { nods.kill(); clearInterval(lifts); gsap.to([brows, head], { y: -3, duration: 0.2 }); };
  }, [speaking, listening, thinking]);

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

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = e => {
      const r = svg.getBoundingClientRect();
      gsap.to(headRef.current, {
        x: gsap.utils.clamp(-5, 5, ((e.clientX - (r.left + r.width / 2)) / r.width) * 9),
        duration: 0.6, ease: 'power2.out',
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const rest = visemeFor('sil', expression);

  const makeArm = () => (
    <>
      {/* Short, stubby chibi arm — a rounded navy sleeve, no fingers, just a
          friendly round mitten hand for a toy-like, funnier silhouette. */}
      <path d="M 146 258 Q 172 254 186 268 Q 190 280 178 286 Q 158 290 146 280 Z" fill={url('blazer-arm')} />
      <circle cx="184" cy="272" r="12" fill={url('skin-arm')} stroke="#c07840" strokeWidth="0.8" />
      <circle cx="180" cy="267" r="2.4" fill="#fff" opacity="0.5" />
    </>
  );

  return (
    <svg ref={svgRef} viewBox="0 0 200 340" width={size} height={size * 1.7}
      role="img" aria-label={`Elena, Aurrum career advisor — ${expression}`}>
      <defs>
        <radialGradient id={id('skin-face')} cx="38%" cy="26%" r="75%">
          <stop offset="0%"   stopColor="#ffe9cc" />
          <stop offset="45%"  stopColor="#f3c894" />
          <stop offset="85%"  stopColor="#dd9868" />
          <stop offset="100%" stopColor="#c67c48" />
        </radialGradient>
        <radialGradient id={id('skin-arm')} cx="32%" cy="24%" r="80%">
          <stop offset="0%"   stopColor="#fbe4c8" />
          <stop offset="100%" stopColor="#cc844e" />
        </radialGradient>
        <radialGradient id={id('hair')} cx="30%" cy="16%" r="80%">
          <stop offset="0%"   stopColor="#54331c" />
          <stop offset="45%"  stopColor="#301912" />
          <stop offset="100%" stopColor="#160a0a" />
        </radialGradient>
        <linearGradient id={id('blazer')} x1="0.15" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="#215577" />
          <stop offset="55%"  stopColor="#0f3654" />
          <stop offset="100%" stopColor="#071f38" />
        </linearGradient>
        <linearGradient id={id('blazer-arm')} x1="0.1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#1f5272" />
          <stop offset="100%" stopColor="#0a2f4c" />
        </linearGradient>
        <linearGradient id={id('shirt')} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8e0d4" />
        </linearGradient>
        <linearGradient id={id('teal')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#22a09a" />
          <stop offset="100%" stopColor="#146868" />
        </linearGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f0d372" />
          <stop offset="100%" stopColor="#c0902c" />
        </linearGradient>
        <radialGradient id={id('iris')} cx="34%" cy="30%" r="66%">
          <stop offset="0%"   stopColor="#c8935a" />
          <stop offset="50%"  stopColor="#7a4620" />
          <stop offset="88%"  stopColor="#301608" />
          <stop offset="100%" stopColor="#180a04" />
        </radialGradient>
        <radialGradient id={id('blush')} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ef7d68" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef7d68" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('lip')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#c1546a" />
          <stop offset="100%" stopColor="#e37c8c" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="50%" cy="20%" r="60%">
          <stop offset="0%"   stopColor="#fff8ee" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff8ee" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('eye-l')}>
          <path d="M 58 122 Q 76 106 94 122 Q 76 136 58 122 Z" />
        </clipPath>
        <clipPath id={id('eye-r')}>
          <path d="M 106 122 Q 124 106 142 122 Q 124 136 106 122 Z" />
        </clipPath>
        <clipPath id={id('mouth-clip')}>
          <path ref={mouthClipRef} d={rest.d} />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="90" rx="98" ry="110" fill={url('glow')} />

      {/* ═══ BODY — short, round, toy-like ═══ */}
      <g ref={bodyRef}>
        {/* Simple rounded legs peeking out */}
        <rect x="72" y="292" width="20" height="34" rx="9" fill="#0a2038" />
        <rect x="108" y="292" width="20" height="34" rx="9" fill="#0a2038" />
        <ellipse cx="82" cy="330" rx="13" ry="7" fill="#04080e" />
        <ellipse cx="118" cy="330" rx="13" ry="7" fill="#04080e" />

        {/* Rounded blazer torso — bean shape, no waist definition (chibi) */}
        <path d="M 44 300 Q 40 250 58 224 Q 76 202 100 200 Q 124 202 142 224 Q 160 250 156 300 Q 100 316 44 300 Z"
          fill={url('blazer')} />
        <path d="M 44 300 Q 42 268 50 246 Q 58 230 68 220 L 74 226 Q 62 240 56 260 Q 48 282 48 300 Z" fill="#04101e" opacity="0.4" />
        <path d="M 156 300 Q 158 268 150 246 Q 142 230 132 220 L 126 226 Q 138 240 144 260 Q 152 282 152 300 Z" fill="#04101e" opacity="0.4" />

        {/* White shirt */}
        <path d="M 82 206 L 100 268 L 118 206 Q 109 200 100 200 Q 91 200 82 206 Z" fill={url('shirt')} />
        <circle cx="100" cy="224" r="2" fill="#dcd4c6" stroke="#b8b0a0" strokeWidth="0.4" />
        <circle cx="100" cy="240" r="2" fill="#dcd4c6" stroke="#b8b0a0" strokeWidth="0.4" />

        {/* Collar */}
        <path d="M 82 206 L 89 198 L 100 214 L 111 198 L 118 206 L 100 268 Z" fill={url('shirt')} />

        {/* Lapels */}
        <path d="M 82 206 L 100 268 L 92 288 L 62 252 Q 60 234 68 216 Z" fill="#0c3452" />
        <path d="M 118 206 L 100 268 L 108 288 L 138 252 Q 140 234 132 216 Z" fill="#0c3452" />

        {/* Teal pocket square */}
        <path d="M 122 246 L 136 243 L 137 251 L 124 253 Z" fill={url('teal')} />
        {/* Gold pin */}
        <circle cx="122" cy="236" r="4.2" fill={url('gold')} />
        <circle cx="121" cy="235" r="1.6" fill="#fbeeb0" opacity="0.9" />

        {/* Belt */}
        <rect x="66" y="286" width="68" height="7" rx="2" fill="#050d18" />
        <rect x="93" y="285" width="14" height="9" rx="2" fill="#091626" stroke={url('gold')} strokeWidth="1" />
      </g>

      {/* ═══ ARMS ═══ */}
      <g>
        <g ref={armLRef} opacity="0"><g transform="matrix(-1 0 0 1 200 0)">{makeArm()}</g></g>
        <g ref={armRRef} opacity="0">{makeArm()}</g>
      </g>

      {/* ═══ HEAD — oversized, ~60% of figure height ═══ */}
      <g ref={headRef}>
        {/* Back hair — simple rounded bob, no elaborate updo */}
        <path d="M 100 18 C 46 18 26 58 26 98 C 26 128 32 150 40 168 C 48 172 58 166 58 156 C 54 136 52 116 52 98 L 148 98 C 148 116 146 136 142 156 C 142 166 152 172 160 168 C 168 150 174 128 174 98 C 174 58 154 18 100 18 Z"
          fill={url('hair')} />

        {/* Neck (short, chibi) */}
        <path d="M 86 158 Q 86 176 82 184 Q 100 192 118 184 Q 114 176 114 158 Z" fill="#d38e5e" />

        {/* Face — big, round */}
        <path d="M 52 96 C 50 48 72 42 100 42 C 128 42 150 48 148 96 C 149 138 128 172 112 182 C 104 187 96 187 88 182 C 72 172 51 138 52 96 Z"
          fill={url('skin-face')} />
        <ellipse cx="68"  cy="140" rx="15" ry="9" fill={url('blush')} />
        <ellipse cx="132" cy="140" rx="15" ry="9" fill={url('blush')} />

        {/* Ears + gold studs */}
        <circle cx="52" cy="116" r="3.6" fill={url('gold')} />
        <circle cx="148" cy="116" r="3.6" fill={url('gold')} />

        {/* Eyebrows — thick and expressive */}
        <g ref={browsRef}>
          <path ref={browLRef} d={BROW.friendly.l} fill="none" stroke="#2a1808" strokeWidth="4" strokeLinecap="round" />
          <path ref={browRRef} d={BROW.friendly.r} fill="none" stroke="#2a1808" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Eyes — huge, glossy, anime-cute */}
        <g ref={eyesRef}>
          <path d="M 58 122 Q 76 106 94 122 Q 76 136 58 122 Z"  fill="#fffdf8" />
          <path d="M 106 122 Q 124 106 142 122 Q 124 136 106 122 Z" fill="#fffdf8" />
          <g ref={pupilsRef}>
            <g clipPath={url('eye-l')}>
              <circle cx="76"  cy="122" r="10.5" fill={url('iris')} />
              <circle cx="76"  cy="122" r="10.5" fill="none" stroke="#160806" strokeWidth="1.1" />
              <circle cx="76"  cy="122" r="4.6" fill="#0a0402" />
              <circle cx="80"  cy="117.5" r="3.2" fill="#fff" />
              <circle cx="71.5" cy="126" r="1.4" fill="#fff" opacity="0.75" />
            </g>
            <g clipPath={url('eye-r')}>
              <circle cx="124" cy="122" r="10.5" fill={url('iris')} />
              <circle cx="124" cy="122" r="10.5" fill="none" stroke="#160806" strokeWidth="1.1" />
              <circle cx="124" cy="122" r="4.6" fill="#0a0402" />
              <circle cx="128" cy="117.5" r="3.2" fill="#fff" />
              <circle cx="119.5" cy="126" r="1.4" fill="#fff" opacity="0.75" />
            </g>
          </g>
          <path d="M 57 122 Q 76 104.5 95 122"  fill="none" stroke="#160808" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 105 122 Q 124 104.5 143 122" fill="none" stroke="#160808" strokeWidth="2.6" strokeLinecap="round" />
          {/* Lashes — a couple of exaggerated flicks for the "cute" read */}
          <path d="M 57 122 l -3.4 -2 M 105 122 l 3.4 -2" stroke="#160808" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Tiny button nose */}
        <ellipse cx="100" cy="140" rx="2.6" ry="1.8" fill="#e0a26e" opacity="0.7" />

        {/* Mouth */}
        <path ref={mouthRef} d={rest.d} fill="#611c2c" stroke={url('lip')} strokeWidth="3.2" strokeLinejoin="round" />
        <g clipPath={url('mouth-clip')}>
          <g ref={teethRef} opacity="0">
            <path d="M 87 146 Q 100 144.5 113 146 L 113 150 Q 100 151.5 87 150 Z" fill="#f4f0e8" />
          </g>
        </g>

        {/* Front hair / fringe — simple rounded bangs */}
        <path d="M 50 100 C 48 56 72 38 100 38 C 128 38 152 56 150 100 C 142 82 126 70 112 66 C 102 76 78 78 62 92 Z"
          fill={url('hair')} />

        {/* Two playful pigtail buns instead of a formal updo — funnier, younger read */}
        <circle cx="38" cy="66" r="17" fill={url('hair')} />
        <circle cx="162" cy="66" r="17" fill={url('hair')} />
        <rect x="30" y="80" width="16" height="10" rx="5" fill={url('gold')} />
        <rect x="154" y="80" width="16" height="10" rx="5" fill={url('gold')} />
      </g>
    </svg>
  );
}
