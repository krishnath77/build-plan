import { ACCESS_PATH, usagePath } from './paths.js';

// Firestore wiring, with the database injected so a test can use a fake and check the paths.
export function makeGetAccess(db) {
  return async () => { const s = await db.doc(ACCESS_PATH).get(); return s.exists ? s.data() : { emails: [] }; };
}

export function makeUsage(db, FieldValue) {
  return {
    // One doc per user per day. Transaction so parallel calls cannot slip past the cap.
    async hit(uid, date, cap) {
      const ref = db.doc(usagePath(uid, date));
      return db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const n = snap.exists ? (snap.data().count || 0) : 0;
        if (n >= cap) return false;
        tx.set(ref, { uid, date, count: n + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return true;
      });
    }
  };
}
