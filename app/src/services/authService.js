import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { dbSync } from '../state/DatabaseSyncService.js';

const AUTH_STORAGE_KEY = 'system_os_auth_user';

class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = this._loadCachedUser();
    this.listeners = new Set();
    // Promise that resolves once we've checked for an existing/redirect session
    this._readyResolve = null;
    this._readyPromise = new Promise((resolve) => { this._readyResolve = resolve; });
    this.initAuth();
  }

  /** Resolves when the initial auth state is known (safe to render) */
  waitForReady() {
    return this._readyPromise;
  }

  _loadCachedUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  _saveCachedUser(user) {
    try {
      if (user) {
        const u = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Operator',
          photoURL: user.photoURL || null
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
        this.currentUser = u;
        return u;
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        this.currentUser = null;
        return null;
      }
    } catch (e) {
      console.warn('[AuthService] Could not persist auth cache:', e);
      return null;
    }
  }

  async initAuth() {
    if (!dbSync.app) {
      // No Firebase app — resolve ready immediately with cached user
      this._readyResolve(this.currentUser);
      return;
    }
    try {
      this.auth = getAuth(dbSync.app);

      // Set local persistence so the session survives page reloads/redirects
      await setPersistence(this.auth, browserLocalPersistence).catch(() => {});

      // Check for a pending Google redirect result FIRST, before any render
      let redirectUser = null;
      try {
        const result = await getRedirectResult(this.auth);
        if (result && result.user) {
          redirectUser = this._normalizeFirebaseUser(result.user);
          const saved = this._saveCachedUser(redirectUser);
          this._notifyListeners(saved);
        }
      } catch (redirectErr) {
        console.warn('[AuthService] getRedirectResult error:', redirectErr.code, redirectErr.message);
      }

      // Subscribe to ongoing Firebase auth state changes
      onAuthStateChanged(this.auth, (firebaseUser) => {
        if (firebaseUser) {
          const u = this._normalizeFirebaseUser(firebaseUser);
          const saved = this._saveCachedUser(u);
          this._notifyListeners(saved);
        }
        // Don't clear on null — localStorage cache is the ground truth
      });

      // Signal ready — auth state is now known
      this._readyResolve(this.currentUser);
    } catch (e) {
      console.warn('[AuthService] Firebase Auth init error:', e);
      this._readyResolve(this.currentUser);
    }
  }

  _normalizeFirebaseUser(firebaseUser) {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operator',
      photoURL: firebaseUser.photoURL || null
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Fire immediately with current value
    try { listener(this.currentUser); } catch (e) {}
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(user) {
    for (const listener of this.listeners) {
      try { listener(user); } catch (e) {}
    }
  }

  getCurrentUser() { return this.currentUser; }
  isAuthenticated() { return !!this.currentUser && !!this.currentUser.uid; }

  /**
   * Google Sign-In.
   * Tries popup first (instant, no page reload). Falls back to redirect
   * if the popup is blocked or throws a recoverable error.
   */
  async signInWithGoogle() {
    if (!this.auth) throw new Error('Firebase Auth is not initialized. Check your Firebase config.');

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    // --- Try popup first ---
    try {
      const result = await signInWithPopup(this.auth, provider);
      const u = this._normalizeFirebaseUser(result.user);
      const saved = this._saveCachedUser(u);
      this._notifyListeners(saved);
      return saved;
    } catch (popupErr) {
      // If popup was blocked or closed by user, try redirect
      const popupBlockedCodes = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
      if (popupBlockedCodes.includes(popupErr.code)) {
        console.info('[AuthService] Popup blocked/closed — falling back to redirect.');
        await signInWithRedirect(this.auth, provider);
        // Page navigates away — never returns here
        return;
      }
      // Translate common error codes
      if (popupErr.code === 'auth/network-request-failed') throw new Error('Network error. Check your connection.');
      if (popupErr.code === 'auth/user-disabled')          throw new Error('This account has been disabled.');
      throw new Error(popupErr.message || 'Google sign-in failed. Please try again.');
    }
  }

  /** Email / Password Sign-Up */
  async signUp(email, password, displayName = '') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim() || cleanEmail.split('@')[0] || 'Operator';
    if (!cleanEmail || !password) throw new Error('Please provide both email and password.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!this.auth) throw new Error('Firebase Auth is not initialized.');

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, cleanEmail, password);
      try { await updateProfile(cred.user, { displayName: cleanName }); } catch (_) {}
      const u = { uid: cred.user.uid, email: cred.user.email, displayName: cleanName, photoURL: null };
      const saved = this._saveCachedUser(u);
      this._notifyListeners(saved);
      return saved;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') throw new Error('An account already exists with this email. Try signing in.');
      if (err.code === 'auth/invalid-email')         throw new Error('Please enter a valid email address.');
      if (err.code === 'auth/weak-password')         throw new Error('Password must be at least 6 characters.');
      throw new Error(err.message || 'Failed to create account.');
    }
  }

  /** Email / Password Sign-In */
  async signIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) throw new Error('Please enter both email and password.');
    if (!this.auth) throw new Error('Firebase Auth is not initialized.');

    try {
      const cred = await signInWithEmailAndPassword(this.auth, cleanEmail, password);
      const u = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cleanEmail.split('@')[0] || 'Operator',
        photoURL: cred.user.photoURL || null
      };
      const saved = this._saveCachedUser(u);
      this._notifyListeners(saved);
      return saved;
    } catch (err) {
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code)) {
        throw new Error('Invalid email or password.');
      }
      if (err.code === 'auth/invalid-email') throw new Error('Please enter a valid email address.');
      if (err.code === 'auth/user-disabled') throw new Error('This account has been disabled.');
      throw new Error(err.message || 'Could not sign in. Please try again.');
    }
  }

  async signOut() {
    if (this.auth) {
      try { await firebaseSignOut(this.auth); } catch (_) {}
    }
    this._saveCachedUser(null);
    this._notifyListeners(null);
  }
}

export const authService = new AuthService();
