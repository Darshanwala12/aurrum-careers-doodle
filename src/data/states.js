// Character animation state machine (brief §4). Only the states actually
// rendered by DoodleCompanion are implemented as distinct visual poses;
// the rest reuse the closest neighbour so the vocabulary stays stable if
// dedicated poses are added later without touching call sites.
export const STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  EXPLAINING: 'explaining',
  POINTING_LEFT: 'pointing_left',
  POINTING_RIGHT: 'pointing_right',
  POINTING_DOWN: 'pointing_down',
  POINTING_UP: 'pointing_up',
  WAVING: 'waving',
  GREETING: 'greeting',
  CURIOUS: 'curious',
  EXCITED: 'excited',
  HAPPY: 'happy',
  ENCOURAGING: 'encouraging',
  CONFIDENT: 'confident',
  SERIOUS: 'serious',
  EMPATHETIC: 'empathetic',
  SURPRISED: 'surprised',
  SUCCESS: 'success',
  CELEBRATING: 'celebrating',
  GOODBYE: 'goodbye',
};
