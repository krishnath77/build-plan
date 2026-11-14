import { describe, it, expect, vi } from 'vitest';
import { makeAskClaude, KINDS } from '../src/askClaude.js';
import { makeGetAccess, makeUsage } from '../src/data.js';
import { ACCESS_PATH, usagePath } from '../src/paths.js';
import { parseLoose } from '../src/parse.js';

const goodAuth = { uid: 'u1', token: { email: 'Student@Example.test', email_verified: true } };

function build({ emails = ['student@example.test'], allowed = true, reply, throwErr } = {}) {
  const create = vi.fn(async () => {
    if (throwErr) throw throwErr;
    return reply || { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"questions":[]}' }] };
  });
  const hit = vi.fn(async () => allowed);
  const handler = makeAskClaude({
    getAccess: async () => ({ emails }),
    usage: { hit },
    anthropic: { messages: { create } },
    getModel: () => 'test-model',
    getCap: () => 120
  });
  return { handler, create, hit };
}
const call = (handler, data, auth = goodAuth) => handler({ auth, data });
const code = async p => { try { await p; return null; } catch (e) { return { code: e.code, reason: e.details && e.details.reason }; } };

describe('askClaude', () => {
  it('refuses a caller who is not signed in', async () => {
    const { handler, create } = build();
    expect(await code(call(handler, { kind: 'quiz', prompt: 'x' }, null))).toEqual({ code: 'unauthenticated', reason: 'session_expired' });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses an unverified email', async () => {
    const { handler } = build();
    const r = await code(call(handler, { kind: 'quiz', prompt: 'x' }, { uid: 'u', token: { email: 'student@example.test', email_verified: false } }));
    expect(r.code).toBe('unauthenticated');
  });

  it('refuses a signed-in user who is not on the allowlist', async () => {
    const { handler, create, hit } = build({ emails: ['someone-else@example.test'] });
    expect(await code(call(handler, { kind: 'quiz', prompt: 'x' }))).toEqual({ code: 'permission-denied', reason: 'not_granted' });
    expect(create).not.toHaveBeenCalled();
    expect(hit).not.toHaveBeenCalled();
  });

  it('stops with a friendly error when the daily cap is reached', async () => {
    const { handler, create } = build({ allowed: false });
    expect(await code(call(handler, { kind: 'quiz', prompt: 'x' }))).toEqual({ code: 'resource-exhausted', reason: 'daily_cap' });
    expect(create).not.toHaveBeenCalled();
  });

  it('parses the JSON reply and sends model, prompt and images', async () => {
    const fence = '```';
    const reply = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Here you go:\n' + fence + 'json\n{"questions":[{"q":"2+2?","options":["1","2","3","4"],"answer":3}]}\n' + fence }] };
    const { handler, create, hit } = build({ reply });
    const res = await call(handler, { kind: 'grade', prompt: 'mark this', images: [{ mediaType: 'image/jpeg', data: 'QUJD' }] });
    expect(res.data.questions[0].answer).toBe(3);
    expect(hit).toHaveBeenCalledWith('u1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 120);
    const arg = create.mock.calls[0][0];
    expect(arg.model).toBe('test-model');
    expect(arg.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } });
    expect(arg.messages[0].content[1]).toEqual({ type: 'text', text: 'mark this' });
  });

  it('rejects images on non-grade calls and unknown kinds', async () => {
    const { handler } = build();
    expect((await code(call(handler, { kind: 'quiz', prompt: 'x', images: [{ mediaType: 'image/jpeg', data: 'QUJD' }] }))).code).toBe('invalid-argument');
    expect((await code(call(handler, { kind: 'other', prompt: 'x' }))).code).toBe('invalid-argument');
  });

  it('maps a refusal and an unparseable reply to errors', async () => {
    expect((await code(call(build({ reply: { stop_reason: 'refusal', content: [] } }).handler, { kind: 'quiz', prompt: 'x' }))).reason).toBe('refused');
    const bad = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'no json here' }] };
    expect((await code(call(build({ reply: bad }).handler, { kind: 'quiz', prompt: 'x' }))).reason).toBe('invalid_json');
  });

  it('maps upstream rate limits and failures', async () => {
    expect((await code(call(build({ throwErr: { status: 429 } }).handler, { kind: 'quiz', prompt: 'x' }))).reason).toBe('rate_limited');
    expect((await code(call(build({ throwErr: { status: 500 } }).handler, { kind: 'quiz', prompt: 'x' }))).reason).toBe('upstream_error');
  });
});

