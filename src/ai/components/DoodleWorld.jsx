/**
 * Context-reactive doodle objects drawn beside the character. Each object is
 * hand-drawn line art whose strokes "draw on" (CSS stroke-dashoffset) when it
 * appears, plus a handwritten annotation and a highlight that sweeps across
 * the object — so the character visibly explains, not just talks.
 */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1 };

const OBJECTS = {
  cv: (
    <>
      <path {...P} d="M18 8 H78 L92 22 V112 H18 Z" />
      <path {...P} d="M78 8 V22 H92" />
      <circle {...P} cx="34" cy="30" r="8" />
      <path {...P} d="M48 26 H80 M48 34 H72" />
      <path {...P} d="M28 52 H82 M28 62 H76 M28 72 H80 M28 86 H70 M28 96 H78" />
      <rect className="aurrum-ai-character__sweep" x="24" y="56" width="62" height="10" rx="3" />
      <path {...P} className="aurrum-ai-character__tick" d="M64 100 l6 6 l14 -16" />
    </>
  ),
  jobs: (
    <>
      <rect {...P} x="10" y="20" width="56" height="36" rx="6" transform="rotate(-8 38 38)" />
      <rect {...P} x="30" y="44" width="56" height="36" rx="6" transform="rotate(5 58 62)" />
      <rect {...P} x="22" y="72" width="60" height="38" rx="6" />
      <path {...P} d="M32 84 H62 M32 94 H54" />
      <path {...P} className="aurrum-ai-character__tick" d="M66 88 l5 5 l11 -12" />
    </>
  ),
  linkedin: (
    <>
      <rect {...P} x="10" y="14" width="84" height="96" rx="8" />
      <path {...P} d="M10 40 H94" />
      <circle {...P} cx="30" cy="42" r="12" />
      <path {...P} d="M22 66 H80 M22 76 H66 M22 90 H74 M22 100 H58" />
      <rect className="aurrum-ai-character__sweep" x="18" y="61" width="66" height="10" rx="3" />
    </>
  ),
  interview: (
    <>
      <path {...P} d="M12 18 H70 A8 8 0 0 1 78 26 V58 A8 8 0 0 1 70 66 H34 L20 78 V66 H12 Z" />
      <path {...P} d="M24 34 H64 M24 46 H54" />
      <rect {...P} x="62" y="60" width="18" height="30" rx="9" />
      <path {...P} d="M56 80 Q71 100 86 80 M71 96 V110 M62 110 H80" />
    </>
  ),
  roadmap: (
    <>
      <path {...P} d="M14 104 C 30 104, 26 76, 46 74 S 64 52, 58 40 S 78 16, 92 14" />
      <circle {...P} cx="14" cy="104" r="4" />
      <circle {...P} cx="46" cy="74" r="4" />
      <circle {...P} cx="60" cy="42" r="4" />
      <path {...P} d="M92 14 V2 M92 2 L104 6 L92 10" />
      <path {...P} className="aurrum-ai-character__tick" d="M40 96 l5 5 l10 -11" />
    </>
  ),
  target: (
    <>
      <circle {...P} cx="54" cy="60" r="42" />
      <circle {...P} cx="54" cy="60" r="27" />
      <circle {...P} cx="54" cy="60" r="11" />
      <path {...P} className="aurrum-ai-character__arrow" d="M104 14 L58 56 M58 56 l2 -12 M58 56 l12 -2" />
    </>
  ),
  calendar: (
    <>
      <rect {...P} x="12" y="20" width="84" height="84" rx="8" />
      <path {...P} d="M12 42 H96 M32 12 V28 M76 12 V28" />
      <path {...P} d="M26 58 H38 M48 58 H60 M70 58 H82 M26 74 H38 M48 74 H60 M70 74 H82 M26 90 H38" />
      <circle {...P} className="aurrum-ai-character__tick" cx="76" cy="90" r="9" />
    </>
  ),
  compass: (
    <>
      <circle {...P} cx="56" cy="60" r="44" />
      <path {...P} d="M56 20 V28 M56 92 V100 M16 60 H24 M88 60 H96" />
      <path {...P} className="aurrum-ai-character__needle" d="M56 60 L70 34 L60 62 Z M56 60 L42 86 L52 58 Z" />
    </>
  ),
};

export default function DoodleWorld({ world, note, active }) {
  if (!world || !OBJECTS[world]) return null;
  return (
    <div
      className={`aurrum-ai-character__doodle ${active ? 'is-active' : ''}`}
      key={world + note}
      aria-hidden="true"
    >
      <svg viewBox="0 0 110 120" className="aurrum-ai-character__doodle-svg">{OBJECTS[world]}</svg>
      {note && <span className="aurrum-ai-character__note">{note}</span>}
    </div>
  );
}
