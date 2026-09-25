import CharacterDemoViewer from './CharacterDemoViewer.jsx';

// Dev-only comparison harness — not linked from the site nav, reached only
// via ?demo=characters. Lets you eyeball rig/animation quality for candidate
// GLB models side by side before deciding whether any is worth wiring into
// the real chatbot (which none of these three are, as-is — see notes below).
const CANDIDATES = [
  {
    label: 'Candidate 1 — user-provided (glb.glb)',
    url: '/avatars/demo/candidate-1-kid.glb',
    note: 'Mesh is literally named "kid_mesh" — a child character (curly hair, sneakers, casual streetwear), not an adult professional woman. Rig is a full Mixamo humanoid skeleton with fingers. One generic Mixamo animation clip, no facial morph targets. Does not match the brand.',
  },
  {
    label: 'Candidate 2 — Michelle (three.js official examples, MIT)',
    url: '/avatars/demo/candidate-2-michelle.glb',
    note: 'Adult female, Mixamo-rigged. Clips are "SambaDance" and "TPose" only — fun to look at, but no idle/talk/gesture animations and no facial morph targets, so still not usable as-is for a career-counsellor chatbot.',
  },
  {
    label: 'Candidate 3 — Xbot (three.js official examples, MIT)',
    url: '/avatars/demo/candidate-3-xbot.glb',
    note: 'Gender-neutral "Beta" character, Mixamo-rigged, with idle/walk/run/agree/headShake/sad_pose/sneak_pose clips — the best animation variety of the three, but a generic game-character look, not a professional female career advisor, and still no facial morph targets for lip-sync.',
  },
  {
    label: 'Candidate 4 — Aria (career-counsellor pack)',
    url: '/avatars/career-pack/aria_ai_career_counsellor.glb',
    note: 'Purpose-built: navy trouser suit, ponytail. Materials literally named Deep Navy/Professional Blue/Ivory White/Teal Accent/Gold — matches the brand palette by name. Clips exactly match the requested state vocabulary (idle/thinking/talking/greeting/explaining/pointing/encouraging/happy/surprised/success). Not a skinned mesh (separate rigid node parts, no bone weights) and no facial morph targets, but by far the closest brand fit of any candidate so far.',
  },
  {
    label: 'Candidate 5 — Elena (career-counsellor pack)',
    url: '/avatars/career-pack/elena_ai_career_counsellor.glb',
    note: 'Same construction as Aria — bob hairstyle, navy skirt suit. Same 10 brand-matched materials and exact state-named clips.',
  },
  {
    label: 'Candidate 6 — Priya (career-counsellor pack)',
    url: '/avatars/career-pack/priya_ai_career_counsellor.glb',
    note: 'Same construction — bun hairstyle, navy trouser suit.',
  },
  {
    label: 'Candidate 7 — Sophie (career-counsellor pack)',
    url: '/avatars/career-pack/sophie_ai_career_counsellor.glb',
    note: 'Same construction — bun hairstyle, navy skirt suit.',
  },
];

export default function CharacterDemoPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f1ecea', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>3D character candidate comparison</h1>
      <p style={{ maxWidth: 720, color: '#5f5d5b' }}>
        Dev-only page (not linked anywhere on the site). Loads each GLB with plain three.js —
        drag to orbit, click a clip name to play it. None of these three is a drop-in
        replacement for the live 2D character; see the note under each for why.
      </p>
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: '1.5rem' }}>
        {CANDIDATES.map((c) => (
          <div key={c.url}>
            <CharacterDemoViewer url={c.url} label={c.label} />
            <p style={{ fontSize: 13, color: '#5f5d5b', marginTop: '0.5rem' }}>{c.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
