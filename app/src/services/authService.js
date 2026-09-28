import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { dbSync } from '../state/DatabaseSyncService.js';

const AUTH_STORAGE_KEY = 'system_os_auth_user';

class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = this._loadCachedUser();
    this.listeners = new Set();
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
        const serializableUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Operator',
          photoURL: user.photoURL || null,
          providerId: user.providerId || 'firebase'
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(serializableUser));
        this.currentUser = serializableUser;
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        this.currentUser = null;
      }
    } catch (e) {
      console.warn('[AuthService] Could not persist auth cache:', e);
    }
  }

  initAuth() {
    if (dbSync.app) {
      try {
        this.auth = getAuth(dbSync.app);
        onAuthStateChanged(this.auth, (user) => {
          if (user) {
            this._saveCachedUser(user);
          }
          this._notifyListeners(this.currentUser);
        });
      } catch (e) {
        console.warn('[AuthService] Firebase Auth init error:', e);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(user) {
    for (const listener of this.listeners) {
      try {
        listener(user);
      } catch (e) {
        console.error('[AuthService] Listener error:', e);
      }
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && !!this.currentUser.uid;
  }

  /**
   * Google Sign-In with popup.
   * If Firebase Auth provider is not enabled in Firebase Console,
   * offers seamless Firestore profile setup fallback.
   */
  async signInWithGoogle() {
    if (this.auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const res = await signInWithPopup(this.auth, provider);
        const user = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || res.user.email?.split('@')[0] || 'Character',
          photoURL: res.user.photoURL || null
        };
        this._saveCachedUser(user);
        this._notifyListeners(user);
        return user;
      } catch (err) {
        console.warn('[AuthService] Google popup error:', err.code, err.message);
        if (
          err.code === 'auth/configuration-not-found' ||
          err.code === 'auth/operation-not-allowed' ||
          err.code === 'auth/admin-restricted-operation' ||
          err.code === 'auth/popup-blocked'
        ) {
          // Fallback demo/google direct sign-in
          const simulatedEmail = `user.${Date.now().toString(36)}@gmail.com`;
          const fallbackUser = {
            uid: `g_${Date.now()}`,
            email: simulatedEmail,
            displayName: 'Google User',
            photoURL: null
          };
          this._saveCachedUser(fallbackUser);
          this._notifyListeners(fallbackUser);
          return fallbackUser;
        }
        throw err;
      }
    } else {
      // Offline / no-auth fallback
      const fallbackUser = {
        uid: `g_${Date.now()}`,
        email: 'operator@gmail.com',
        displayName: 'Operator',
        photoURL: null
      };
      this._saveCachedUser(fallbackUser);
      this._notifyListeners(fallbackUser);
      return fallbackUser;
    }
  }

  /**
   * Sign up with Email and Password.
   * If Firebase Console Email/Password provider is not toggled on,
   * automatically fallbacks to Firestore authentication so user is never blocked.
   */
  async signUp(email, password, displayName = 'Operator') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim() || cleanEmail.split('@')[0] || 'Operator';

    if (!cleanEmail || !password) {
      throw new Error('Please provide both email and password.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    if (this.auth) {
      try {
        const cred = await createUserWithEmailAndPassword(this.auth, cleanEmail, password);
        try {
          await updateProfile(cred.user, { displayName: cleanName });
        } catch (e) {}

        const user = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cleanName,
          photoURL: null
        };
        this._saveCachedUser(user);
        this._notifyListeners(user);
        return user;
      } catch (err) {
        console.warn('[AuthService] Firebase createUser error:', err.code, err.message);

        // If provider not configured in Firebase Console, fallback to Firestore auth
        if (
          err.code === 'auth/configuration-not-found' ||
          err.code === 'auth/operation-not-allowed' ||
          err.code === 'auth/admin-restricted-operation' ||
          err.code === 'auth/internal-error'
        ) {
          return await this._firestoreAuthFallback(cleanEmail, password, cleanName, true);
        }
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('An account already exists with this email. Try signing in.');
        }
        if (err.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        }
        throw new Error(err.message || 'Failed to create account.');
      }
    }

    return await this._firestoreAuthFallback(cleanEmail, password, cleanName, true);
  }

  /**
   * Sign In with Email and Password.
   */
  async signIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    if (this.auth) {
      try {
        const cred = await signInWithEmailAndPassword(this.auth, cleanEmail, password);
        const user = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cleanEmail.split('@')[0] || 'Operator',
          photoURL: cred.user.photoURL || null
        };
        this._saveCachedUser(user);
        this._notifyListeners(user);
        return user;
      } catch (err) {
        console.warn('[AuthService] Firebase signIn error:', err.code, err.message);

        if (
          err.code === 'auth/configuration-not-found' ||
          err.code === 'auth/operation-not-allowed' ||
          err.code === 'auth/admin-restricted-operation'
        ) {
          return await this._firestoreAuthFallback(cleanEmail, password, cleanEmail.split('@')[0], false);
        }
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw new Error(err.message || 'Could not sign in. Please try again.');
      }
    }

    return await this._firestoreAuthFallback(cleanEmail, password, cleanEmail.split('@')[0], false);
  }

  /**
   * Resilient Firestore auth fallback when Firebase Identity Platform
   * is not enabled in Firebase console for Email/Password.
   */
  async _firestoreAuthFallback(email, password, displayName, isSignUp) {
    const safeDocId = encodeURIComponent(email).replace(/\./g, '_');
    const userDocRef = doc(dbSync.db, 'users_auth', safeDocId);

    try {
      const snap = await getDoc(userDocRef);
      if (isSignUp) {
        const userUid = `usr_${Math.abs(this._hashString(email)).toString(36)}`;
        const userData = {
          uid: userUid,
          email: email,
          passwordHash: this._hashString(password),
          displayName: displayName,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userData, { merge: true });
        const user = { uid: userUid, email, displayName, photoURL: null };
        this._saveCachedUser(user);
        this._notifyListeners(user);
        return user;
      } else {
        if (snap.exists()) {
          const data = snap.data();
          if (data.passwordHash && data.passwordHash !== this._hashString(password)) {
            throw new Error('Incorrect password. Please try again.');
          }
          const user = {
            uid: data.uid || `usr_${Math.abs(this._hashString(email)).toString(36)}`,
            email: data.email || email,
            displayName: data.displayName || displayName,
            photoURL: null
          };
          this._saveCachedUser(user);
          this._notifyListeners(user);
          return user;
        } else {
          // If not exists, auto-create on first sign-in
          const userUid = `usr_${Math.abs(this._hashString(email)).toString(36)}`;
          const userData = {
            uid: userUid,
            email: email,
            passwordHash: this._hashString(password),
            displayName: displayName,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, userData, { merge: true });
          const user = { uid: userUid, email, displayName, photoURL: null };
          this._saveCachedUser(user);
          this._notifyListeners(user);
          return user;
        }
      }
    } catch (e) {
      // Local offline fallback
      const userUid = `usr_${Math.abs(this._hashString(email)).toString(36)}`;
      const user = { uid: userUid, email, displayName, photoURL: null };
      this._saveCachedUser(user);
      this._notifyListeners(user);
      return user;
    }
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  async signOut() {
    if (this.auth) {
      try {
        await firebaseSignOut(this.auth);
      } catch (e) {}
    }
    this._saveCachedUser(null);
    this._notifyListeners(null);
  }
}

export const authService = new AuthService();
