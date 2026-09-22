import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebaseConfig.js';
import { StorageService } from './StorageService.js';

class DatabaseSyncService {
  constructor() {
    this.app = null;
    this.db = null;
    this.syncKey = null;
    this.siblingKey = null;
    this.unsubscribe = null;
    this.tradeUnsubscribe = null;
    this.isSyncing = false;
    this.onRemoteUpdate = null;
    this.onTradesUpdate = null;
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

  getPairKey(key1, key2) {
    if (!key1 || !key2) return null;
    return [key1.toUpperCase(), key2.toUpperCase()].sort().join('_');
  }

  async startSync(syncKey, siblingKey, onRemoteUpdate, onTradesUpdate) {
    if (!this.db) {
      console.warn("Cannot start sync: Firebase is not initialized.");
      return;
    }
    
    this.syncKey = syncKey;
    this.siblingKey = siblingKey;
    this.onRemoteUpdate = onRemoteUpdate;
    this.onTradesUpdate = onTradesUpdate;
    this.isSyncing = true;
    
    // 1. Subscribe to personal remote state
    const docRef = doc(this.db, 'users', this.syncKey);
    
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteState = snap.data();
        this.onRemoteUpdate(remoteState);
      } else {
        const localState = StorageService.load();
        if (localState) {
          await this.pushState(localState);
        }
      }
    } catch (err) {
      console.error("Error during initial sync:", err);
    }

    this.unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && this.isSyncing) {
        const remoteState = docSnap.data();
        this.isSyncing = false; 
        this.onRemoteUpdate(remoteState);
        this.isSyncing = true;
      }
    });

    // 2. Subscribe to real-time Sibling Trade & Accountability Channel
    if (siblingKey) {
      const pairKey = this.getPairKey(syncKey, siblingKey);
      if (pairKey) {
        const tradeDocRef = doc(this.db, 'trade_channels', pairKey);
        
        try {
          const tradeSnap = await getDoc(tradeDocRef);
          if (tradeSnap.exists() && this.onTradesUpdate) {
            this.onTradesUpdate(tradeSnap.data());
          }
        } catch (err) {
          console.error("Error fetching trade channel:", err);
        }

        this.tradeUnsubscribe = onSnapshot(tradeDocRef, (docSnap) => {
          if (docSnap.exists() && this.onTradesUpdate) {
            this.onTradesUpdate(docSnap.data());
          }
        });
      }
    }
  }

  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.tradeUnsubscribe) {
      this.tradeUnsubscribe();
      this.tradeUnsubscribe = null;
    }
    this.syncKey = null;
    this.siblingKey = null;
    this.isSyncing = false;
  }

  async pushTradeData(myKey, siblingKey, tradeChannelData) {
    if (!this.db) return;
    const pairKey = this.getPairKey(myKey, siblingKey);
    if (!pairKey) return;

    try {
      const tradeDocRef = doc(this.db, 'trade_channels', pairKey);
      await setDoc(tradeDocRef, tradeChannelData, { merge: true });
    } catch (err) {
      console.error("Error pushing trade channel data:", err);
    }
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
