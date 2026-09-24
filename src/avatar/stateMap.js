import { STATES } from '../data/states.js';

// Maps the brief's full state-machine vocabulary onto the finite set of
// visual poses DoodleCompanion actually draws (mouth/brow presets + one arm
// gesture). Keeps call sites free to reference any STATES.* value even
// though several share a rendered pose.
const MAP = {
  [STATES.IDLE]: { expression: 'calm', arm: 'none' },
  [STATES.LISTENING]: { expression: 'curious', arm: 'none' },
  [STATES.THINKING]: { expression: 'curious', arm: 'chin' },
  [STATES.SPEAKING]: { expression: 'explaining', arm: 'explain' },
  [STATES.EXPLAINING]: { expression: 'explaining', arm: 'explain' },
  [STATES.POINTING_LEFT]: { expression: 'confident', arm: 'point-left' },
  [STATES.POINTING_RIGHT]: { expression: 'confident', arm: 'point-right' },
  [STATES.POINTING_DOWN]: { expression: 'calm', arm: 'point-down' },
  [STATES.POINTING_UP]: { expression: 'confident', arm: 'point-up' },
  [STATES.WAVING]: { expression: 'friendly', arm: 'wave' },
  [STATES.GREETING]: { expression: 'friendly', arm: 'wave' },
  [STATES.CURIOUS]: { expression: 'curious', arm: 'none' },
  [STATES.EXCITED]: { expression: 'motivating', arm: 'explain' },
  [STATES.HAPPY]: { expression: 'friendly', arm: 'explain' },
  [STATES.ENCOURAGING]: { expression: 'confident', arm: 'explain' },
  [STATES.CONFIDENT]: { expression: 'confident', arm: 'explain' },
  [STATES.SERIOUS]: { expression: 'serious', arm: 'none' },
  [STATES.EMPATHETIC]: { expression: 'concerned', arm: 'none' },
  [STATES.SURPRISED]: { expression: 'surprised', arm: 'none' },
  [STATES.SUCCESS]: { expression: 'motivating', arm: 'thumb' },
  [STATES.CELEBRATING]: { expression: 'motivating', arm: 'thumb' },
  [STATES.GOODBYE]: { expression: 'friendly', arm: 'wave' },
};

export function resolveState(state) {
  return MAP[state] ?? MAP[STATES.IDLE];
}
