import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { dbSync } from '../state/DatabaseSyncService.js';

const LOCAL_PAIR_PREFIX = 'log_pair_code_';

class PairingService {
  /**
   * Generates a 6-digit random pairing code, saving it in Firestore under `pair_codes/{code}`
   * and caching locally in localStorage for resilience.
   */
  async generatePairCode(userId, userName, profileRole) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const pairData = {
      code,
      userId,
      userName: userName || profileRole || 'User',
      profileRole: profileRole || 'ram',
      createdAt: new Date().toISOString(),
      expiresAt
    };

    // 1. Save to local/cross-tab storage
    try {
      localStorage.setItem(`${LOCAL_PAIR_PREFIX}${code}`, JSON.stringify(pairData));
    } catch (e) {}

    // 2. Save to Firestore if available
    if (dbSync.db) {
      try {
        const codeRef = doc(dbSync.db, 'pair_codes', code);
        await setDoc(codeRef, pairData);
      } catch (err) {
        console.warn('[PairingService] Firestore code save notice (using local channel fallback):', err.message);
        // If Firestore rules take time to propagate, local storage allows immediate test pairing
      }
    }

    return { code, expiresAt };
  }

  /**
   * Redeems a 6-digit pairing code entered by the sibling.
   * Checks Firestore first, with fallback to local/shared storage.
   */
  async redeemPairCode(code, currentUserId, currentUserName, currentProfileRole) {
    const cleanCode = code.trim().replace(/\s+/g, '');
    let pairData = null;

    // 1. Try Firestore
    if (dbSync.db) {
      try {
        const codeRef = doc(dbSync.db, 'pair_codes', cleanCode);
        const snap = await getDoc(codeRef);
        if (snap.exists()) {
          pairData = snap.data();
        }
      } catch (err) {
        console.warn('[PairingService] Firestore read error, checking local fallback:', err.message);
      }
    }

    // 2. Fallback to localStorage / shared channel if Firestore didn't find it
    if (!pairData) {
      try {
        const localRaw = localStorage.getItem(`${LOCAL_PAIR_PREFIX}${cleanCode}`);
        if (localRaw) {
          pairData = JSON.parse(localRaw);
        }
      } catch (e) {}
    }

    if (!pairData) {
      throw new Error('Invalid or expired code. Please verify the 6-digit code and try again.');
    }

    if (Date.now() > pairData.expiresAt) {
      this._cleanupCode(cleanCode);
      throw new Error('This code has expired. Please ask your sibling to generate a fresh code.');
    }

    if (pairData.userId === currentUserId) {
      throw new Error('You cannot pair with your own device code. Enter your sibling’s code.');
    }

    const partnerId = pairData.userId;
    const partnerName = pairData.userName;
    const partnerRole = pairData.profileRole;

    // Save pairing in Firestore
    if (dbSync.db) {
      try {
        const myDocRef = doc(dbSync.db, 'users', currentUserId);
        await setDoc(
          myDocRef,
          {
            pairedWith: {
              uid: partnerId,
              name: partnerName,
              role: partnerRole,
              pairedAt: new Date().toISOString()
            }
          },
          { merge: true }
        );

        const partnerDocRef = doc(dbSync.db, 'users', partnerId);
        await setDoc(
          partnerDocRef,
          {
            pairedWith: {
              uid: currentUserId,
              name: currentUserName || currentProfileRole,
              role: currentProfileRole,
              pairedAt: new Date().toISOString()
            }
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('[PairingService] Firestore pairing metadata write error:', e.message);
      }
    }

    // Cleanup code
    this._cleanupCode(cleanCode);

    return {
      success: true,
      partner: {
        uid: partnerId,
        name: partnerName,
        role: partnerRole
      }
    };
  }

  async _cleanupCode(code) {
    try {
      localStorage.removeItem(`${LOCAL_PAIR_PREFIX}${code}`);
    } catch (e) {}

    if (dbSync.db) {
      try {
        const codeRef = doc(dbSync.db, 'pair_codes', code);
        await deleteDoc(codeRef);
      } catch (e) {}
    }
  }

  /**
   * Unlinks / unpairs from the current partner.
   */
  async unpair(currentUserId, partnerId) {
    if (!currentUserId) return;

    if (dbSync.db) {
      try {
        const myDocRef = doc(dbSync.db, 'users', currentUserId);
        await setDoc(myDocRef, { pairedWith: null }, { merge: true });

        if (partnerId) {
          const partnerDocRef = doc(dbSync.db, 'users', partnerId);
          await setDoc(partnerDocRef, { pairedWith: null }, { merge: true });
        }
      } catch (e) {
        console.warn('[PairingService] Unpair warning:', e);
      }
    }
  }
}

export const pairingService = new PairingService();
