import { getProfileCoreResponsibilities, RAM_CORE_RESPONSIBILITIES } from '../config/responsibilities.js';

/**
 * Format a Date object as a local calendar date string 'YYYY-MM-DD'
 * (timezone-safe, unaffected by UTC offset shifts).
 * @param {Date|string} [date=new Date()]
 * @returns {string}
 */
export function getLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-CA');
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a 'YYYY-MM-DD' string safely into a local noon Date object.
 * Avoids any timezone rollover issues that happen with UTC midnight.
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
}

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
      const anchorStr = responsibility.anchorDate || '2026-01-01';
      const anchorParts = anchorStr.split('-').map(Number);
      
      const targetMidnight = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const anchorMidnight = Date.UTC(anchorParts[0], anchorParts[1] - 1, anchorParts[2]);

      const diffTime = targetMidnight - anchorMidnight;
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
   * Returns all responsibilities that are currently due on the given date for a profile.
   * @param {Date} targetDate 
   * @param {string} profile 'ram' | 'sister'
   * @returns {Array}
   */
  static getDueResponsibilities(targetDate = new Date(), profile = 'ram') {
    const list = getProfileCoreResponsibilities(profile);
    return list.filter((item) => this.isDue(item, targetDate));
  }

  /**
   * Alias for getDueResponsibilities with an explicit Date object and profile.
   * @param {Date} date
   * @param {string} profile
   * @returns {Array}
   */
  static getDueResponsibilitiesForDate(date, profile = 'ram') {
    return this.getDueResponsibilities(date, profile);
  }
}

