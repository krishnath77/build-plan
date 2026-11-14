// Firestore adapter: exposes the small surface the original app used
// (doc/collection, onSnapshot/get/set/update/add, snapshot.exists/.data()/.metadata) over the modular web SDK.
// Every path gets the apps/c10/ prefix HERE and nowhere else: screens keep short paths such as 'fp/state' or 'answers'.
// This is the only file that imports firebase/firestore (tests/unit/store.test.js checks that).
import { withPrefix } from './paths.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc as fsDoc, collection as fsCollection, onSnapshot, getDoc, getDocFromCache, getDocs, setDoc, updateDoc, addDoc,
  query, orderBy, limit, writeBatch } from 'firebase/firestore';

let fs = null;

export function initStore(app){
  try {
    fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    // persistence unavailable (private mode, old browser): fall back to the default in-memory cache
    fs = initializeFirestore(app, {});
  }
  return fs;
}

const wrapDoc = snap => ({
  id: snap.id,
  exists: snap.exists(),
  data: () => snap.data(),
  metadata: { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites }
});
const wrapQuery = snap => ({
  docs: snap.docs.map(d => ({ id: d.id, exists: true, data: () => d.data() })),
  metadata: { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites }
});

const OPTS = { includeMetadataChanges: true };

function queryApi(q){
  return {
    orderBy: (field, dir) => queryApi(query(q, orderBy(field, dir || 'asc'))),
    limit: n => queryApi(query(q, limit(n))),
    onSnapshot: (next, error) => onSnapshot(q, OPTS, s => next(wrapQuery(s)), error),
    get: async () => wrapQuery(await getDocs(q))
  };
}

export function docApi(path){
  const full = withPrefix(path);
  const ref = fsDoc(fs, full);
  return {
    path: full,
    onSnapshot: (next, error) => onSnapshot(ref, OPTS, s => next(wrapDoc(s)), error),
    get: async () => wrapDoc(await getDoc(ref)),
    set: data => setDoc(ref, data),
    update: data => updateDoc(ref, data)
  };
}

export function collectionApi(path){
  const ref = fsCollection(fs, withPrefix(path));
  return {
    ...queryApi(ref),
    add: data => addDoc(ref, data),
    doc: id => docApi(path + '/' + id)
  };
}

// Batched writes (max 500 per commit). ops: [{path, data}]
export async function batchSet(ops, onProgress){
  let done = 0;
  for (let i = 0; i < ops.length; i += 450) {
    const b = writeBatch(fs);
    ops.slice(i, i + 450).forEach(o => b.set(fsDoc(fs, withPrefix(o.path)), o.data));
    await b.commit();
    done += Math.min(450, ops.length - i);
    if (onProgress) onProgress(done, ops.length);
  }
  return done;
}

export const db = { doc: docApi, collection: collectionApi };
export const getFirestoreInstance = () => fs;

export async function getCached(path){
  const s = await getDocFromCache(fsDoc(fs, withPrefix(path)));
  return wrapDoc(s);
}
