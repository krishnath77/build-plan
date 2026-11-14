import './styles.css';
import './gate.css';
import { initializeApp } from 'firebase/app';
import { initStore } from './store.js';
import { initAuth, watchAuth, signInGoogle, signOutUser, checkAccess } from './auth.js';
import { initApp, startData } from './app.js';
import { setIsAdmin, setUser } from './appstate.js';
import { esc } from './ui/common.js';

const gate = document.getElementById('gate');
const CFG_KEY = 'bp_firebase_cfg';

// Web app config is served by Firebase Hosting at /__/firebase/init.json, so no keys live in the repo.
async function loadConfig(){
  try {
    const r = await fetch('/__/firebase/init.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('config ' + r.status);
    const cfg = await r.json();
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
    return cfg;
  } catch (e) {
    try { const c = localStorage.getItem(CFG_KEY); if (c) return JSON.parse(c); } catch (e2) {}
    throw e;
  }
}

function showGate(kind, extra){
  const card = (inner) => '<div class="gcard"><div class="gmark">BP</div><h1>Build Plan</h1><span class="gsub">Class 10 · Boards 2027</span>' + inner + '</div>';
  let h = '';
  if (kind === 'signin') h = card('<span>Sign in with Google to open your world.</span><button class="btn amber" id="gSign">Sign in with Google</button>' + (extra ? '<span class="gerr">' + esc(extra) + '</span>' : ''));
  else if (kind === 'checking') h = card('<span class="gsub"><span class="spin"></span> Checking your access…</span>');
  else if (kind === 'denied') h = card('<span>This Google account (' + esc(extra || '') + ') is not on the access list.</span><span class="gsub">Ask Krishnath to add it, then sign in again.</span><button class="btn ghostd" id="gOut">Use a different account</button>');
  else if (kind === 'error') h = card('<span class="gerr">' + esc(extra || 'Something went wrong.') + '</span><button class="btn amber" id="gRetry">Try again</button>');
  gate.innerHTML = h; gate.hidden = false;
  const s = document.getElementById('gSign'); if (s) s.onclick = async () => { try { await signInGoogle(); } catch (e) { showGate('signin', 'Sign-in did not complete (' + (e && e.code ? e.code : 'error') + ').'); } };
  const o = document.getElementById('gOut'); if (o) o.onclick = () => signOutUser();
  const r = document.getElementById('gRetry'); if (r) r.onclick = () => location.reload();
}

let started = false;
async function main(){
  showGate('checking');
  let cfg;
  try { cfg = await loadConfig(); } catch (e) { showGate('error', 'Could not load the app configuration. Check your connection.'); return; }
  const app = initializeApp(cfg);
  initStore(app);
  initAuth(app);
  watchAuth(async user => {
    if (!user) { showGate('signin'); return; }
    showGate('checking');
    let res;
    try { res = await checkAccess(user); } catch (e) { showGate('error', 'Could not check access. Check your connection and try again.'); return; }
    if (!res.ok) { showGate('denied', user.email); return; }
    setUser({ email: user.email, uid: user.uid });
    setIsAdmin(!!res.admin);
    gate.hidden = true;
    if (!started) { started = true; initApp(); startData(); }
  });
}
main();
