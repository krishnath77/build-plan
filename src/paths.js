// The one place that decides where Build Plan keeps its data. Every Firestore path the app reads or writes
// goes through store.js, which adds this prefix, so the other app's root paths (fp/, answers, briefs, ...) can never be reached by mistake.
export const C10_PREFIX = 'apps/c10/';
export const withPrefix = path => {
  const p = String(path || '').replace(/^\/+/, '');
  if (!p) throw new Error('empty Firestore path');
  return p.startsWith(C10_PREFIX) ? p : C10_PREFIX + p;
};
