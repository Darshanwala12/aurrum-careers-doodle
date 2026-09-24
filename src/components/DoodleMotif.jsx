// A small shared visual language of doodle world-objects (brief §15).
// Single-stroke, rounded, one accent colour — never a stock illustration.
const PATHS = {
  stars: (
    <>
      <path d="M40 20 L44 32 L56 34 L46 42 L49 54 L40 47 L31 54 L34 42 L24 34 L36 32 Z" />
      <circle cx="70" cy="18" r="2.5" />
      <circle cx="12" cy="50" r="2" />
    </>
  ),
  laptop: (
    <>
      <rect x="16" y="18" width="48" height="30" rx="3" />
      <path d="M8 52 L72 52 L66 60 L14 60 Z" />
      <path d="M26 30 h28" />
      <path d="M26 38 h18" />
    </>
  ),
  compass: (
    <>
      <circle cx="40" cy="36" r="26" />
      <path d="M40 22 L46 40 L40 50 L34 40 Z" />
      <circle cx="40" cy="36" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  network: (
    <>
      <circle cx="20" cy="20" r="6" />
      <circle cx="60" cy="20" r="6" />
      <circle cx="40" cy="52" r="6" />
      <path d="M25 23 L36 48" />
      <path d="M55 23 L44 48" />
      <path d="M26 20 L54 20" />
    </>
  ),
  cv: (
    <>
      <rect x="16" y="10" width="40" height="52" rx="3" />
      <path d="M24 22 h24" />
      <path d="M24 30 h24" />
      <path d="M24 38 h16" />
      <circle cx="30" cy="50" r="6" />
    </>
  ),
  jobcards: (
    <>
      <rect x="8" y="16" width="28" height="20" rx="3" />
      <rect x="40" y="24" width="28" height="20" rx="3" />
      <path d="M14 44 h16" />
      <path d="M46 52 h16" />
    </>
  ),
  linkedin: (
    <>
      <rect x="14" y="10" width="44" height="44" rx="6" />
      <circle cx="26" cy="24" r="3" />
      <path d="M26 32 v14" />
      <path d="M38 46 v-8 a5 5 0 0 1 10 0 v8" />
      <path d="M38 32 v14" />
    </>
  ),
  mic: (
    <>
      <rect x="30" y="8" width="16" height="30" rx="8" />
      <path d="M18 32 a20 20 0 0 0 40 0" />
      <path d="M38 52 v10" />
      <path d="M28 62 h20" />
    </>
  ),
  ladder: (
    <>
      <path d="M20 60 V12" />
      <path d="M52 60 V12" />
      <path d="M20 48 H52" />
      <path d="M20 34 H52" />
      <path d="M20 20 H52" />
    </>
  ),
  calendar: (
    <>
      <rect x="10" y="14" width="52" height="44" rx="4" />
      <path d="M10 26 h52" />
      <path d="M22 8 v12" />
      <path d="M50 8 v12" />
      <path d="M22 36 h8 M34 36 h8 M46 36 h8" />
      <path d="M22 46 h8 M34 46 h8" />
    </>
  ),
  target: (
    <>
      <circle cx="36" cy="36" r="24" />
      <circle cx="36" cy="36" r="14" />
      <circle cx="36" cy="36" r="4" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function DoodleMotif({ name, size = 72, className = '' }) {
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      className={`doodle-motif ${className}`}
      width={size}
      height={size}
      viewBox="0 0 80 68"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
