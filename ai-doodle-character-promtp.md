Yes. Use a prompt like this in Claude when you want it to understand the character sheet and then help you build the same kind of character system for your website.

You can paste this directly:

---

I am building an AI Career Counsellor website and I want to use the attached character sheet as the PRIMARY VISUAL REFERENCE.

Your job is NOT to copy the character exactly. Use it only as a reference for the overall visual language, proportions, friendliness, polish, and character-sheet structure.

The final character must be an ORIGINAL female AI Career Counsellor.

The reference shows:
- Polished 3D/cartoon styling
- Soft rounded facial structure
- Large expressive eyes
- Friendly professional appearance
- Clean stylized anatomy
- Full-body professional outfit
- Multiple turnaround views
- Multiple facial expressions
- Multiple hand gestures and poses
- Consistent hairstyle, clothing, face, proportions, and colors across all views

I want you to help me create this as an actual interactive website character.

### PHASE 1 — ANALYZE MY EXISTING PROJECT

First inspect my complete existing codebase before changing anything.

Identify:
- Framework being used
- React / Next.js / Vite setup
- Existing chatbot architecture
- AI API integration
- Main chat components
- Current state-management approach
- CSS / Tailwind / styling system
- Desktop/mobile layouts
- Current animation libraries
- Three.js or WebGL usage, if any
- Existing assets folder structure
- Current chatbot request/response flow

Do not modify any code until you understand how the existing system works.

Do not break my current chatbot.

### PHASE 2 — CHARACTER ARCHITECTURE

Create the character system separately from chatbot logic.

Use a modular architecture similar to:

/components
  /character
    CareerCounsellorAvatar
    CharacterScene
    CharacterController
    CharacterExpressionController
    CharacterAnimationController
    CharacterLipSync
    CharacterGaze
    CharacterLoader

/hooks
    useCharacterAnimation
    useCharacterExpression
    useLipSync
    useCharacterState

/lib
    characterStates
    animationMap
    expressionMap
    chatbotToCharacterBridge

/assets
    /character
        model
        animations
        textures

The character model must remain replaceable later without rewriting chatbot logic.

The chatbot should only send high-level states such as:

idle
thinking
talking
explaining
greeting
pointing
encouraging
happy
surprised
success

The character controller should translate those states into actual animations.

### PHASE 3 — 3D CHARACTER

The target character is an original female AI Career Counsellor with:

- Cute modern cartoon appearance
- Young professional adult appearance
- Friendly and approachable
- Large expressive eyes
- Soft rounded facial structure
- Natural smile
- Stylized but professional body proportions
- Original distinctive hairstyle
- Clean hands and readable fingers
- Professional posture
- Warm personality
- Slightly playful, but not childish
- Full-body design

Clothing:

- Deep navy professional blazer
- White or ivory inner top
- Tailored navy trousers
- Elegant professional shoes
- Small gold earrings
- Small gold necklace
- Optional subtle teal AI pin
- Optional tablet or notebook

Avoid:
- Completely black clothing
- Child-like proportions
- Overly exaggerated anime proportions
- Sexualized body design
- Photorealistic appearance

Use these exact brand colors:

Deep Navy: #0B1F3A  
Professional Blue: #174A7E  
White: #FFFFFF  
Teal: #14B8A6  
Gold: #C9A227

Primary colors:
Navy + White

Secondary accent:
Teal

Premium details:
Gold

### PHASE 4 — MODEL FORMAT

Preferred production model format:

GLB

Also support where practical:
- glTF
- VRM

Requirements:

- Full body
- Web optimized
- Clean humanoid skeleton
- Rigged arms
- Rigged hands
- Rigged fingers
- Head bone
- Neck bone
- Eye bones or morph targets
- Facial morph targets where available
- Blinking
- Eye movement
- Mouth movement
- Lip-sync compatible mouth shapes
- Separate hair material
- Separate skin material
- Separate clothing material
- PBR materials
- Optimized textures
- Smooth deformation
- Mobile-friendly polygon count

Do not hard-code the website around one specific model.

### PHASE 5 — RESEARCH LIBRARIES

Research current maintained open-source options before choosing the stack.

Evaluate:

- React Three Fiber
- Three.js
- @react-three/drei
- @pixiv/three-vrm
- VRM
- GLB / glTF
- Mixamo-compatible animation pipelines
- TalkingHead
- react-ai-avatar
- anime-avatar
- CharacterStudio
- Ready Player Me alternatives if appropriate
- Rhubarb Lip Sync or browser-compatible alternatives
- Web Audio API
- Web Speech API where appropriate

For every external library, provide:

- GitHub/project link
- License
- Commercial-use suitability
- Maintenance status
- Bundle/performance considerations
- Why you recommend or reject it

Do not use an asset or model if its commercial license is unclear.

Prefer MIT, Apache-2.0, BSD, CC0, or similarly commercial-friendly licenses where possible.

### PHASE 6 — CHARACTER STATES

Implement these character states:

idle  
thinking  
talking  
greeting  
explaining  
pointing  
encouraging  
happy  
surprised  
success

Create a clean state machine.

Example:

idle
↓
user submits message
↓
thinking
↓
AI response begins
↓
talking
↓
important explanation
↓
explaining
↓
positive closing
↓
encouraging
↓
idle

Animation changes should crossfade smoothly.

Do not abruptly switch animations.

### PHASE 7 — NATURAL BEHAVIOR

While idle:

- Natural blinking
- Light breathing
- Small shoulder movement
- Very subtle head motion
- Occasional eye movement
- Maintain eye contact most of the time

While thinking:

- Slight head tilt
- Eyes briefly shift upward or sideways
- Optional hand-to-chin gesture
- Calm thinking expression

While talking:

- Mouth movement
- Natural blinking
- Very small head motion
- Light hand gestures
- Eye contact toward user
- Do not repeat the same gesture constantly

While explaining:

- Open hand gesture
- Palm-up gesture
- Controlled arm movement
- Confident friendly expression

While pointing:

- Raise one hand
- Point naturally toward relevant UI content
- Keep fingers anatomically readable

While encouraging:

- Warm smile
- Small nod
- Positive hand gesture

While success:

- Larger smile
- Short celebratory gesture
- Do not make it overly childish

### PHASE 8 — EXPRESSIONS

Support these expressions:

neutral  
happy  
thinking  
explaining  
surprised  
encouraging

Expression changes should be independent from body animation when possible.

For example:

animation = talking  
expression = happy

or

animation = explaining  
expression = neutral

Build expression control separately from animation control.

### PHASE 9 — LIP SYNC

Prepare the architecture for lip sync.

Support two possible levels:

LEVEL 1:
Simple real-time mouth openness based on audio amplitude.

LEVEL 2:
Phoneme or viseme-based lip sync when supported.

Possible visemes:

AA
EE
IH
OH
OU
FV
L
MBP
WQ
REST

If the current AI system uses text-to-speech, connect the audio playback state with character mouth animation.

Character should start talking when TTS audio starts.

Character should return to idle when audio ends.

Do not tightly couple the lip-sync engine to the AI provider.

### PHASE 10 — CHATBOT INTEGRATION

Create a bridge between chatbot behavior and character behavior.

Example interface:

setCharacterState("thinking")

setCharacterState("talking")

setCharacterState("explaining")

setCharacterExpression("happy")

setCharacterExpression("encouraging")

Example chatbot lifecycle:

onUserMessageStart()
→ thinking

onAIStreamStart()
→ talking

onAIImportantExplanation()
→ explaining

onAIPositiveClosing()
→ encouraging

onAIComplete()
→ idle

The existing chatbot must continue working even if the 3D character fails to load.

The character layer must fail gracefully.

### PHASE 11 — DESKTOP WEBSITE LAYOUT

On desktop:

- Full-body character
- Dedicated character area
- Character stays fixed or sticky
- Character must not scroll with long chat content
- Full body must remain visible
- Adequate empty space around the character
- No clipping of hair, hands, or shoes
- Character must not overlap chatbot text

Recommended layout concept:

LEFT OR RIGHT SIDE:
Character area

OTHER SIDE:
Chat interface / career guidance content

Character container should use:

position: sticky

or

position: fixed

depending on current layout.

Use correct z-index management.

### PHASE 12 — MOBILE

On mobile:

- Use half-body or 3/4-body crop
- Bottom-right floating assistant position
- Character remains fixed
- Character should scale smoothly
- Character should never cover:
  - Message input
  - Send button
  - Form controls
  - Navigation
  - CTA buttons
  - Important content

Use safe-area insets.

Account for:

env(safe-area-inset-bottom)

and

env(safe-area-inset-right)

Allow the character to become smaller on narrow screens.

If necessary, allow collapse/minimize behavior.

### PHASE 13 — PERFORMANCE

Optimize aggressively for web.

Target:

- Lazy-load 3D character
- Load chatbot first
- Character can load afterward
- Compress GLB
- Use Draco or Meshopt where appropriate
- Compress textures
- Prefer WebP/KTX2 where possible
- Reduce animation file size
- Avoid unnecessary real-time shadows
- Limit lights
- Avoid excessive post-processing
- Use lower DPR on mobile
- Pause expensive rendering when tab is inactive
- Respect prefers-reduced-motion

