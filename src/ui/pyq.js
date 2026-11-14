// Training: past paper practice (past board questions) and the full-paper list.
import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CH, chOf } from '../data/chapters.js';
import { addDays } from '../logic/dates.js';
import { esc, todayStr, ico, toast } from './common.js';
import { ov, openOv, closeOv, renderOv } from './overlays.js';
import { state, plan, canWrite, aiReady, touch, ui, render } from '../appstate.js';
import { saveState, addDoc } from '../persist.js';
import { hasBank, getBank, bankStatus, indexStatus, bankSubjects, PRACTICE_TYPES, selectQuestions, correctIndex, isSample, papersList, tierInfo } from '../qbank/bank.js';
import { texToText } from '../qbank/tex.js';
import { wantBank, pyqOf, questionBlockHTML } from './board.js';
import { openAns } from './answer.js';

const pq = () => (ui.pq = ui.pq || { s: SUB_ORDER[0], chs: null, type: 'mixed', count: 5, must: true, showMs: false });
function pyqState(){
  if (!state.pyq || typeof state.pyq !== 'object') state.pyq = {};
  state.pyq.done = state.pyq.done || {}; state.pyq.papers = state.pyq.papers || {};
  return state.pyq;
}

// chapters of a subject that the plan puts in the next 7 days
export function weekChapters(s){
  if (!plan) return [];
  const t = todayStr(), out = [];
  for (let k = 0; k < 7; k++) {
    const day = plan.days[addDays(t, k)]; if (!day) continue;
    day.b.forEach(b => { (b.cs || (b.c ? [b.c] : [])).forEach(id => { if (CH[id] && CH[id].s === s && !out.includes(id)) out.push(id); }); });
  }
  return out;
}
const chosenChapters = s => { const p = pq(); if (p.chs && p.chs.length) return p.chs.filter(id => CH[id] && CH[id].s === s); const w = weekChapters(s); return w.length ? w : chOf(s).filter(c => c.kind !== 'read' && c.kind !== 'write').map(c => c.id); };

// ---------- Training cards ----------
export function subjectChipsHTML(sel){
  return '<div class="chips">' + SUB_ORDER.map(s => {
    const on = hasBank(s);
    return '<button class="chip sm" data-a="pqSub" data-v="' + s + '" aria-pressed="' + (sel === s) + '" ' + (on ? '' : 'disabled') + '>' + SUBJ[s].name + (on ? '' : ' · coming soon') + '</button>';
  }).join('') + '</div>';
}

export function practiceCardHTML(){
  const p = pq();
  wantBank(SUB_ORDER[0]);
  if (!bankSubjects().length) return ''; // no question bank for any subject yet: the card stays hidden
  let h = '<div class="card"><div class="stack" style="gap:2px"><h2>Past paper practice</h2><span class="small muted">Real CBSE board questions (2022–2026) with the official marking scheme.</span></div>';
  if (indexStatus() === 'idle' || indexStatus() === 'loading') return h + '<div class="row"><span class="spin"></span><span class="small">Loading…</span></div></div>';
  h += subjectChipsHTML(p.s);
  if (!hasBank(p.s)) return h + '<span class="small muted">' + esc(SUBJ[p.s].name) + ' board questions are coming soon.</span></div>';
  const st = bankStatus(p.s);
  if (st !== 'ready') {
    if (st === 'error') return h + '<span class="small muted">The questions could not be loaded. Connect to the internet once and try again.</span><button class="btn sm ghost" style="align-self:flex-start" data-a="bqRetry" data-v="' + p.s + '">Try again</button></div>';
    return h + '<div class="row"><span class="spin"></span><span class="small">Loading board questions…</span></div></div>';
  }
  const bank = getBank(p.s);
  const chs = chosenChapters(p.s);
  h += '<div class="stack" style="gap:6px"><div class="between"><span class="small muted" style="font-weight:600">Chapters</span><span class="row" style="gap:6px"><button class="chip sm" data-a="pqWeek">This week</button><button class="chip sm" data-a="pqAllCh">All</button></span></div>'
    + '<div class="chips">' + chOf(p.s).filter(c => c.kind !== 'read' && c.kind !== 'write').map(c => '<button class="chip sm" data-a="pqCh" data-v="' + c.id + '" aria-pressed="' + chs.includes(c.id) + '">' + esc(c.name) + '</button>').join('') + '</div></div>';
  h += '<div class="stack" style="gap:6px"><span class="small muted" style="font-weight:600">Type</span><div class="chips">' + PRACTICE_TYPES.map(([v, l]) => '<button class="chip sm" data-a="pqType" data-v="' + v + '" aria-pressed="' + (p.type === v) + '">' + l + '</button>').join('') + '</div></div>';
  h += '<div class="stack" style="gap:6px"><span class="small muted" style="font-weight:600">How many</span><div class="chips">' + [5, 10, 15].map(n => '<button class="chip sm" data-a="pqCount" data-v="' + n + '" aria-pressed="' + (p.count === n) + '">' + n + '</button>').join('')
    + '<button class="chip sm" data-a="pqMust" aria-pressed="' + p.must + '">Must-do first</button></div></div>';
  const avail = selectQuestions(bank, { chapters: chs, type: p.type, count: 9999, mustFirst: p.must, practised: pyqOf().done }).length;
  h += '<button class="btn amber" data-a="pqStart" ' + (avail ? '' : 'disabled') + '>Start practice</button><span class="tiny muted">' + avail + ' question' + (avail === 1 ? '' : 's') + ' match' + (avail === 1 ? 'es' : '') + ' your choices.</span></div>';
  return h;
}

