import { CONFIG } from '../config/constants.js';

/**
 * Progression Engine
 * Pure mathematical functions for effort XP, leveling curves, and attribute development.
 */
export class ProgressionEngine {
  /**
   * Calculates the XP needed to advance from the given level to the next.
   * @param {number} level 
   * @returns {number}
   */
  static getXpRequiredForLevel(level) {
    return Math.round(CONFIG.BASE_XP_PER_LEVEL * Math.pow(level, CONFIG.LEVEL_SCALING_EXPONENT));
  }

  /**
   * Applies XP to character, processing level ups if thresholds are met.
   * Permanent progression is preserved.
   * @param {Object} character 
   * @param {number} addedXp 
   * @returns {Object} { character, leveledUp: boolean, levelsGained: number }
   */
  static addXp(character, addedXp) {
    let currentLevel = character.level;
    let currentXp = character.xp + addedXp;
    let levelsGained = 0;

    let xpNeeded = this.getXpRequiredForLevel(currentLevel);
    while (currentXp >= xpNeeded) {
      currentXp -= xpNeeded;
      currentLevel += 1;
      levelsGained += 1;
      xpNeeded = this.getXpRequiredForLevel(currentLevel);
    }

    return {
      character: {
        ...character,
        level: currentLevel,
        xp: currentXp
      },
      leveledUp: levelsGained > 0,
      levelsGained
    };
  }

  /**
   * Deducts XP from character, processing level-downs if it goes below 0.
   * Floors at Level 1 with 0 XP — can never go negative.
   */
  static removeXp(character, removedXp) {
    let currentLevel = character.level;
    let currentXp = character.xp - removedXp;

    while (currentXp < 0 && currentLevel > 1) {
      currentLevel -= 1;
      currentXp += this.getXpRequiredForLevel(currentLevel);
    }

    return {
      character: {
        ...character,
        level: currentLevel,
        xp: Math.max(0, currentXp)
      }
    };
  }

  /**
   * Applies attribute adjustments based on the completed responsibility or quest.
   * @param {Object} attributes Current attributes
   * @param {Object} weights Mapping of attribute keys to delta amounts
   * @returns {Object} Updated attributes
   */
  static applyAttributeDeltas(attributes, weights = {}) {
    const updated = { ...attributes };
    for (const [attr, delta] of Object.entries(weights)) {
      if (typeof updated[attr] === 'number') {
        updated[attr] = Math.max(1, Math.round((updated[attr] + delta) * 10) / 10);
      }
    }
    return updated;
  }
}