describe('Build Plan (Class 10) rules for askClaude10', () => {
  const BRIEF = '{"overview":"x","topics":[]}';
  const ok = { stop_reason: 'end_turn', content: [{ type: 'text', text: BRIEF }] };

  it('accepts kind "brief" with the larger token budget and medium effort, and a Class 10 system line', async () => {
    expect(KINDS).toContain('brief');
    const { handler, create } = build({ reply: ok });
    const res = await call(handler, { kind: 'brief', prompt: 'write the brief' });
    expect(res.data.overview).toBe('x');
    const arg = create.mock.calls[0][0];
    expect(arg.max_tokens).toBe(16000);
    expect(arg.output_config).toEqual({ effort: 'medium' });
    expect(arg.system).toContain('CBSE Class 10 teacher and board examiner');
    expect(arg.system).not.toContain('Class 12');
  });

  it('reads the allowlist from apps/c10/config/access', async () => {
    expect(ACCESS_PATH).toBe('apps/c10/config/access');
    const get = vi.fn(async () => ({ exists: true, data: () => ({ emails: ['tejas-test@example.test'] }) }));
    const doc = vi.fn(() => ({ get }));
    const emails = (await makeGetAccess({ doc })()).emails;
    expect(doc).toHaveBeenCalledWith('apps/c10/config/access');
    expect(emails).toEqual(['tejas-test@example.test']);
    // a missing document means nobody is allowed
    const none = makeGetAccess({ doc: () => ({ get: async () => ({ exists: false }) }) });
    expect(await none()).toEqual({ emails: [] });
  });

  it('keeps usage counters at apps/c10/usage/{uid}_{date} and enforces the cap', async () => {
    expect(usagePath('u1', '2026-11-20')).toBe('apps/c10/usage/u1_2026-11-20');
    const store = {}; const paths = [];
    const db = {
      doc: p => ({ p }),
      runTransaction: async fn => fn({
        get: async ref => { paths.push(ref.p); return { exists: ref.p in store, data: () => store[ref.p] }; },
        set: (ref, data) => { store[ref.p] = { ...(store[ref.p] || {}), ...data }; }
      })
    };
    const usage = makeUsage(db, { serverTimestamp: () => 'ts' });
    expect(await usage.hit('u1', '2026-11-20', 2)).toBe(true);
    expect(await usage.hit('u1', '2026-11-20', 2)).toBe(true);
    expect(await usage.hit('u1', '2026-11-20', 2)).toBe(false);
    expect(Object.keys(store)).toEqual(['apps/c10/usage/u1_2026-11-20']);
    paths.forEach(p => expect(p.startsWith('apps/c10/usage/')).toBe(true));
  });

  it('refuses an email that is only on Anuj’s list (the Class 10 list does not contain it)', async () => {
    const { handler, create, hit } = build({ emails: ['tejas-test@example.test'] });
    const anuj = { uid: 'a1', token: { email: 'anuj-only@example.test', email_verified: true } };
    expect(await code(call(handler, { kind: 'brief', prompt: 'x' }, anuj))).toEqual({ code: 'permission-denied', reason: 'not_granted' });
    expect(create).not.toHaveBeenCalled();
    expect(hit).not.toHaveBeenCalled();
    // while the Class 10 student is let in
    const tejas = { uid: 't1', token: { email: 'Tejas-Test@Example.test', email_verified: true } };
    const { handler: h2 } = build({ emails: ['tejas-test@example.test'], reply: ok });
    expect((await call(h2, { kind: 'brief', prompt: 'x' }, tejas)).data.overview).toBe('x');
  });

  it('does not accept images on a brief call', async () => {
    const { handler } = build({ reply: ok });
    expect((await code(call(handler, { kind: 'brief', prompt: 'x', images: [{ mediaType: 'image/jpeg', data: 'QUJD' }] }))).code).toBe('invalid-argument');
  });
});

describe('parseLoose', () => {
  it('handles plain, fenced and embedded JSON', () => {
    const fence = '```';
    expect(parseLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseLoose(fence + '\n[1,2]\n' + fence)).toEqual([1, 2]);
    expect(parseLoose('Sure! {"a":{"b":2}} done')).toEqual({ a: { b: 2 } });
    expect(() => parseLoose('nope')).toThrow();
  });
});
