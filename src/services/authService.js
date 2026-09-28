import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { dbSync } from '../state/DatabaseSyncService.js';

const AUTH_STORAGE_KEY = 'system_os_auth_user';

class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = this._loadCachedUser();
    this.listeners = new Set();
    this._pendingRedirectResolve = null;
    this.initAuth();
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
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        this.currentUser = null;
      }
    } catch (e) {
      console.warn('[AuthService] Could not persist auth cache:', e);
    }
  }

  initAuth() {
    if (!dbSync.app) return;
    try {
      this.auth = getAuth(dbSync.app);

      // Listen for Firebase auth state changes (covers redirect returns too)
      onAuthStateChanged(this.auth, (firebaseUser) => {
        if (firebaseUser) {
          const u = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operator',
            photoURL: firebaseUser.photoURL || null
          };
          this._saveCachedUser(u);
          this._notifyListeners(u);
        }
        // Don't clear on null — we keep the localStorage cache so the
        // Login-First gate uses the persisted session across page reloads.
      });

      // Handle Google redirect result that fires after the page reloads
      // following signInWithRedirect().
      getRedirectResult(this.auth)
        .then((result) => {
          if (result && result.user) {
            const u = {
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Operator',
              photoURL: result.user.photoURL || null
            };
            this._saveCachedUser(u);
            this._notifyListeners(u);
            // Resolve the pending promise that AuthScreen is awaiting
            if (this._pendingRedirectResolve) {
              this._pendingRedirectResolve(u);
              this._pendingRedirectResolve = null;
            }
          }
        })
        .catch((err) => {
          console.warn('[AuthService] getRedirectResult error:', err.code, err.message);
          if (this._pendingRedirectResolve) {
            this._pendingRedirectResolve(null);
            this._pendingRedirectResolve = null;
          }
        });

    } catch (e) {
      console.warn('[AuthService] Firebase Auth init error:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(user) {
    for (const listener of this.listeners) {
      try { listener(user); } catch (e) {}
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && !!this.currentUser.uid;
  }

  /**
   * Google Sign-In using redirect (avoids popup state issues).
   * Returns a Promise that resolves with the user after the page
   * comes back from the Google consent screen.
   */
  async signInWithGoogle() {
    if (!this.auth) {
      throw new Error('Firebase Auth is not initialized. Check your firebaseConfig.');
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    // Return a Promise that will be resolved when getRedirectResult
    // fires after the page reloads post-redirect.
    return new Promise((resolve, reject) => {
      this._pendingRedirectResolve = resolve;
      signInWithRedirect(this.auth, provider).catch((err) => {
        this._pendingRedirectResolve = null;
        reject(err);
      });
    });
  }

  /**
   * Email / Password Sign-Up.
   */
  async signUp(email, password, displayName = 'Operator') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim() || cleanEmail.split('@')[0] || 'Operator';

    if (!cleanEmail || !password) throw new Error('Please provide both email and password.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    if (!this.auth) throw new Error('Firebase Auth is not initialized.');

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, cleanEmail, password);
      try { await updateProfile(cred.user, { displayName: cleanName }); } catch (_) {}
      const u = { uid: cred.user.uid, email: cred.user.email, displayName: cleanName, photoURL: null };
      this._saveCachedUser(u);
      this._notifyListeners(u);
      return u;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') throw new Error('An account already exists with this email. Try signing in.');
      if (err.code === 'auth/invalid-email')         throw new Error('Please enter a valid email address.');
      if (err.code === 'auth/weak-password')         throw new Error('Password must be at least 6 characters.');
      throw new Error(err.message || 'Failed to create account.');
    }
  }

  /**
   * Email / Password Sign-In.
   */
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
      this._saveCachedUser(u);
      this._notifyListeners(u);
      return u;
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
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
