# Elena — original animated career counsellor

## Inspection and implementation

The existing app uses React 19, Vite 8, Three.js 0.180, GSAP, local knowledge retrieval, an optional remote AI endpoint, browser speech synthesis, and an optional Anam live-video path. The previously active `kid.glb` had 65 bones but no facial morphs. The supplied career pack had articulated node animations but no skin, finger rig, or visemes. Those assets were inspected, not modified or incorporated into the new model.

`public/avatars/elena-character.jpg` was viewed only as inspiration. The new character geometry, outfit, hair, facial shapes and animation data are generated from original code. No third-party character/model or texture has been reused. The original supplied `doodle/` directory remains untouched.

## Master design and asset pipeline

Elena has warm medium skin, an asymmetric plum bob, rounded cheeks, teal eyes, a navy tailored trouser suit, white blouse and trainers, professional-blue lapels, and a small gold pin with a teal center. The design is defined in `scripts/build-character.mjs`, making proportions and materials consistent across views.

Reference inspiration → original parametric master → four-view character sheet → skinned geometry → facial morphs → named animation clips → GLB → Three.js → CharacterController → chatbot.

- Model: `public/avatars/elena-original.glb` (about 3.1 MiB).
- Character sheet: `docs/character/character-sheet.png`.
- Interactive sheet and QA controls: `/?demo=elena`.
- 53 humanoid bones, including two eye controls and three joints per finger.
- 13 material meshes / draw calls; 35,440 rendered triangles.
- Separate skin, clothing, hair, eye, lip, accessory materials. PBR roughness/metalness; no texture dependencies.
- 13 relative morph targets: blink, smile, browUp, browConcern, cheekRaise, surprise, and seven mouth shapes.
- 10 embedded clips: idle, blink, thinking, talking, greeting, explaining, pointing, encouraging, success, surprised.

The model is an original stylized procedural asset with articulated mesh islands and rigid skin weights, not a hand-retopologized cinematic character. It is a GLB with a humanoid skeleton, not a certified VRM. Body geometry uses smooth indexed primitives; the source can be refined or the GLB edited in a DCC application. No claim of film-quality topology or physical-device certification is made.

Rebuild with `npm run character:build`. This uses the already-installed Three.js exporter; it needs no Blender install or remote asset service. Keep `config.js` and the generator in sync when adding morphs or clips. The exporter must preserve `morphTargetsRelative` after merging geometry; a regression test checks the actual exported deltas.

## Controller and chatbot contract

All expression mappings, animation names, legacy mappings and response validation live in `src/avatar/character/config.js`. `CharacterController` owns animation crossfades, one-shot completion, facial blending, eye movements, breathing, blinking and speech mouth shapes. React supplies structured state rather than touching bones.

The remote AI endpoint supports the original `{text, topic}` and the new response:

```json
{
  "message": "Your resume can be improved by adding measurable achievements.",
  "emotion": "encouraging",
  "animation": "explaining",
  "topic": "cv"
}
```

Valid emotions: neutral, happy, thinking, surprised, confused, encouraging, excited, smile. Invalid emotion/animation names fall back to safe defaults. Local knowledge responses use the same normalization. New questions cancel old speech and enter thinking; responses start their expression and gesture with speech; completion returns to idle. One-shot gestures do not restart every frame. Stop, replay, mute, pause, reduced motion and stale speech callbacks are handled centrally.

The intro and chatbot use the same original GLB. The main chatbot mounts after the intro so two narration engines cannot compete. The existing optional Anam live-video feature remains available when configured.

## Speech and lip-sync

The default browser TTS works without credentials. Mouth animation starts on actual speech start, uses word boundary events when available, and stops on completion/cancellation/error. Muted captions do not pretend to produce audible speech. Browser speech does **not** expose audio samples or exact phonemes: its mouth shapes are an approximate grapheme/word-timing fallback, not phoneme-accurate lip-sync.

For audio-clock timing, set `VITE_AURRUM_TTS_ENDPOINT` to a same-origin backend accepting `POST {"text":"..."}` and returning:

```json
{
  "audioUrl": "/api/tts/audio/example.wav",
  "visemes": [
    {"start": 0.0, "end": 0.12, "value": "PP"},
    {"start": 0.12, "end": 0.32, "value": "aa"},
    {"start": 0.32, "end": 0.4, "value": "sil"}
  ],
  "words": [{"start": 0.0, "charIndex": 0}]
}
```

Supported visemes: sil, PP, FF, nn, aa, E, O, U. Timings are seconds, sorted and validated. `audio.currentTime` drives the mouth, so buffering, pause and seeks remain aligned. Failed TTS requests fall back to browser speech. The backend/service and provider credentials are not included or configured; browser TTS is the working default. Keep service keys server-side.

## Rendering, layout and access

Desktop uses a fixed full-body panel. Below 900 px, a bottom-right fixed half-body launcher opens a chat sheet with the same model. The launcher is removed while the sheet is open, so it cannot overlap the composer. Escape closes the sheet; focus is contained, the background is inert, and focus returns to the launcher. Short viewports permit sheet scrolling. No pointer-tracking animation captures touch scrolling.

Renderer/model code is lazy-loaded; device pixel ratio is capped at 1.5. Rendering stops when hidden or offscreen. One RAF loop, resize observation, model disposal and context-loss fallback prevent duplicate render loops and GPU leaks. Rendering uses existing Three.js rather than adding R3F or VRM dependencies. The lab intentionally renders four views; the site renders one at a time.

## Library and license review

Reviewed 2026-09-25, before implementation:

| Library | License | Decision |
| --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE) / GLTFLoader / AnimationMixer / GLTFExporter | MIT; installed license also inspected | Reuse existing dependency for all GLB rendering and animation. |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE) | MIT | Suitable React renderer, but unnecessary for the existing Three.js lifecycle. Not installed. |
| [three-vrm](https://github.com/pixiv/three-vrm/blob/dev/LICENSE) | MIT | Suitable for VRM metadata/expressions, unnecessary for this GLB. Not installed. |
| [TalkingHead](https://github.com/met4citizen/TalkingHead/blob/main/LICENSE) | MIT; installed license inspected | Existing dependency, but its avatar assumptions are unnecessary for this original rig. Not used by the new character. |

Three.js documentation confirms [GLB loading](https://threejs.org/docs/pages/GLTFLoader.html) and [skeletal/morph animation support](https://threejs.org/manual/pages/animation-system.html). Library licenses do not license any sample characters; none are reused here. The Three.js MIT notice is retained in `THREE-LICENSE.txt`.

## Verification

Run `npm run test:character`, `npm run lint`, and `npm run build`. Tests load the exported GLB, validate skin/finger/morph/clip structure and delta coordinates, validate structured response fallback, run one-shot transitions, check audio-clock mouth/stop behavior, reduced motion, and stale speech callback ownership.

Browser QA screenshots and observations are recorded in `QA.md`. Browser viewport testing is not a substitute for real iOS/Android audio, keyboard, thermal and GPU testing. No hosted TTS backend was available for a live provider timing test; that path was exercised with a controlled audio clock in automated tests.
