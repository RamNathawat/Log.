import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { dbSync } from '../state/DatabaseSyncService.js';

class PairingService {
  /**
   * Generates a 6-digit random pairing code, saving it in Firestore under `pair_codes/{code}`.
   * Expires in 15 minutes.
   */
  async generatePairCode(userId, userName, profileRole) {
    if (!dbSync.db) throw new Error('Cloud database not connected.');

    // Generate random 6-digit string
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const codeRef = doc(dbSync.db, 'pair_codes', code);
    await setDoc(codeRef, {
      code,
      userId,
      userName: userName || profileRole || 'User',
      profileRole: profileRole || 'ram',
      createdAt: new Date().toISOString(),
      expiresAt
    });

    return { code, expiresAt };
  }

  /**
   * Redeems a 6-digit pairing code entered by the sibling.
   * Binds both user documents in Firestore with `pairedWith` metadata.
   */
  async redeemPairCode(code, currentUserId, currentUserName, currentProfileRole) {
    if (!dbSync.db) throw new Error('Cloud database not connected.');
    const cleanCode = code.trim().replace(/\s+/g, '');

    const codeRef = doc(dbSync.db, 'pair_codes', cleanCode);
    const snap = await getDoc(codeRef);

    if (!snap.exists()) {
      throw new Error('Invalid or expired code. Please verify and try again.');
    }

    const data = snap.data();
    if (Date.now() > data.expiresAt) {
      await deleteDoc(codeRef).catch(() => {});
      throw new Error('This code has expired. Please ask your sibling to generate a fresh code.');
    }

    if (data.userId === currentUserId) {
      throw new Error('You cannot pair with your own device code.');
    }

    const partnerId = data.userId;
    const partnerName = data.userName;
    const partnerRole = data.profileRole;

    // 1. Update Current User Doc
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

    // 2. Update Partner User Doc
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

    // 3. Delete used code so it cannot be reused
    await deleteDoc(codeRef).catch(() => {});

    return {
      success: true,
      partner: {
        uid: partnerId,
        name: partnerName,
        role: partnerRole
      }
    };
  }

  /**
   * Unlinks / unpairs from the current partner.
   */
  async unpair(currentUserId, partnerId) {
    if (!dbSync.db || !currentUserId) return;

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

export const pairingService = new PairingService();
