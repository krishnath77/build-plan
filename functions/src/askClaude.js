import { HttpsError } from 'firebase-functions/v2/https';
import { parseLoose } from './parse.js';

export const KINDS = ['quiz', 'question', 'grade', 'notes', 'brief'];
// Output budget includes adaptive thinking tokens, so keep it generous.
const MAX_TOKENS = { quiz: 16000, question: 8000, grade: 16000, notes: 16000, brief: 16000 };
const EFFORT = { quiz: 'low', question: 'low', grade: 'medium', notes: 'medium', brief: 'medium' };
const SYSTEM = 'You are a careful CBSE Class 10 teacher and board examiner. Follow the output format in the user message exactly and reply with JSON only.';
const MAX_PROMPT_CHARS = 20000;
const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 7000000; // about 5 MB of image data per photo; the client sends photos shrunk to 1600 px
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const todayIST = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * Builds the callable handler. Everything with side effects is injected so it can be tested:
 *  - getAccess(): Promise<{emails: string[]}>      allowlist from Firestore apps/c10/config/access (see data.js)
 *  - usage.hit(uid, date, cap): Promise<boolean>   records one call; false when the daily cap is already reached
 *  - anthropic: client with messages.create()
 *  - getModel(), getCap(): current parameter values
 */
export function makeAskClaude({ getAccess, usage, anthropic, getModel, getCap, now = () => new Date() }) {
  return async function askClaude(request) {
    const auth = request.auth;
    const email = auth && auth.token && auth.token.email ? String(auth.token.email).toLowerCase() : '';
    if (!auth || !email || auth.token.email_verified !== true) {
      throw new HttpsError('unauthenticated', 'Sign in to use Build Plan.', { reason: 'session_expired' });
    }
    const access = await getAccess();
    const emails = ((access && access.emails) || []).map(e => String(e).toLowerCase());
    if (!emails.includes(email)) {
      throw new HttpsError('permission-denied', 'This account is not on the access list.', { reason: 'not_granted' });
    }

    const { kind, prompt, images } = request.data || {};
    if (!KINDS.includes(kind)) throw new HttpsError('invalid-argument', 'Unknown kind.');
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) throw new HttpsError('invalid-argument', 'Bad prompt.');
    const imgs = images == null ? [] : images;
    if (!Array.isArray(imgs) || imgs.length > MAX_IMAGES || (imgs.length && kind !== 'grade')) throw new HttpsError('invalid-argument', 'Bad images.', { reason: 'image_rejected' });
    for (const im of imgs) {
      if (!im || typeof im.data !== 'string' || !im.data || im.data.length > MAX_IMAGE_B64 || !MEDIA_TYPES.includes(im.mediaType)) {
        throw new HttpsError('invalid-argument', 'That photo cannot be used.', { reason: 'image_rejected' });
      }
    }

    const cap = getCap();
    const allowed = await usage.hit(auth.uid, todayIST(now()), cap);
    if (!allowed) throw new HttpsError('resource-exhausted', 'Daily limit reached.', { reason: 'daily_cap', cap });

    const content = [
      ...imgs.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } })),
      { type: 'text', text: prompt }
    ];

    let msg;
    try {
      msg = await anthropic.messages.create({
        model: getModel(),
        max_tokens: MAX_TOKENS[kind],
        system: SYSTEM,
        output_config: { effort: EFFORT[kind] },
        messages: [{ role: 'user', content }]
      });
    } catch (e) {
      const status = e && e.status;
      if (status === 429) throw new HttpsError('resource-exhausted', 'Claude is busy.', { reason: 'rate_limited' });
      if (status === 400 && imgs.length) throw new HttpsError('invalid-argument', 'Photo rejected.', { reason: 'image_rejected' });
      console.error('anthropic error', status, e && e.message);
      throw new HttpsError('unavailable', 'Claude is not reachable.', { reason: 'upstream_error' });
    }

    if (msg.stop_reason === 'refusal') throw new HttpsError('failed-precondition', 'Refused.', { reason: 'refused' });
    const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    try {
      return { data: parseLoose(text), model: msg.model || getModel() };
    } catch (e) {
      throw new HttpsError('data-loss', 'Reply was not valid JSON.', { reason: 'invalid_json' });
    }
  };
}
