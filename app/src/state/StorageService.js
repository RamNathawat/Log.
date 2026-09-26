/**
 * StorageService
 * Profile-namespaced persistent storage over localStorage.
 * Each profile ('ram' | 'sister') gets its own key, ensuring complete data
 * isolation when both profiles are used on the same device.
 *
 * Key schema:
 *   system_os_state_ram    → Ram's full state
 *   system_os_state_sister → Sister's full state
 *   system_os_active_profile → 'ram' | 'sister' (lightweight active pointer)
 *
 * Migration: The legacy key 'system_os_state_v2' is auto-migrated to
 * 'system_os_state_ram' on first access if present.
 */
const LEGACY_KEY = 'system_os_state_v2';
const ACTIVE_PROFILE_KEY = 'system_os_active_profile';

function profileKey(profile) {
  return `system_os_state_${profile || 'ram'}`;
}

export class StorageService {
  /**
   * Load state for a specific profile. Falls back to legacy key migration.
   * @param {string} [profile='ram']
   */
  static load(profile = 'ram') {
    try {
      const key = profileKey(profile);
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Migration: check for legacy single-key state, migrate to ram namespace
      if (profile === 'ram') {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          console.info('[StorageService] Migrating legacy state to ram namespace.');
          const parsed = JSON.parse(legacy);
          // Ensure profile is set to ram during migration
          if (parsed && !parsed.profile) parsed.profile = 'ram';
          localStorage.setItem(key, JSON.stringify(parsed));
          localStorage.removeItem(LEGACY_KEY);
          return parsed;
        }
      }

      return null;
    } catch (err) {
      console.warn('[StorageService] Error reading state from storage:', err);
      return null;
    }
  }

  /**
   * Save state under the profile-specific key.
   * @param {object} state - Full app state
   * @param {string} [profile] - Override; defaults to state.profile
   */
  static save(state, profile) {
    try {
      const p = profile || state?.profile || 'ram';
      localStorage.setItem(profileKey(p), JSON.stringify(state));
    } catch (err) {
      console.warn('[StorageService] Error saving state to storage:', err);
    }
  }

  /**
   * Get the currently active profile from the lightweight pointer key.
   * @returns {'ram'|'sister'}
   */
  static getActiveProfile() {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'ram';
  }

  /**
   * Persist which profile is currently active.
   * @param {'ram'|'sister'} profile
   */
  static setActiveProfile(profile) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile);
  }

  static clear(profile) {
    try {
      if (profile) {
        localStorage.removeItem(profileKey(profile));
      } else {
        localStorage.removeItem(profileKey('ram'));
        localStorage.removeItem(profileKey('sister'));
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    } catch (err) {
      console.warn('[StorageService] Error clearing storage:', err);
    }
  }
}
