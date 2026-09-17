/**
 * Master List of Core Daily Habits / Rituals
 * Defines frequency, recurrence rules, and attribute XP weights.
 */
export const CORE_RESPONSIBILITIES_CONFIG = [
  {
    id: 'dishes',
    name: 'Dishes & Kitchen',
    frequency: 'daily',
    description: 'Clean sink, wash dishes, wipe countertops.',
    xp: 15,
    category: 'Home & Living',
    attributes: { LIFE: 0.8, WIL: 0.2 }
  },
  {
    id: 'laundry_hang',
    name: 'Laundry Cycle & Hang Clothes',
    frequency: 'alternate-day',
    anchorDate: '2026-01-01',
    intervalDays: 2,
    description: 'Washing machine cycle, hang and store clean clothes.',
    xp: 18,
    category: 'Home & Living',
    attributes: { LIFE: 1.0, WIL: 0.3 }
  },
  {
    id: 'jhaadu_mop',
    name: 'Jhaadu & Mopping',
    frequency: 'alternate-day',
    anchorDate: '2026-01-02',
    intervalDays: 2,
    description: 'Sweep floors thoroughly and wet mop living spaces.',
    xp: 18,
    category: 'Home & Living',
    attributes: { LIFE: 1.0, WIL: 0.3 }
  },
  {
    id: 'reading',
    name: 'Focused Reading',
    frequency: 'daily',
    description: 'Deep reading session (books, research, essays).',
    xp: 15,
    category: 'Learning & Mind',
    attributes: { INT: 1.2, WIL: 0.3 }
  },
  {
    id: 'workout',
    name: 'Movement & Training',
    frequency: 'daily',
    description: 'Physical workout or calisthenics session.',
    xp: 18,
    category: 'Fitness & Body',
    attributes: { STR: 1.2, WIL: 0.4 }
  },
  {
    id: 'outreach',
    name: 'Career & Outreach',
    frequency: 'daily',
    description: 'High-leverage outreach, applications, or client relations.',
    xp: 16,
    category: 'Deep Work',
    attributes: { WORK: 1.2, WIL: 0.4 }
  }
];

/**
 * Task Library — keyword-matched archetypes for auto-weighting custom tasks.
 * Evaluated in order: specific categories and multi-word phrases take precedence.
 * Zero API cost, completely offline, instantaneous.
 */
