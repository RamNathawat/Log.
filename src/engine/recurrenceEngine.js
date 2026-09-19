import { CORE_RESPONSIBILITIES_CONFIG } from '../config/responsibilities.js';

/**
 * Recurrence Engine
 * Determines whether a core responsibility is due on a given calendar date.
 * Does not impose any time slots or fixed daily schedule.
 */
export class RecurrenceEngine {
  /**
   * Returns whether a specific responsibility is due on targetDate.
   * @param {Object} responsibility 
   * @param {Date} targetDate 
   * @returns {boolean}
   */
  static isDue(responsibility, targetDate = new Date()) {
    if (!responsibility) return false;

    if (responsibility.frequency === 'daily') {
      return true;
    }

    if (responsibility.frequency === 'alternate-day' || responsibility.frequency === 'interval') {
      const anchor = new Date(responsibility.anchorDate || '2026-01-01');
      // Normalize to midnight UTC for date-only arithmetic
      const targetMidnight = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
      const anchorMidnight = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()));

      const diffTime = targetMidnight.getTime() - anchorMidnight.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const interval = responsibility.intervalDays || 2;

      return (Math.abs(diffDays) % interval) === 0;
    }

    return true;
  }

  static isDueOnDate(responsibility, targetDate = new Date()) {
    return this.isDue(responsibility, targetDate);
  }

  /**
   * Returns all responsibilities that are currently due on the given date.
   * @param {Date} targetDate 
   * @returns {Array}
   */
  static getDueResponsibilities(targetDate = new Date()) {
    return CORE_RESPONSIBILITIES_CONFIG.filter((item) => this.isDue(item, targetDate));
  }

  /**
   * Alias for getDueResponsibilities with an explicit Date object.
   * Used by store when recording stats for a past date.
   * @param {Date} date
   * @returns {Array}
   */
  static getDueResponsibilitiesForDate(date) {
    return this.getDueResponsibilities(date);
  }
}
