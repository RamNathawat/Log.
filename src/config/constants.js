/**
 * Core Configuration Constants
 * All game mechanics, level formulas, XP scales, and WIL discipline deltas
 * are isolated here rather than hardcoded in application logic.
 */
export const CONFIG = {
  // Starting Character Setup (Configurable initial baseline calibration)
  STARTING_LEVEL: 1,
  STARTING_XP: 0,
  STARTING_ATTRIBUTES: {
    STR: 10,
    INT: 10,
    WIL: 10,
    WORK: 10,
    LIFE: 10,
    RECOVERY: 10
  },

  // Level & Effort XP Progression Curves
  BASE_XP_PER_LEVEL: 100,
  LEVEL_SCALING_EXPONENT: 1.2,
  CORE_RESPONSIBILITY_XP: 15,

  // Mindset / Discipline (WIL) Commitment Mechanics
  // Accepting a quest is making a promise to oneself -> default impact is 0
  WIL_COMMITMENT_ACCEPT_BOOST: 0,
  // Keeping the promise -> meaningful positive WIL
  WIL_COMMITMENT_COMPLETE_BOOST: 5,
  // Breaking the promise -> meaningful negative WIL accountability
  WIL_COMMITMENT_FAIL_PENALTY: -5,
  // Declining a quest -> completely neutral (saying 'no' != breaking a promise)
  WIL_COMMITMENT_DECLINE_IMPACT: 0,

  // Daily Baseline & Discipline
  WIL_CORE_TASK_BOOST: 2,
  WIL_UNFULFILLED_DAY_PENALTY: -6,

  // Attribute attribution weights per responsibility
  RESPONSIBILITY_ATTRIBUTE_WEIGHTS: {
    'workout': { STR: 1.2, WIL: 0.4 },
    'reading': { INT: 1.2, WIL: 0.3 },
    'dishes': { LIFE: 0.8, WIL: 0.2 },
    'laundry': { LIFE: 0.9, WIL: 0.2 },
    'hang_clothes': { LIFE: 0.6, WIL: 0.2 },
    'outreach': { WORK: 1.2, WIL: 0.4 }
  }
};