Do not allow the avatar to noticeably slow down chat interaction.

### PHASE 14 — FALLBACK

Create fallback behavior.

If WebGL is unavailable:

show a static 2D version of the character.

If model loading fails:

show a lightweight PNG/WebP character.

If animations fail:

show idle avatar without animation.

The chatbot itself must remain fully usable.

### PHASE 15 — ACCESSIBILITY

The avatar must not interfere with accessibility.

Requirements:

- Chat remains fully keyboard accessible
- Avatar should not steal focus
- Decorative avatar should use appropriate aria-hidden behavior
- Character sounds must follow user audio preferences
- Respect prefers-reduced-motion
- Add mute control if speech/audio exists

### PHASE 16 — CHARACTER SHEET REFERENCE

Use the attached character sheet only as a visual reference.

Maintain approximately this presentation language:

TOP:
Turnaround views

- Front
- 3/4
- Side
- Back

MIDDLE:
Expression headshots

- Neutral
- Happy
- Thinking
- Explaining
- Surprised
- Encouraging

BOTTOM:
Gesture / pose examples

- Greeting
- Talking
- Hand explaining
- Pointing
- Waving

The final production character should remain visually consistent across all states.

### PHASE 17 — IMPORTANT CONSISTENCY RULE

The same character must always maintain:

- Same face
- Same eye shape
- Same eye color
- Same hairstyle
- Same hair color
- Same skin tone
- Same blazer
- Same trousers
- Same accessories
- Same proportions

Do not generate each pose as if it were a different woman.

All poses and expressions must clearly represent the exact same original character.

### PHASE 18 — DO NOT DO THESE

Do not:

- Rewrite my chatbot from scratch
- Change my AI provider without a strong reason
- Break streaming responses
- Mix chatbot logic with 3D rendering logic
- Hard-code animation logic into UI components
- Use random animation names throughout the app
- Use unlicensed character models
- Add very heavy WebGL effects
- Add unnecessary dependencies
- Add huge texture files
- Make the character cover mobile controls
- Use a completely different character for each animation
- Copy the attached character exactly

### PHASE 19 — IMPLEMENTATION PROCESS

Work in this order:

1. Inspect repository
2. Explain current architecture
3. Identify best integration point
4. Recommend character technology stack
5. Explain licensing
6. Create character component architecture
7. Add static placeholder first
8. Add 3D model loader
9. Add animation controller
10. Add expression controller
11. Add blinking/gaze
12. Connect chatbot states
13. Add lip-sync architecture
14. Add responsive desktop layout
15. Add responsive mobile layout
16. Add fallback handling
17. Optimize performance
18. Test chatbot regression
19. Test mobile responsiveness
20. Provide final file-by-file summary

### PHASE 20 — BEFORE WRITING CODE

Before editing anything, tell me:

- What framework my project uses
- Where my chatbot logic is located
- Where character integration should happen
- What existing files you will modify
- What new files you will create
- Which libraries you recommend
- Why you recommend them
- Any licensing concerns
- Any performance risks

Then proceed with implementation.

### FINAL GOAL

I want the finished experience to feel like this:

A user enters the website.

The female AI Career Counsellor is standing beside the chat interface with a subtle idle breathing animation.

She occasionally blinks and maintains eye contact.

The user asks:

“Which career should I choose?”

She briefly changes to a thinking animation.

When the response begins, she naturally starts talking.

Her mouth moves with speech.

Her head moves slightly.

She occasionally gestures with one hand.

When explaining an important career point, she changes to an explaining gesture.

When giving positive guidance, she smiles and uses an encouraging animation.

When the answer finishes, she smoothly returns to idle.

The overall experience should feel polished, warm, professional, responsive, and premium rather than like a simple chatbot with a decorative image.

Do not just explain what could be built.

Analyze my actual codebase and implement the solution step-by-step while preserving my current chatbot.

---

### One extra instruction I strongly recommend adding to Claude

At the very end, add:

> Whenever you need information that is not available in my repository, clearly tell me what asset is missing instead of inventing it. In particular, do not pretend that a PNG character sheet is already a rigged GLB/VRM model. If a production 3D model is required, create the integration architecture with a temporary placeholder and clearly identify the model, rig, animation, blendshape, and lip-sync assets I still need to provide.

That last instruction is important because **Claude can write the website and animation integration code, but this character-sheet PNG by itself is not a rigged 3D model**. You will still need to create/commission the actual `.glb`, `.gltf`, or `.vrm` character before you can get true full-body rigging, gestures, blinking, and lip-sync.