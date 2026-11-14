import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, getCached } from './store.js';
import { userInfo } from './appstate.js';
import { esc } from './ui/common.js';

let auth = null;
export function initAuth(app){ auth = getAuth(app); return auth; }
export const watchAuth = cb => onAuthStateChanged(auth, cb);

export async function signInGoogle(){
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { await signInWithRedirect(auth, p); return; }
    if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return;
    throw e;
  }
}

export async function signOutUser(){
  try { await signOut(auth); } catch (e) {}
  location.reload();
}

// Allowlist lives in Firestore doc config/access = { emails: [..], admins: [..] }.
// The rules only let listed users read it, so a successful read means the account is allowed.
export async function checkAccess(user){
  const email = String(user.email || '').toLowerCase();
  const read = async () => {
    try { return await db.doc('config/access').get(); }
    catch (e) {
      if (e && e.code === 'permission-denied') return { denied: true };
      const cached = await getCached('config/access').catch(() => null);
      if (cached && cached.exists) return cached;
      throw e;
    }
  };
  const snap = await read();
  if (snap.denied || !snap.exists) return { ok: false };
  const d = snap.data() || {};
  const emails = (d.emails || []).map(x => String(x).toLowerCase());
  const admins = (d.admins || []).map(x => String(x).toLowerCase());
  if (!emails.includes(email)) return { ok: false };
  return { ok: true, admin: admins.includes(email) };
}

export function accountCardHTML(){
  if (!userInfo) return '';
  return '<div class="card"><h2>Account</h2><span class="small muted">Signed in as ' + esc(userInfo.email || '') + '</span><button class="btn ghost" style="align-self:flex-start" data-a="signOut">Sign out</button></div>';
}
