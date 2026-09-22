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
    this.broadcastChannel = null;
    // Cached sibling task snapshot (populated from Firestore trade channel doc)
    this._siblingSnapshot = null;

    // Set up local cross-tab / cross-profile storage sync
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('log_trade_channel');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && this.onTradesUpdate) {
              this.onTradesUpdate(event.data);
            }
          };
        }
      } catch (e) {
        console.debug('[DatabaseSyncService] BroadcastChannel not supported/allowed:', e);
      }

      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('system_os_shared_trades_') && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (this.onTradesUpdate) {
              this.onTradesUpdate(data);
            }
          } catch (e) {
            // ignore JSON parse error
          }
        }
      });
    }

    this.initFirebase();
  }

  initFirebase() {
    try {
      if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
      }
    } catch (e) {
      console.warn('Firebase not initialized. Make sure firebaseConfig.js is set up.', e);
    }
  }

  getPairKey(key1, key2) {
    if (!key1 || !key2) return null;
    return [key1.toUpperCase(), key2.toUpperCase()].sort().join('_');
  }

  getLocalTrades(pairKey) {
    if (!pairKey || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`system_os_shared_trades_${pairKey}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  saveLocalTrades(pairKey, tradeData) {
    if (!pairKey || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`system_os_shared_trades_${pairKey}`, JSON.stringify(tradeData));
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(tradeData);
      }
    } catch (e) {
      // ignore
    }
  }

  async startSync(syncKey, siblingKey, onRemoteUpdate, onTradesUpdate) {
    this.syncKey = syncKey;
    this.siblingKey = siblingKey;
    this.onRemoteUpdate = onRemoteUpdate;
    this.onTradesUpdate = onTradesUpdate;
    this.isSyncing = true;

    const pairKey = this.getPairKey(syncKey, siblingKey);

    // Immediately load local shared trade data if available
    if (pairKey) {
      const localTrades = this.getLocalTrades(pairKey);
      if (localTrades && this.onTradesUpdate) {
        this.onTradesUpdate(localTrades);
      }
    }

    if (!this.db) {
      return;
    }

    // 1. Subscribe to personal remote state under collection 'users'
    const docRef = doc(this.db, 'users', this.syncKey);

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteState = snap.data();
        if (this.onRemoteUpdate) this.onRemoteUpdate(remoteState);
      } else {
        const localState = StorageService.load();
        if (localState) {
          await this.pushState(localState);
        }
      }
    } catch (err) {
      console.warn('Firestore initial user sync fallback:', err.message || err);
    }

    try {
      this.unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists() && this.isSyncing && this.onRemoteUpdate) {
            const remoteState = docSnap.data();
            this.isSyncing = false;
            this.onRemoteUpdate(remoteState);
            this.isSyncing = true;
          }
        },
        (err) => {
          console.warn('Firestore user snapshot warning:', err.message || err);
        }
      );
    } catch (err) {
      console.warn('Firestore snapshot setup skipped:', err.message || err);
    }

    // 2. Subscribe to real-time Sibling Trade & Accountability Channel
    // We store trade channels inside the 'users' collection (`users/trade_channel_${pairKey}`)
    // to match Firestore security rules that allow `/users/{userId}`.
    if (siblingKey && pairKey) {
      const tradeDocRef = doc(this.db, 'users', `trade_channel_${pairKey}`);

      try {
        const tradeSnap = await getDoc(tradeDocRef);
        if (tradeSnap.exists()) {
          const data = tradeSnap.data();
          // Cache sibling's task snapshot (keyed by their sync key)
          const sibSnapshotKey = `snapshot_${siblingKey.toUpperCase()}`;
          if (data[sibSnapshotKey]) this._siblingSnapshot = data[sibSnapshotKey];
          this.saveLocalTrades(pairKey, data);
          if (this.onTradesUpdate) this.onTradesUpdate(data);
        }
      } catch (err) {
        console.warn('Firestore trade channel fetch warning:', err.message || err);
      }

      try {
        this.tradeUnsubscribe = onSnapshot(
          tradeDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              // Always refresh sibling snapshot on every update
              const sibSnapshotKey = `snapshot_${(this.siblingKey || siblingKey).toUpperCase()}`;
              if (data[sibSnapshotKey]) this._siblingSnapshot = data[sibSnapshotKey];
              this.saveLocalTrades(pairKey, data);
              if (this.onTradesUpdate) this.onTradesUpdate(data);
            }
          },
          (err) => {
            console.warn('Firestore trade channel listener warning:', err.message || err);
          }
        );
      } catch (err) {
        console.warn('Firestore trade snapshot setup skipped:', err.message || err);
      }
    }
  }

  stopSync() {
    if (this.unsubscribe) {
      try { this.unsubscribe(); } catch (e) {}
      this.unsubscribe = null;
    }
    if (this.tradeUnsubscribe) {
      try { this.tradeUnsubscribe(); } catch (e) {}
      this.tradeUnsubscribe = null;
    }
    this.syncKey = null;
    this.siblingKey = null;
    this.isSyncing = false;
  }

  /**
   * Push trade data to Firestore and local storage.
   * Optionally embed a siblingSnapshot so the other device can
   * populate the "swap for sibling's task" dropdown without localStorage.
   */
  async pushTradeData(myKey, siblingKey, tradeChannelData) {
    const pairKey = this.getPairKey(myKey, siblingKey);
    if (!pairKey) return;

    // 1. Instantly persist to shared local storage & broadcast to sibling profile
    this.saveLocalTrades(pairKey, tradeChannelData);
    if (this.onTradesUpdate) {
      this.onTradesUpdate(tradeChannelData);
    }

    // 2. Persist to Firestore in the 'users' collection doc
    if (!this.db) return;
    try {
      const tradeDocRef = doc(this.db, 'users', `trade_channel_${pairKey}`);
      await setDoc(tradeDocRef, tradeChannelData, { merge: true });
    } catch (err) {
      console.warn('Firestore push trade data warning:', err.message || err);
    }
  }

  /**
   * Push a lightweight snapshot of the caller's current task list into the
   * trade channel doc under the caller's sync key. The sibling device reads
   * this to populate the "swap" dropdown without needing localStorage access.
   * @param {string} myKey  - e.g. 'OS2290'
   * @param {string} sibKey - e.g. 'OS1837'
   * @param {Array}  tasks  - array of { id, name, category } objects
   */
  async pushMyTaskSnapshot(myKey, sibKey, tasks) {
    const pairKey = this.getPairKey(myKey, sibKey);
    if (!pairKey || !this.db) return;
    try {
      const tradeDocRef = doc(this.db, 'users', `trade_channel_${pairKey}`);
      const fieldKey = `snapshot_${myKey.toUpperCase()}`;
      await setDoc(tradeDocRef, { [fieldKey]: tasks, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Firestore pushMyTaskSnapshot warning:', err.message || err);
    }
  }

  /**
   * Returns the sibling's cached task snapshot fetched from the trade channel.
   * @returns {Array|null}
   */
  getSiblingSnapshot() {
    return this._siblingSnapshot;
  }

  async pushState(state) {
    if (!this.db || !this.syncKey || !this.isSyncing) return;

    try {
      const docRef = doc(this.db, 'users', this.syncKey);
      await setDoc(docRef, state, { merge: true });
    } catch (err) {
      console.warn('Firestore push state warning:', err.message || err);
    }
  }
}

export const dbSync = new DatabaseSyncService();
