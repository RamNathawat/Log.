import { CONFIG } from '../config/constants.js';

/**
 * Initial Application State & Seed Placeholders
 * Starting character level is Level 1.
 * Fitness measurements are default seed placeholders to be calibrated by the user.
 */
export function getInitialState(profile = 'ram') {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isSister = profile === 'sister';

  return {
    profile: isSister ? 'sister' : 'ram',
    syncKey: isSister ? 'OS1837' : 'OS2290',
    siblingSyncKey: isSister ? 'OS2290' : 'OS1837',
    date: todayStr,
    character: {
      name: isSister ? 'Sister' : 'Ram',
      level: CONFIG.STARTING_LEVEL, // Level 1
      xp: CONFIG.STARTING_XP,       // 0 XP
      attributes: { ...CONFIG.STARTING_ATTRIBUTES }
    },
    // Baseline calibration data (Default seed placeholders, not permanent user facts)
    baseline: {
      isCalibrated: false,
      pushups: 20,
      pullups: 5,
      squats: 25,
      plankSeconds: 60,
      readingPages: 10
    },
    // Track completed responsibilities for today: { [id]: { completed: boolean, completedAt: string | null } }
    dailyResponsibilities: {},
    // Justified task exemptions (0 penalty excused tasks): { [id]: { reason, category, exemptedAt, status } }
    taskExemptions: {},
    // Active task trade proposals / barters: Array<{ id, fromUser, toUser, taskId, taskName, taskType, note, swapTaskId, swapTaskName, status, createdAt }>
    trades: [],
    // User-added custom tasks persisted across days, reset completion daily
    customTasks: [],
    // Today's Side Quest state
    // status: 'AVAILABLE' | 'ACCEPTED' | 'COMPLETED' | 'FAILED' | 'DECLINED'
    sideQuestState: {
      date: todayStr,
      status: 'AVAILABLE',
      acceptedAt: null,
      resolvedAt: null
    },
    // Binary Recreation status
    recreation: {
      isUnlocked: false,
      source: null, // 'ALL_CORE_COMPLETE' | 'SIDE_QUEST_QUALIFIED'
      unlockedAt: null
    },
    // 4 Long-Term Objectives / Pillars
    pillars: [
      {
        id: 'polymath',
        title: 'Become a Polymath before Age 27',
        description: 'Comprehensive mastery of systems, intellect, deep reading, and cognitive expansion.',
        relatedAttributes: ['INT', 'WIL']
      },
      {
        id: 'physique',
        title: 'Build a Lean, Model-Like Physique',
        description: 'Aesthetic body composition, progressive physical strength, and movement mastery.',
        relatedAttributes: ['STR', 'RECOVERY']
      },
      {
        id: 'career',
        title: 'Substantially Master Career',
        description: 'High-leverage engineering skills, technical dominance, and deep work output.',
        relatedAttributes: ['WORK', 'INT']
      },
      {
        id: 'wealth',
        title: 'Achieve Financial Sovereignty',
        description: 'Compounding wealth, strategic capital, and autonomy over time and location.',
        relatedAttributes: ['WORK', 'LIFE', 'WIL']
      }
    ],
    // Stats — streak tracking and per-day completion logs
    stats: {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysTracked: 0,
      // dailyLogs: { [dateStr]: { totalDue: number, completed: number, questStatus: string } }
      dailyLogs: {}
    },
    // Activity and discipline telemetry history
    history: [
      {
        id: 'init_log',
        timestamp: new Date().toISOString(),
        type: 'SYSTEM_BOOT',
        text: 'Log OS initialized at Level 1. Baseline calibration mode active.'
      }
    ]
  };
}
