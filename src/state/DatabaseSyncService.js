import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebaseConfig.js';
import { StorageService } from './StorageService.js';

class DatabaseSyncService {
  constructor() {
    this.app = null;
    this.db = null;
    this.syncKey = null;
    this.unsubscribe = null;
    this.isSyncing = false;
    this.onRemoteUpdate = null;
    this.initFirebase();
  }

  initFirebase() {
    try {
      if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
      }
    } catch (e) {
      console.warn("Firebase not initialized. Make sure firebaseConfig.js is set up.", e);
    }
  }

  async startSync(syncKey, onRemoteUpdate) {
    if (!this.db) {
      console.warn("Cannot start sync: Firebase is not initialized.");
      return;
    }
    
    this.syncKey = syncKey;
    this.onRemoteUpdate = onRemoteUpdate;
    this.isSyncing = true;
    
    // Subscribe to remote changes
    const docRef = doc(this.db, 'users', this.syncKey);
    
    // First, try to merge what we have with what is on the server
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteState = snap.data();
        this.onRemoteUpdate(remoteState);
      } else {
        // If server is empty, push our local state to it
        const localState = StorageService.load();
        if (localState) {
          await this.pushState(localState);
        }
      }
    } catch (err) {
      console.error("Error during initial sync:", err);
    }

    // Then subscribe for ongoing real-time updates
    this.unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && this.isSyncing) {
        const remoteState = docSnap.data();
        // Pause pushing while we apply remote update to prevent loop
        this.isSyncing = false; 
        this.onRemoteUpdate(remoteState);
        this.isSyncing = true;
      }
    });
  }

  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.syncKey = null;
    this.isSyncing = false;
  }

  async pushState(state) {
    if (!this.db || !this.syncKey || !this.isSyncing) return;
    
    try {
      const docRef = doc(this.db, 'users', this.syncKey);
      await setDoc(docRef, state, { merge: true });
    } catch (err) {
      console.error("Error pushing state to Firestore:", err);
    }
  }
}

export const dbSync = new DatabaseSyncService();
