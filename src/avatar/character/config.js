export const MODEL_URL = '/avatars/elena-original.glb';
export const EMOTIONS = {
  neutral: {}, happy: { smile: .8, cheekRaise: .5 }, thinking: { browUp: .35, browConcern: .35 },
  surprised: { browUp: 1, surprise: .8 }, confused: { browConcern: .9 },
  encouraging: { smile: .55, browUp: .25 }, excited: { smile: 1, browUp: .7, cheekRaise: .8 },
  smile: { smile: 1 },
};
// Local bone rotations, in radians. Every exported clip contains a complete
// pose, making crossfades deterministic even after an interrupted gesture.
export const POSES = {
  idle: {}, blink: {},
  thinking: { Head: [-.08, -.12, -.13], RightUpperArm: [-.45, 0, -.3], RightLowerArm: [-1.65, 0, -.4] },
  talking: { RightUpperArm: [-.2, 0, -.2], RightLowerArm: [-.5, 0, 0] },
  greeting: { RightUpperArm: [0, 0, -2.3], RightLowerArm: [0, 0, -.4], RightHand: [.15, 0, 0] },
  explaining: { RightUpperArm: [-.35, 0, -.45], RightLowerArm: [-.9, -.3, 0], LeftUpperArm: [-.1, 0, .18], LeftLowerArm: [-.35, 0, 0] },
  pointing: { RightUpperArm: [0, 0, -1.45], RightLowerArm: [0, -.15, 0] },
  encouraging: { LeftUpperArm: [-.4, 0, .25], LeftLowerArm: [-1.25, 0, .2], Head: [.08, 0, -.05] },
  success: { RightUpperArm: [0, 0, -2.2], LeftUpperArm: [0, 0, 2.2], RightLowerArm: [-.3, 0, -.25], LeftLowerArm: [-.3, 0, .25] },
  surprised: { RightUpperArm: [-.3, 0, -.5], LeftUpperArm: [-.3, 0, .5], RightLowerArm: [-1.4, 0, 0], LeftLowerArm: [-1.4, 0, 0], Head: [-.12, 0, 0] },
};
export const ANIMATIONS = Object.keys(POSES);
export const VISEMES = ['sil', 'PP', 'FF', 'nn', 'aa', 'E', 'O', 'U'];
export const MORPHS = ['blink', 'smile', 'browUp', 'browConcern', 'cheekRaise', 'surprise', ...VISEMES.slice(1).map(v => `viseme_${v}`)];
const LEGACY = {
  waving: ['happy', 'greeting'], greeting: ['happy', 'greeting'], goodbye: ['smile', 'greeting'],
  explaining: ['encouraging', 'explaining'], speaking: ['neutral', 'talking'],
  thinking: ['thinking', 'thinking'], curious: ['thinking', 'thinking'],
  empathetic: ['encouraging', 'encouraging'], encouraging: ['encouraging', 'encouraging'],
  excited: ['excited', 'success'], happy: ['happy', 'encouraging'], celebrating: ['excited', 'success'],
  success: ['excited', 'success'], surprised: ['surprised', 'surprised'],
  pointing_left: ['encouraging', 'pointing'], pointing_right: ['encouraging', 'pointing'],
  pointing_up: ['encouraging', 'pointing'], pointing_down: ['encouraging', 'pointing'],
};
export function normalizeResponse(entry = {}) {
  const [emotion, animation] = LEGACY[entry.state] ?? ['neutral', 'explaining'];
  return { ...entry, answer: typeof entry.message === 'string' ? entry.message : typeof entry.answer === 'string' ? entry.answer : '',
    emotion: Object.hasOwn(EMOTIONS, entry.emotion) ? entry.emotion : emotion,
    animation: ANIMATIONS.includes(entry.animation) ? entry.animation : animation };
}
export function characterState({ status = 'idle', response, state, speaking = false } = {}) {
  if (status === 'thinking') return { emotion: 'thinking', animation: 'thinking' };
  if (status === 'error') return { emotion: 'confused', animation: 'idle' };
  if (!speaking) return { emotion: status === 'listening' ? 'encouraging' : 'neutral', animation: 'idle' };
  return normalizeResponse(response ?? { state });
}
