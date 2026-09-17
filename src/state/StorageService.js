/**
 * StorageService
 * Provides a persistent storage abstraction layer over localStorage.
 * Enables zero-effort future migration to IndexedDB or offline-first PWA sync.
 */
const STORAGE_KEY = 'system_os_state_v2';

export class StorageService {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[StorageService] Error reading state from storage:', err);
      return null;
    }
  }

  static save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[StorageService] Error saving state to storage:', err);
    }
  }

  static clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[StorageService] Error clearing storage:', err);
    }
  }
}