export function papersCardHTML(){
  const p = pq();
  wantBank(SUB_ORDER[0]);
  if (!bankSubjects().length) return ''; // no past papers for any subject yet: the card stays hidden
  let h = '<div class="card"><div class="stack" style="gap:2px"><h2>Full papers</h2><span class="small muted">Sit a full paper in 3 hours, phone away. Then open the marking scheme and log lost marks.</span></div>';
  if (indexStatus() === 'idle' || indexStatus() === 'loading') return h + '<div class="row"><span class="spin"></span><span class="small">Loading…</span></div></div>';
  const subs = bankSubjects();
  if (!subs.length) return h + '<span class="small muted">Full papers are coming soon.</span></div>';
  h += '<div class="between"><span class="small muted">Past board papers</span><button class="chip sm" data-a="paperMs" aria-pressed="' + p.showMs + '">Marking schemes: ' + (p.showMs ? 'shown' : 'hidden') + '</button></div>';
  const sat = pyqOf().papers;
  subs.forEach(s => {
    const bank = getBank(s);
    if (!bank) { h += '<div class="row"><span class="spin"></span><span class="small">Loading ' + esc(SUBJ[s].name) + ' papers…</span></div>'; return; }
    h += '<b>' + esc(SUBJ[s].name) + '</b>';
    h += papersList(bank).map(g => '<div class="stack" style="gap:6px;border-top:1px solid var(--line);padding-top:10px"><b class="small">' + esc(g.year) + '</b>'
      + g.rows.map(r => '<div class="between" style="gap:8px"><span class="small" style="flex:1;min-width:0">' + esc(r.label) + (sat[r.key] ? ' <span class="pill" style="background:var(--okBg);color:var(--ok)">Sat ✓</span>' : '') + '</span>'
        + '<span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><a class="btn sm" style="text-decoration:none" href="/papers/' + bank.dir + '/' + encodeURIComponent(r.file) + '" target="_blank" rel="noopener">Open paper</a>'
        + (p.showMs && r.ms ? '<a class="btn sm ghost" style="text-decoration:none" href="/papers/' + bank.dir + '/' + encodeURIComponent(r.ms) + '" target="_blank" rel="noopener">Marking scheme</a>' : '')
        + (r.board ? '<button class="btn sm ghost" data-a="paperSat" data-v="' + esc(r.key) + '" ' + (canWrite ? '' : 'disabled') + '>' + (sat[r.key] ? 'Undo' : 'I sat this paper') + '</button>' : '')
        + '</span></div>').join('') + '</div>').join('');
  });
  return h + '</div>';
}

// ---------- practice session (overlay) ----------
let saved = null;   // the session while the written-answer photo flow is open
const curQ = bank => bank.byId[ov.items[ov.i].qid];
const doneRes = qid => (ov.res || []).find(r => r.qid === qid);

export function startPractice(items, s){
  if (!items.length) { toast('No questions match. Try more chapters or another type.'); return false; }
  saved = null;
  openOv('pyq', { s, items, i: 0, res: [], picked: null, shown: false });
  return true;
}
export function startFromSetup(){
  const p = pq(), bank = getBank(p.s); if (!bank) return;
  const items = selectQuestions(bank, { chapters: chosenChapters(p.s), type: p.type, count: p.count, mustFirst: p.must, practised: pyqOf().done });
  startPractice(items, p.s);
}
export function startOne(qid){
  for (const s of Object.keys(SUBJ)) {
    const bank = getBank(s); const q = bank && bank.byId[qid];
    if (q) { if (!startPractice([{ qid, famId: bank.famOf[qid], chapter: q.chapter }], s)) return; return; }
  }
  toast('That question is not loaded yet. Try again in a moment.');
}

