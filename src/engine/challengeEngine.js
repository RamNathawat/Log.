/**
 * Challenge Engine
 * Generates quests deterministically based on date and period (AM/PM).
 * Guarantees two quests per day.
 */
export class ChallengeEngine {
  static TEMPLATES = [
    { id: 'str_pushups', type: 'PHYSICAL', attribute: 'STR', getBaseAmount: (b) => Math.max(10, Math.round((b.pushups || 20) * 0.9)), unit: 'PUSH-UPS', rewardType: 'RECREATION', rewardLabel: 'RECREATION UNLOCKED', rewardXP: 10, description: 'Execute strict form push-ups in a single continuous set.' },
    { id: 'str_pullups', type: 'PHYSICAL', attribute: 'STR', getBaseAmount: (b) => Math.max(3, Math.round(b.pullups || 5)), unit: 'PULL-UPS', rewardType: 'XP', rewardLabel: '+15 EFFORT XP', rewardXP: 15, description: 'Dead-hang to full chin clearance.' },
    { id: 'str_squats', type: 'PHYSICAL', attribute: 'STR', getBaseAmount: (b) => Math.max(15, Math.round((b.squats || 25) * 1.0)), unit: 'BODYWEIGHT SQUATS', rewardType: 'XP', rewardLabel: '+12 EFFORT XP', rewardXP: 12, description: 'Full depth below parallel.' },
    { id: 'wil_plank', type: 'DISCIPLINE', attribute: 'WIL', getBaseAmount: (b) => Math.max(45, Math.round(b.plankSeconds || 60)), unit: 'SECONDS PLANK', rewardType: 'RECREATION', rewardLabel: 'RECREATION UNLOCKED', rewardXP: 10, description: 'Rigid core stability without sagging.' },
    { id: 'int_reading', type: 'INTELLECT', attribute: 'INT', getBaseAmount: (b) => Math.max(5, Math.round((b.readingPages || 10) * 1.0)), unit: 'ADDITIONAL PAGES', rewardType: 'XP', rewardLabel: '+10 EFFORT XP', rewardXP: 10, description: 'Deep, uninterrupted focus reading with notes.' },
    { id: 'wil_cold', type: 'DISCIPLINE', attribute: 'WIL', getBaseAmount: () => 120, unit: 'SECONDS', rewardType: 'RECREATION', rewardLabel: 'RECREATION UNLOCKED', rewardXP: 15, description: 'Cold water exposure. Build resilience.' },
    { id: 'work_sprint', type: 'CAREER', attribute: 'WORK', getBaseAmount: () => 30, unit: 'MINUTES', rewardType: 'XP', rewardLabel: '+20 EFFORT XP', rewardXP: 20, description: 'Deep work sprint. Phone in another room. Zero distractions.' },
    { id: 'life_clean', type: 'RESPONSIBILITY', attribute: 'LIFE', getBaseAmount: () => 10, unit: 'MINUTES', rewardType: 'XP', rewardLabel: '+10 EFFORT XP', rewardXP: 10, description: 'Speed clean and organize the physical workspace.' },
    { id: 'rec_stretch', type: 'RECOVERY', attribute: 'RECOVERY', getBaseAmount: () => 15, unit: 'MINUTES', rewardType: 'XP', rewardLabel: '+10 EFFORT XP', rewardXP: 10, description: 'Deep mobility and hamstring stretching.' }
  ];

  /**
   * Deterministic simple pseudo-random generator seeded with a date string YYYY-MM-DD
   */
  static getSeedFromDate(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  static buildQuestFromTemplate(template, baseline, idSuffix) {
    const amount = template.getBaseAmount(baseline);
    return {
      directiveId: `DIRECTIVE_${idSuffix}`,
      title: `${amount} ${template.unit}`,
      rawAmount: amount,
      unit: template.unit,
      attribute: template.attribute,
      rewardType: template.rewardType,
      rewardLabel: template.rewardLabel,
      rewardXP: template.rewardXP,
      description: template.description
    };
  }

  /**
   * Generates two random but deterministic Date objects for the two daily challenges
   * between 6:00 AM and midnight.
   */
  static getDailyChallengeTimes(dateStr) {
    const seed = this.getSeedFromDate(dateStr);
    
    // Simple deterministic pseudo-random
    const random1 = ((seed * 9301 + 49297) % 233280) / 233280;
    const random2 = ((seed * 19301 + 849297) % 233280) / 233280;

    // Window 1: 06:00 to 14:59 (9 hours = 540 mins)
    // Window 2: 15:00 to 23:59 (9 hours = 540 mins)
    const mins1 = Math.floor(random1 * 540);
    const mins2 = Math.floor(random2 * 540);

    const parts = dateStr.split('-');
    const time1 = new Date(parts[0], parts[1] - 1, parts[2], 6, mins1, 0, 0);
    const time2 = new Date(parts[0], parts[1] - 1, parts[2], 15, mins2, 0, 0);

    return [time1, time2];
  }

  /**
   * Generates a side quest based on the date and AM/PM period.
   * periodStr is usually "YYYY-MM-DD-AM" or "YYYY-MM-DD-PM"
   */
  static generatePeriodQuest(periodStr, baseline) {
    if (!periodStr || periodStr.includes('-PENDING')) return null;

    const seed = this.getSeedFromDate(periodStr);
    const selectedIndex = seed % this.TEMPLATES.length;
    const template = this.TEMPLATES[selectedIndex];
    const quest = this.buildQuestFromTemplate(template, baseline, `${periodStr}_${selectedIndex + 1}`);
    quest.period = periodStr;
    return quest;
  }
}