const TASK_LIBRARY = [
  {
    category: 'Cooking & Nutrition',
    tag: 'Nutrition',
    color: '#D97706',
    bg: '#FEF3C7',
    keywords: [
      'cooked food', 'cook food', 'cooking', 'cooked', 'cook',
      'meal prep', 'prepare meal', 'make meal', 'make dinner', 'make lunch', 'make breakfast',
      'made food', 'made dinner', 'made lunch', 'made breakfast',
      'bake', 'baking', 'baked', 'recipe', 'prepare food', 'prepped food',
      'breakfast', 'lunch', 'dinner', 'supper', 'snack',
      'smoothie', 'protein shake', 'shake', 'eat healthy', 'healthy eating',
      'macros', 'nutrition', 'calories', 'hydration', 'grill', 'roast'
    ],
    xp: 14,
    attributes: { LIFE: 0.8, STR: 0.4, WIL: 0.3 }
  },
  {
    category: 'Fitness & Body',
    tag: 'Fitness',
    color: '#059669',
    bg: '#D1FAE5',
    keywords: [
      'workout', 'gym', 'lift', 'lifting', 'weights', 'run', 'running', 'jog', 'jogging',
      'pushups', 'push-ups', 'pullups', 'pull-ups', 'squat', 'squats', 'plank',
      'swim', 'swimming', 'cycle', 'cycling', 'bike', 'biking',
      'stretch', 'stretching', 'mobility', 'yoga', 'pilates', 'hiit', 'cardio',
      'calisthenics', 'exercise', 'train', 'training', 'walk', 'walking', 'steps', 'hike', 'hiking'
    ],
    xp: 18,
    attributes: { STR: 1.2, WIL: 0.5 }
  },
  {
    category: 'Deep Work & Projects',
    tag: 'Work',
    color: '#2563EB',
    bg: '#DBEAFE',
    keywords: [
      'code', 'coding', 'program', 'programming', 'software', 'debug', 'debugging',
      'project', 'repo', 'deploy', 'deployment', 'feature', 'commit', 'pull request',
      'work', 'client', 'meeting', 'standup', 'deadline', 'proposal', 'pitch',
      'design', 'figma', 'wireframe', 'prototype', 'ui', 'ux',
      'resume', 'cv', 'interview', 'job application', 'apply', 'outreach',
      'linkedin', 'email', 'emails', 'inbox zero', 'report', 'presentation', 'slides'
    ],
    xp: 18,
    attributes: { WORK: 1.2, WIL: 0.4 }
  },
  {
    category: 'Learning & Mind',
    tag: 'Learning',
    color: '#7C3AED',
    bg: '#EDE9FE',
    keywords: [
      'read', 'reading', 'book', 'chapters', 'pages', 'study', 'studying',
      'learn', 'learning', 'course', 'tutorial', 'lecture', 'class', 'lesson',
      'research', 'notes', 'revision', 'flashcards', 'exam', 'paper', 'article',
      'audiobook', 'podcast', 'language', 'duolingo', 'practice instrument', 'theory'
    ],
    xp: 16,
    attributes: { INT: 1.2, WIL: 0.4 }
  },
  {
    category: 'Home & Living',
    tag: 'Home',
    color: '#4B5563',
    bg: '#F3F4F6',
    keywords: [
      'clean', 'cleaning', 'cleaned', 'wash', 'washing', 'washed',
      'dishes', 'dishwasher', 'sink', 'counter', 'countertop',
      'laundry', 'iron', 'ironing', 'fold', 'folding', 'hang clothes', 'wardrobe',
      'mop', 'mopping', 'sweep', 'sweeping', 'vacuum', 'vacuuming', 'dust', 'dusting',
      'jhaadu', 'jhadu', 'pocha', 'pochha', 'mop floor', 'sweep floor',
      'tidy', 'tidying', 'organize', 'organizing', 'declutter', 'decluttering',
      'trash', 'garbage', 'bin', 'recycling', 'make bed', 'sheets', 'bedding',
      'plants', 'water plants', 'fix', 'repair', 'chores'
    ],
    xp: 12,
    attributes: { LIFE: 0.9, WIL: 0.3 }
  },
  {
    category: 'Errands & Supplies',
    tag: 'Errands',
    color: '#0D9488',
    bg: '#CCFBF1',
    keywords: [
      'grocery shopping', 'groceries', 'supermarket', 'market', 'buy groceries',
      'buy milk', 'get milk', 'pharmacy', 'medicine', 'prescription',
      'pick up', 'pickup', 'deliver', 'delivery', 'drop off',
      'post office', 'parcel', 'package', 'mail', 'hardware store',
      'dry cleaning', 'errand', 'errands', 'bank visit', 'car wash', 'gas station'
    ],
    xp: 10,
    attributes: { LIFE: 0.8, WIL: 0.2 }
  },
  {
    category: 'Wellness & Rest',
    tag: 'Wellness',
    color: '#0284C7',
    bg: '#E0F2FE',
    keywords: [
      'meditate', 'meditation', 'mindfulness', 'breathe', 'breathwork',
      'sleep', 'rest', 'nap', 'bed on time', 'early sleep',
      'relax', 'journal', 'journaling', 'diary', 'reflect', 'reflection',
      'hydrate', 'drink water', 'water', 'vitamins', 'supplement', 'supplements',
      'sauna', 'cold shower', 'cold plunge', 'ice bath', 'massage', 'therapy', 'doctor', 'dentist'
    ],
    xp: 12,
    attributes: { RECOVERY: 1.2, WIL: 0.3 }
  },
  {
    category: 'Social & Connection',
    tag: 'Social',
    color: '#E11D48',
    bg: '#FFE4E6',
    keywords: [
      'call mom', 'call dad', 'call parents', 'call family', 'family', 'parents',
      'friend', 'friends', 'meet friend', 'catch up', 'hangout',
      'call', 'video call', 'social', 'birthday', 'gift', 'visit',
      'dinner with', 'lunch with', 'coffee with'
    ],
    xp: 10,
    attributes: { LIFE: 1.0, WIL: 0.2 }
  },
  {
    category: 'Finance & Admin',
    tag: 'Finance',
    color: '#16A34A',
    bg: '#DCFCE7',
    keywords: [
      'budget', 'budgeting', 'finance', 'finances', 'invest', 'investing',
      'save', 'savings', 'bills', 'pay bill', 'pay rent', 'tax', 'taxes',
      'expenses', 'expense tracking', 'portfolio', 'crypto', 'bank transfer', 'invoice'
    ],
    xp: 14,
    attributes: { WORK: 0.6, LIFE: 0.6, WIL: 0.4 }
  },
  {
    category: 'Creative & Craft',
    tag: 'Creative',
    color: '#9333EA',
    bg: '#F3E8FF',
    keywords: [
      'draw', 'drawing', 'sketch', 'paint', 'painting', 'art',
      'music', 'play guitar', 'play piano', 'compose', 'beat', 'produce',
      'write story', 'write poem', 'write essay', 'photo', 'photography', 'edit photos', 'video edit'
    ],
    xp: 14,
    attributes: { INT: 0.8, WORK: 0.6, WIL: 0.3 }
  },
  {
    category: 'Smoking & Substances',
    tag: 'Substances',
    color: '#78716C',
    bg: '#F5F5F4',
    // Multi-word phrases are checked in Phase 1 (more specific) — "score" alone is intentionally
    // excluded to avoid false matches on "score a goal", "score on exam", etc.
    keywords: [
      'buy cigarettes', 'buy smokes', 'buy weed', 'buy cigs',
      'score weed', 'score maal', 'scored weed', 'bought cigs', 
      'rolling paper', 'rolling papers',
      'cigarette pack', 'cigarette packet',
      'refill vape', 'smoke break',
      'tobacco pouch',
      'cigarette', 'cigarettes', 'cigs', 'cig',
      'smoke', 'smoking',
      'tobacco', 'weed', 'maal', 'ganja', 'pot', 'joint',
      'lighter', 'vape', 'vaping', 'nicotine',
      'rajnigandha', 'rj', 'zarda', 'gutkha', 'khaini', 'tambaku', 'tambaaku'
    ],
    xp: 5,
    attributes: { WIL: -0.3, RECOVERY: -0.2 }
  }
];