function record(q, famId, score, max){
  const c = CH[q.chapter]; const qt = texToText(q.text).slice(0, 140);
  ov.res.push({ qid: q.id, famId, score, max, chapter: q.chapter });
  markDone(famId, score, max);
  addDoc('answers', { d: todayStr(), at: Date.now(), s: c.s, ch: c.id, q: qt, got: score, max, source: 'pyq', qid: q.id, familyId: famId, chapter: c.id, marks: max, score });
  if (score < max) addDoc('mistakes', { ch: c.id, q: texToText(q.text).slice(0, 300), a: texToText(q.answer || q.answer_key || 'See the marking scheme').slice(0, 300), d: todayStr(), at: Date.now(), src: 'pyq', fixed: false });
}
function markDone(famId, score, max){
  if (!canWrite || !famId) return;
  pyqState().done[famId] = { at: Date.now(), score, max }; touch(); saveState();
}
// called by the photo-marking flow once the answer has been marked
export function pyqGraded(pq0, awarded, max){
  markDone(pq0.famId, awarded, max);
  if (saved) saved.res.push({ qid: pq0.qid, famId: pq0.famId, score: awarded, max, chapter: pq0.chapter });
}
export function resumePyq(){ if (!saved) { closeOv(); return; } const s = saved; saved = null; openOv('pyq', s); }

export function ovPyq(){
  const bank = getBank(ov.s);
  let h = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Past paper practice"><div class="between"><button class="iconbtn" data-a="closeOv" aria-label="Close">' + ico('x', 18, 2.4) + '</button><span class="small muted">Past paper practice · ' + Math.min(ov.i + 1, ov.items.length) + ' of ' + ov.items.length + '</span><span style="width:44px"></span></div>';
  if (!bank) return h + '<div class="card"><span class="small">The questions are not loaded.</span></div></div>';
  if (ov.i >= ov.items.length) {
    const tot = ov.res.reduce((a, r) => a + r.score, 0), max = ov.res.reduce((a, r) => a + r.max, 0);
    const revisit = ov.res.filter(r => r.score < r.max);
    h += '<div class="card" style="align-items:center;text-align:center"><span class="num" style="font-family:var(--display);font-size:44px;font-weight:700">' + tot + '<span style="font-size:22px;color:var(--muted)"> / ' + max + '</span></span><span class="small muted">marks across ' + ov.res.length + ' question' + (ov.res.length === 1 ? '' : 's') + '</span></div>';
    h += revisit.length ? '<div class="card"><span class="secttl">Families to revisit</span>' + revisit.map(r => { const f = bank.famById[r.famId]; return '<span class="small">' + (f ? tierInfo(f.tier).icon + ' ' + esc(texToText(f.label)) : esc(r.qid)) + ' <span class="tiny muted">· ' + esc(CH[r.chapter].name) + '</span></span>'; }).join('') + '<span class="small muted">These went into your mistake log.</span></div>'
      : '<div class="card"><span class="small">No marks lost. Nicely done.</span></div>';
    return h + '<button class="btn" data-a="closeOv">Finish</button></div>';
  }
  const it = ov.items[ov.i], q = bank.byId[it.qid], c = CH[q.chapter], f = bank.famById[it.famId];
  const done = doneRes(q.id);
  const ci = correctIndex(q);
  h += '<div class="card"><span class="tag" style="color:' + SUBJ[c.s].tx + '">' + SUBJ[c.s].name + ' · ' + esc(c.name) + (f ? ' · ' + tierInfo(f.tier).icon : '') + '</span>' + questionBlockHTML(bank, ci >= 0 ? { ...q, options: [] } : q, {}) + '</div>';
  if (ci >= 0) {
    h += '<div class="stack" style="gap:8px">' + q.options.map((o, k) => { let cls = 'opt'; if (ov.picked != null || done) { if (k === ci) cls += ' right'; else if (k === ov.picked) cls += ' wrong'; } return '<button class="' + cls + '" data-a="pqPick" data-v="' + k + '" ' + (ov.picked != null || done ? 'disabled' : '') + '>' + esc(texToText(o)) + '</button>'; }).join('') + '</div>';
    if (ov.picked != null || done) {
      const right = ov.picked === ci;
      h += '<div class="card" style="background:' + (right ? 'var(--okBg)' : 'var(--warnBg)') + '"><b class="small">' + (right ? 'Correct.' : 'Not this time. The answer is ' + esc(texToText(q.options[ci])) + '.') + '</b><span class="small" style="white-space:pre-line">' + esc(texToText(q.answer || '')) + '</span></div><button class="btn" data-a="pqNext">' + (ov.i + 1 < ov.items.length ? 'Next' : 'See summary') + '</button>';
    }
  } else if (done) {
    h += '<div class="card" style="background:var(--okBg)"><b class="small">Marked: ' + done.score + ' / ' + done.max + '</b>' + (q.answer ? '<span class="small" style="white-space:pre-line">' + esc(texToText(q.answer)) + '</span>' : '') + '</div><button class="btn" data-a="pqNext">' + (ov.i + 1 < ov.items.length ? 'Next' : 'See summary') + '</button>';
  } else {
    h += '<div class="banner note small">Write your answer on paper first, in about ' + Math.round(q.marks * 1.5 + 1) + ' minutes.</div>';
    if (ov.shown) {
      h += '<div class="card" style="background:var(--okBg)"><b class="small">Official marking scheme</b>'
        + (q.answer ? '<span class="small" style="white-space:pre-line">' + esc(texToText(q.answer)) + '</span>' : '<span class="small">Official answer not available' + (isSample(q) ? ' for the sample paper' : '') + '.</span>') + '</div>'
        + '<div class="stack" style="gap:6px"><span class="small muted" style="font-weight:600">How did it go?</span><div class="chips"><button class="chip sm" data-a="pqRate" data-v="full">Full marks</button><button class="chip sm" data-a="pqRate" data-v="part">Some marks</button><button class="chip sm" data-a="pqRate" data-v="miss">Missed it</button></div></div>';
    } else {
      h += '<button class="btn ghost" data-a="pqShow">Show official answer</button>';
    }
    h += '<button class="btn amber" data-a="pqCheck" ' + (aiReady() ? '' : 'disabled') + '>' + ico('camera', 18) + ' Check my written answer</button>';
  }
  return h + '</div>';
}

