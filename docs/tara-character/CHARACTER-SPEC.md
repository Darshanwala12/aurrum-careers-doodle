# Tara — AI Career Counsellor

Tara is an original adult female AI career counsellor. Her personality is funny, friendly, confident, practical and professional. She should feel like a lively game companion who can make job-search advice less intimidating.

## Approved visual direction

The approved design is the playful 3D cartoon direction shown in `02-master-design.png`. Use that image as the primary identity reference. Use the other boards for construction, expressions and animation only; do not average her face with the unused concepts in `01-concept-directions.png`.

## Identity lock

- Warm caramel skin: `#C9825E`
- Dark chocolate hair: `#2B1C24`
- Deep brown eyes: `#3B241C`
- Asymmetric chin-length rounded bob, with a large swept section over her right side
- Large rounded eyes, thick mobile eyebrows, rounded cheeks, small nose and broad friendly smile
- Clearly adult, compact pear-shaped body
- Stylized head-to-body ratio: approximately 1:4
- Short torso, wider hips, short sturdy legs, slightly oversized hands and chunky feet

## Clothing lock

- Deep navy blazer and ankle trousers: `#0B1F3A`
- Professional-blue lapels: `#174A7E`
- Narrow teal AI piping and shoe accents: `#14B8A6`
- White scoop-neck blouse and sneakers: `#FFFFFF`
- Small gold buttons, hoop earrings and bracelet: `#C9A227`
- Tiny teal pendant in a gold setting
- Blazer, blouse, trousers and shoes are separate model/material groups

## Expressions

Required facial states are neutral, happy, thinking, surprised, confused and encouraging. The smile, jaw opening, blink, brow lift, brow concern and eye direction must remain independently controllable. Add mouth visemes for `sil`, `PP`, `FF`, `nn`, `aa`, `E`, `O` and `U`.

## Poses and animation clips

Required clips are idle, talking, waving, pointing, explaining and celebrating. The production character should also support blink, breathing, subtle eye/head movement, thinking, greeting, encouraging, success and surprised states used by the existing controller.

## Props

Approved removable props are a slim teal tablet, navy notebook with gold elastic, lightweight teal-accent AI headset and round professional glasses. These must be separate attachable objects. Tara's default appearance does not include glasses, headset or a handheld prop.

## 3D production requirements

- Full-body GLB or VRM, modeled from `03-turnaround.png`
- Clean deformation topology around eyes, mouth, shoulders, elbows, hips, knees and fingers
- Humanoid skeleton with articulated fingers and separate eye controls
- Separate hair, skin, eyes, teeth, blazer, blouse, trousers, shoes, jewellery and prop meshes/materials
- Facial blendshapes for the approved expressions and visemes
- Optimized PBR materials; texture atlases where they reduce draw calls without merging logical material controls
- Mobile target: one visible character, compressed GLB, capped texture sizes, lazy loading and graceful fallback

## Source boards

1. `01-concept-directions.png` — two semi-realistic and two cartoon candidates
2. `02-master-design.png` — approved master identity
3. `03-turnaround.png` — front, side, back and three-quarter construction views
4. `04-expressions.png` — neutral, happy, thinking, surprised, confused and encouraging
5. `05-poses.png` — idle, talking, waving, pointing, explaining and celebrating
6. `06-clothing-accessories-palette.png` — clothing construction, props and palette

All boards were generated as new original artwork using the built-in image generation tool. Existing named cartoon properties were used only to understand the requested broad comic energy; no face, costume, silhouette or named character was copied.