/**
 * Helper to escape regex special characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Infers XP, attribute weights, and category info for any custom task.
 * Smart matching handles multi-word phrases first, followed by word-boundary matches.
 * Offline-first, fast, and completely free.
 * 
 * @param {string} taskName
 * @returns {{ xp: number, attributes: Object, category: string, tag: string, color: string, bg: string }}
 */
export function inferTaskWeight(taskName) {
  const lower = taskName.trim().toLowerCase();

  // Phase 1: Check multi-word phrase keywords first (more specific)
  for (const archetype of TASK_LIBRARY) {
    for (const kw of archetype.keywords) {
      if (kw.includes(' ') && lower.includes(kw)) {
        return {
          xp: archetype.xp,
          attributes: { ...archetype.attributes },
          category: archetype.category,
          tag: archetype.tag,
          color: archetype.color,
          bg: archetype.bg
        };
      }
    }
  }

  // Phase 2: Check word-boundary matching for single word keywords
  for (const archetype of TASK_LIBRARY) {
    for (const kw of archetype.keywords) {
      if (!kw.includes(' ')) {
        const regex = new RegExp(`(^|\\W)${escapeRegex(kw)}(\\W|$)`, 'i');
        if (regex.test(lower)) {
          return {
            xp: archetype.xp,
            attributes: { ...archetype.attributes },
            category: archetype.category,
            tag: archetype.tag,
            color: archetype.color,
            bg: archetype.bg
          };
        }
      }
    }
  }

  // Phase 3: Substring fallback
  for (const archetype of TASK_LIBRARY) {
    for (const kw of archetype.keywords) {
      if (lower.includes(kw)) {
        return {
          xp: archetype.xp,
          attributes: { ...archetype.attributes },
          category: archetype.category,
          tag: archetype.tag,
          color: archetype.color,
          bg: archetype.bg
        };
      }
    }
  }

  // Default fallback
  return {
    xp: 12,
    attributes: { LIFE: 0.6, WIL: 0.3 },
    category: 'General Focus',
    tag: 'Focus',
    color: '#6B7280',
    bg: '#F3F4F6'
  };
}

