// Every Firestore path the app reads or writes must start with apps/c10/ (Anuj's paths must be unreachable from this app).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const seen = [];
const snap = { id: 'x', exists: () => false, data: () => ({}), metadata: { fromCache: false, hasPendingWrites: false } };
vi.mock('firebase/firestore', () => {
  const rec = (kind) => (_db, p) => { seen.push({ kind, path: p }); return { kind, path: p }; };
  const noop = () => () => {};
  return {
    initializeFirestore: () => ({}), persistentLocalCache: () => ({}), persistentMultipleTabManager: () => ({}),
    doc: rec('doc'), collection: rec('collection'),
    onSnapshot: () => () => {}, getDoc: async () => snap, getDocFromCache: async () => snap, getDocs: async () => ({ docs: [], metadata: {} }),
    setDoc: async () => {}, updateDoc: async () => {}, addDoc: async () => {},
    query: (q) => q, orderBy: noop(), limit: noop(),
    writeBatch: () => ({ set: () => {}, commit: async () => {} })
  };
});

const { initStore, db, batchSet, getCached } = await import('../../src/store.js');
const { withPrefix, C10_PREFIX } = await import('../../src/paths.js');

beforeEach(() => { seen.length = 0; initStore({}); });

const SRC = path.resolve(__dirname, '../../src');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(SRC).filter(f => f.endsWith('.js'));

describe('apps/c10 prefix', () => {
  it('withPrefix adds the prefix once and never lets a path escape it', () => {
    expect(C10_PREFIX).toBe('apps/c10/');
    expect(withPrefix('fp/state')).toBe('apps/c10/fp/state');
    expect(withPrefix('/answers')).toBe('apps/c10/answers');
    expect(withPrefix('apps/c10/briefs/m1')).toBe('apps/c10/briefs/m1');
    expect(() => withPrefix('')).toThrow();
  });

  it('every path passed to Firestore by the adapter starts with apps/c10/', async () => {
    db.doc('fp/state').onSnapshot(() => {});
    await db.doc('config/access').get();
    await db.doc('briefs/m1').set({});
    await db.doc('mistakes/abc').update({});
    db.collection('answers').orderBy('at', 'desc').limit(40).onSnapshot(() => {});
    await db.collection('mistakes').add({});
    db.collection('reports').doc('r1');
    await batchSet([{ path: 'answers/a', data: {} }, { path: 'notes/n', data: {} }]);
    await getCached('config/access');
    expect(seen.length).toBeGreaterThan(8);
    seen.forEach(x => expect(x.path.startsWith('apps/c10/')).toBe(true));
  });

  it('every document or collection path written literally in src/ ends up under apps/c10/', async () => {
    const found = new Set();
    const re = /(?:db\.(?:doc|collection)|getCached|setDoc|addDoc)\(\s*['"]([A-Za-z0-9_/]+)/g;
    files.forEach(f => { const t = fs.readFileSync(f, 'utf8'); let m; while ((m = re.exec(t))) found.add(m[1]); });
    const want = ['fp/state', 'fp/plan', 'answers', 'mistakes', 'notes', 'briefs', 'config/access', 'reports'];
    want.forEach(w => expect([...found].some(p => p.startsWith(w.split('/')[0]))).toBe(true));
    for (const p of found) {
      const parts = p.replace(/\/$/, '').split('/');
      // a collection path has an odd number of segments, a document path an even number
      if (parts.length % 2) db.collection(p); else db.doc(p);
    }
    expect(seen.length).toBe(found.size);
    seen.forEach(x => expect(x.path.startsWith('apps/c10/')).toBe(true));
  });

  it('only store.js imports firebase/firestore, so nothing can bypass the prefix', () => {
    const offenders = files.filter(f => /from\s+['"]firebase\/firestore['"]/.test(fs.readFileSync(f, 'utf8'))).map(f => path.basename(f));
    expect(offenders).toEqual(['store.js']);
  });

  it('none of Anuj’s root paths is named outside the adapter calls', () => {
    // no source file builds a path starting with a different app prefix
    files.forEach(f => { const t = fs.readFileSync(f, 'utf8'); expect(/['"]apps\/(?!c10\/)/.test(t)).toBe(false); });
  });
});
