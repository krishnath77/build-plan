// Question bank: lazy loader, indexes and the pure selection logic (no DOM, so it can be unit tested).
import { QBANK_DIRS } from '../data/qbankSubjects.js';

const TIER = {
  red: { icon: '🔴', label: 'Near-certain', rank: 0 },
  orange: { icon: '🟠', label: 'Likely', rank: 1 },
  yellow: { icon: '🟡', label: 'Possible', rank: 2 }
};
export const tierInfo = t => TIER[t] || TIER.yellow;

const TYPE_LABEL = { mcq: 'MCQ', ar: 'Assertion–Reason', vsa2: '2-mark', sa3: '3-mark', case4: 'Case-based', la5: '5-mark' };
export const typeLabel = t => TYPE_LABEL[t] || t;

export const PRACTICE_TYPES = [
  ['mixed', 'Mixed'], ['mcq', 'MCQ & A-R'], ['vsa2', '2-mark'], ['sa3', '3-mark'], ['case4', 'Case-based'], ['la5', '5-mark']
];

async function getJSON(fetchFn, url){
  const r = await fetchFn(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}

// ---- loading ----
const state = { index: { status: 'idle', subjects: {} }, banks: {} };
export const bankStatus = s => (state.banks[s] ? state.banks[s].status : 'idle');
export const indexStatus = () => state.index.status;
export const bankSubjects = () => Object.keys(state.index.subjects);   // app subject ids that have a bank
export const hasBank = s => !!state.index.subjects[s];
export const getBank = s => (state.banks[s] && state.banks[s].status === 'ready' ? state.banks[s].data : null);

export function buildBank(dir, questionsJson, familiesJson, mustdoJson, manifestJson){
  const questions = questionsJson.questions;
  const byId = {}; questions.forEach(q => { byId[q.id] = q; });
  const families = familiesJson;
  const famById = {}, famOf = {};
  families.forEach(f => { famById[f.family_id] = f; f.question_ids.forEach(id => { famOf[id] = f.family_id; }); });
  const mustdo = mustdoJson;
  const mustdoIds = new Set(mustdo.map(m => m.family_id));
  return { dir, questions, byId, cases: questionsJson.cases || {}, families, famById, famOf, mustdo, mustdoIds, manifest: manifestJson || [] };
}

export async function loadBank(dir, fetchFn){
  const f = fetchFn || ((u) => fetch(u));
  const [q, fam, md, man] = await Promise.all([
    getJSON(f, '/qbank/' + dir + '/questions.json'),
    getJSON(f, '/qbank/' + dir + '/families.json'),
    getJSON(f, '/qbank/' + dir + '/mustdo.json'),
    getJSON(f, '/papers/' + dir + '/manifest.json').catch(() => [])
  ]);
  return buildBank(dir, q, fam, md, man);
}

// Both calls are safe to call on every render: they start a load once and call onChange when it finishes.
export function ensureIndex(onChange, fetchFn){
  if (state.index.status !== 'idle') return;
  // no subject has a bank yet (qbankSubjects.js is empty): nothing to fetch, every board-question screen stays hidden
  if (!Object.keys(QBANK_DIRS).length) { state.index.subjects = {}; state.index.status = 'ready'; return; }
  state.index.status = 'loading';
  (fetchFn || ((u) => fetch(u)))('/qbank/index.json').then(r => (r.ok ? r.json() : { subjects: {} }))
    .then(j => { state.index.subjects = (j && j.subjects) || {}; state.index.status = 'ready'; })
    .catch(() => { state.index.subjects = {}; state.index.status = 'error'; })
    .then(() => { if (onChange) onChange(); });
}
export function ensureBank(s, onChange, fetchFn){
  if (!hasBank(s)) return;
  const cur = state.banks[s];
  if (cur && cur.status !== 'idle') return;
  state.banks[s] = { status: 'loading', data: null };
  loadBank(state.index.subjects[s] || QBANK_DIRS[s], fetchFn)
    .then(d => { state.banks[s] = { status: 'ready', data: d }; })
    .catch(() => { state.banks[s] = { status: 'error', data: null }; })
    .then(() => { if (onChange) onChange(); });
}
export function retryLoad(s){ if (s === '*') { if (state.index.status === 'error') state.index.status = 'idle'; } else if (state.banks[s] && state.banks[s].status === 'error') state.banks[s] = { status: 'idle', data: null }; }
// test helper
export function _reset(){ state.index = { status: 'idle', subjects: {} }; state.banks = {}; }
export function _setIndex(subjects){ state.index = { status: 'ready', subjects }; }

// ---- question helpers ----
// index of the correct option for an MCQ-form question, or -1 when the key cannot be matched to an option
export function correctIndex(q){
  if (!Array.isArray(q.options) || !q.options.length || !q.answer_key) return -1;
  const key = String(q.answer_key).trim();
  const m = key.match(/^\(?([A-Da-d])\)?$/);
  if (m) { const i = m[1].toUpperCase().charCodeAt(0) - 65; return i < q.options.length ? i : -1; }
  const k = key.toLowerCase();
  return q.options.findIndex(o => String(o).trim().toLowerCase().startsWith(k));
}
export const isMcqForm = q => correctIndex(q) >= 0;
export const hasAnswer = q => isMcqForm(q) || !!(q.answer && String(q.answer).trim());
export const isSample = q => typeof q.year !== 'number';
const yearOf = q => (typeof q.year === 'number' ? q.year : 0);

export function chapterMustdo(bank, ch){ return bank.mustdo.filter(m => m.chapter === ch); }
export function chapterFamilies(bank, ch){
  return bank.families.filter(f => f.chapter === ch)
    .sort((a, b) => tierInfo(a.tier).rank - tierInfo(b.tier).rank || b.years.length - a.years.length || a.family_id.localeCompare(b.family_id));
}
export function famQuestions(bank, fam){
  return fam.question_ids.map(id => bank.byId[id]).filter(Boolean)
    .sort((a, b) => (isSample(a) ? 1 : 0) - (isSample(b) ? 1 : 0) || yearOf(b) - yearOf(a) || a.id.localeCompare(b.id));
}
export function askedYears(fam){ return fam.years && fam.years.length ? fam.years.join(', ') : 'sample paper only'; }

// ---- practice selection ----
export function shuffle(arr, rng){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((rng || Math.random)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const typeOk = (q, type) => type === 'mixed' || (type === 'mcq' ? (q.type === 'mcq' || q.type === 'ar') : q.type === type);

// opts: {chapters:[ids], type:'mixed'|'mcq'|'vsa2'|'sa3'|'case4'|'la5', count, mustFirst, practised:{famId:..}, rng}
// One question per family, only questions that have an official answer and are not marked out of syllabus.
export function selectQuestions(bank, opts){
  const chapters = new Set(opts.chapters || []);
  const practised = opts.practised || {};
  const picks = [];
  bank.families.forEach(f => {
    if (!chapters.has(f.chapter)) return;
    const qs = famQuestions(bank, f).filter(q => !isSample(q) && q.syllabus !== 'out' && hasAnswer(q) && typeOk(q, opts.type || 'mixed'));
    if (!qs.length) return;
    const must = bank.mustdoIds.has(f.family_id);
    // the must-do entry's own representative is preferred when it qualifies
    const md = must ? bank.mustdo.find(m => m.family_id === f.family_id) : null;
    const q = (md && qs.find(x => x.id === md.representative.id)) || qs[0];
    picks.push({ q, fam: f, must, done: !!practised[f.family_id], tier: tierInfo(f.tier).rank });
  });
  const key = p => (opts.mustFirst === false ? 0 : (p.must ? 0 : 1)) * 100 + (p.done ? 10 : 0) + p.tier;
  const groups = new Map();
  shuffle(picks, opts.rng).forEach(p => { const k = key(p); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
  const ordered = [...groups.keys()].sort((a, b) => a - b).flatMap(k => groups.get(k));
  return ordered.slice(0, Math.max(0, opts.count || 0)).map(p => ({ qid: p.q.id, famId: p.fam.family_id, chapter: p.fam.chapter }));
}

// "Board questions for this quest": up to n must-do families of the chapters, red first, skipping practised ones.
export function suggestFamilies(bank, chapterIds, practised, n){
  const ids = new Set(chapterIds);
  const list = bank.mustdo.filter(m => ids.has(m.chapter) && !(practised && practised[m.family_id]));
  return list.map((m, i) => ({ m, i })).sort((a, b) => tierInfo(a.m.tier).rank - tierInfo(b.m.tier).rank || a.i - b.i).slice(0, n || 3).map(x => x.m);
}

// ---- full papers ----
const isBoardQp = e => e.kind === 'board_qp';
export function papersList(bank){
  const qps = bank.manifest.filter(e => e.kind === 'board_qp' || e.kind === 'sample_qp');
  const rows = qps.map(e => {
    const ms = e.kind === 'board_qp' ? bank.manifest.find(m => m.kind === 'board_ms' && m.year === e.year && m.region === e.region) : null;
    const label = e.kind === 'sample_qp' ? e.year + ' · Sample paper' : e.year + ' · Region ' + e.region + ' · Set ' + e.set;
    return { key: e.file, year: e.year, region: e.region, kind: e.kind, file: e.file, ms: ms ? ms.file : null, label, board: isBoardQp(e) };
  });
  const byYear = new Map();
  rows.forEach(r => { const k = String(r.year); if (!byYear.has(k)) byYear.set(k, []); byYear.get(k).push(r); });
  const order = [...byYear.keys()].sort((a, b) => parseInt(b, 10) - parseInt(a, 10) || (a < b ? 1 : -1));
  return order.map(y => ({ year: y, rows: byYear.get(y).sort((a, b) => String(a.region).localeCompare(String(b.region), undefined, { numeric: true })) }));
}
export function newestUnsat(bank, papersSat){
  const all = papersList(bank).flatMap(g => g.rows).filter(r => r.board);
  return all.find(r => !(papersSat && papersSat[r.key])) || null;
}

// ---- progress ----
export function progress(bank, pyq){
  const done = (pyq && pyq.done) || {}, sat = (pyq && pyq.papers) || {};
  const boardPapers = bank.manifest.filter(isBoardQp);
  return {
    mustdoTotal: bank.mustdo.length,
    mustdoDone: bank.mustdo.filter(m => done[m.family_id]).length,
    papersTotal: boardPapers.length,
    papersSat: boardPapers.filter(e => sat[e.file]).length
  };
}
