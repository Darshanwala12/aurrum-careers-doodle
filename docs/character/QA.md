# Character QA — 2026-09-25

## Automated

`npm run test:character`: 6 tests passed. Tests load the actual exported GLB, rather than a stub. They cover bones/fingers, normalized skin weights, all morph and clip names, bounded relative morph deltas, response validation, one-shot return to idle, audio-clock visemes and pause/end, reduced motion, and stale speech cancellation.

`npm run build`: production build passed. Three.js/GLTFLoader remains a lazy vendor chunk of approximately 578 kB before gzip (146 kB gzip), which produces Vite's bundle-size advisory. The main chunk is about 378 kB, down from the original eager Three.js path. No runtime packages were added.

`npm run lint`: completes with warnings in existing avatar, narration, live-video and scroll code; no lint errors.

## Browser verification

Tested using the local Chromium-based in-app browser and viewport overrides, not physical mobile devices:

| Viewport | Checks |
| --- | --- |
| 1440 × 900 desktop | Full-body model, all four character-sheet views, explaining gesture, surprised face, model failure/recovery, desktop chatbot CV response, Stop, fixed panel at y=57.59 after automatic section scroll. |
| 1024 × 600 short desktop | Full body visible in the 200-pixel stage; input at y≈374–412; accessibility bar ends at y≈590, inside the viewport. |
| 768 × 1024 tablet | Half-body chat sheet, readable response, visible composer, no horizontal overflow, response preserved during resizing. |
| 390 × 844 phone | Fixed 100 × 130 launcher, half-body chat, interview/trial responses, history, closing restores focus and unlocks scrolling. Input remains below the character. |
| 320 × 568 small phone | No horizontal overflow. Input at y≈299–339, below the character at y≈117–224. Short sheet can scroll; status shown in header rather than covering the face. |

Measured desktop rendering: 13 draw calls, 35,440 triangles, approximately 60 FPS, including the four-view lab on this machine. This is not a phone GPU/thermal benchmark.

The failure checkbox deliberately requests a missing GLB. All four views show the chat-available fallback; unchecking reloads the original model successfully. Expected failed-request diagnostics from this deliberate test are not normal runtime failures.

Visual QA caught two issues and they were repaired: relative blendshape coordinates lost during mesh merging, and CSS load order reapplying the old lateral character shift. The exported-coordinate regression now prevents a collapsing face on expression changes.

## Evidence

- `character-sheet.png`: front, side, back and three-quarter views of the same GLB.
- `desktop.png`: original character integrated in the existing site.
- `mobile.png`: working chat sheet and visible controls.
- `mobile-launcher.png`: floating character launcher.
- `tablet.png`: tablet chat layout.

## Remaining verification limits

Browser TTS word boundaries were used during interactive chat tests; phoneme accuracy is not claimed. The optional hosted TTS adapter was tested against a controlled audio clock, not a configured live TTS provider. Real Safari/iOS, Android, software keyboards, voice availability, low-end GPU behavior, and prolonged thermal performance require device testing. The generated asset uses articulated procedural topology with rigid skin weights; it is not a cinematic retopology deliverable.
