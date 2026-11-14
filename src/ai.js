import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export const FUNCTIONS_REGION = 'asia-south1';
let callable = null;

function blobToBase64(blob){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export let lastErr = '';
export let lastModel = ''; // model id the function reports for the latest reply (saved with each brief)

// kind: 'quiz' | 'question' | 'grade' | 'notes' | 'brief'. Returns the parsed JSON value.
export async function askJSON(kind, prompt, opts){
  if (!callable) callable = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'askClaude10', { timeout: 300000 });
  const images = [];
  for (const b of (opts && opts.images) || []) images.push({ mediaType: b.type && b.type.startsWith('image/') ? b.type : 'image/jpeg', data: await blobToBase64(b) });
  const call = () => callable({ kind, prompt, ...(images.length ? { images } : {}) });
  try {
    let res;
    try { res = await call(); }
    catch (e1) {
      // one retry for transient upstream trouble
      if (mapCode(e1) === 'upstream_error') { await new Promise(r => setTimeout(r, 2500)); res = await call(); }
      else throw e1;
    }
    lastModel = (res.data && res.data.model) || '';
    return res.data && res.data.data;
  } catch (e) {
    const code = mapCode(e);
    console.error('[BuildPlan] Claude call failed', code, e && e.message);
    lastErr = code + ': ' + (e && e.message ? String(e.message).slice(0,160) : '');
    throw { code, message: e && e.message };
  }
}

// Map Firebase callable errors to the reference's error codes.
function mapCode(e){
  if (!e) return 'unknown';
  if (e.details && e.details.reason) return e.details.reason;
  const c = String(e.code || '').replace('functions/', '');
  if (c === 'unauthenticated') return 'session_expired';
  if (c === 'permission-denied') return 'not_granted';
  if (c === 'resource-exhausted') return 'rate_limited';
  if (c === 'unavailable' || c === 'deadline-exceeded' || c === 'internal') return 'upstream_error';
  if (c === 'data-loss') return 'invalid_json';
  return c || 'unknown';
}

export function errCopy(e){
  const c = e && e.code;
  const known = ({
    not_granted:'This account is not allowed to use Build Plan. Ask Krishnath to add it.',
    rate_limited:'Claude is busy or your usage limit has been reached. Try again in a little while.',
    daily_cap:'Today’s limit for Claude questions, marking and new briefs has been reached. It resets tomorrow.',
    session_expired:'Please sign in again, then retry.',
    image_rejected:'That photo could not be used. Try a clearer, smaller photo.',
    invalid_json:'The reply did not come through properly. Tap try again.',
    refused:'Claude could not answer that one. Try a different question.'
  })[c];
  if (known) return known;
  if (c === 'upstream_error') return 'Claude is not reachable right now. Check your connection and tap try again.';
  const det = (c || (e && e.name) || 'unknown') + (e && e.message ? ': ' + String(e.message).slice(0,140) : '');
  return 'Something went wrong reaching Claude. Tap try again. (Details for Krishnath: ' + det + ')';
}