function nextQ(){ ov.i++; ov.picked = null; ov.shown = false; renderOv(); }
function checkWritten(){
  const bank = getBank(ov.s), it = ov.items[ov.i], q = bank.byId[it.qid];
  const pass = q.case_id && bank.cases[q.case_id] ? texToText(bank.cases[q.case_id].passage) + '\n\n' : '';
  saved = { ...ov };
  openAns({ s: CH[q.chapter].s, c: q.chapter, mk: q.marks, qtext: pass + texToText(q.text), ref: q.answer ? texToText(q.answer) : '', pq: { qid: q.id, famId: it.famId, chapter: q.chapter } });
}

export function handlePyqClick(a, v){
  const p = pq();
  switch (a) {
    case 'pqSub': p.s = v; p.chs = null; render(); return true;
    case 'pqCh': { const cur = chosenChapters(p.s).slice(); const i = cur.indexOf(v); if (i >= 0) cur.splice(i, 1); else cur.push(v); p.chs = cur; render(); return true; }
    case 'pqWeek': p.chs = null; render(); return true;
    case 'pqAllCh': p.chs = chOf(p.s).filter(c => c.kind !== 'read' && c.kind !== 'write').map(c => c.id); render(); return true;
    case 'pqType': p.type = v; render(); return true;
    case 'pqCount': p.count = +v; render(); return true;
    case 'pqMust': p.must = !p.must; render(); return true;
    case 'pqStart': startFromSetup(); return true;
    case 'pqOne': closeAndStartOne(v); return true;
    case 'pqPick': { const bank = getBank(ov.s), it = ov.items[ov.i], q = bank.byId[it.qid]; if (ov.picked != null) return true; ov.picked = +v; record(q, it.famId, +v === correctIndex(q) ? 1 : 0, 1); renderOv(); return true; }
    case 'pqShow': ov.shown = true; renderOv(); return true;
    case 'pqRate': { const bank = getBank(ov.s), it = ov.items[ov.i], q = bank.byId[it.qid]; const sc = v === 'full' ? q.marks : v === 'part' ? Math.max(1, Math.ceil(q.marks / 2)) : 0; record(q, it.famId, sc, q.marks); renderOv(); return true; }
    case 'pqCheck': if (aiReady()) checkWritten(); return true;
    case 'pqNext': nextQ(); return true;
    case 'pqBack': resumePyq(); return true;
    case 'paperMs': p.showMs = !p.showMs; render(); return true;
    case 'paperSat': { if (!canWrite) return true; const pp = pyqState().papers; if (pp[v]) delete pp[v]; else { pp[v] = todayStr(); toast('Logged. Now mark it and note the lost marks.'); } touch(); saveState(); render(); return true; }
  }
  return false;
}
function closeAndStartOne(qid){ if (ov.kind) closeOv(); startOne(qid); }
