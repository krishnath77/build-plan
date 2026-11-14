// Board questions: the Syllabus section for a chapter, the quest suggestion block and the Base camp progress line.
import { CH } from '../data/chapters.js';
import { SUBJ } from '../data/subjects.js';
import { esc } from './common.js';
import { ui, state, render } from '../appstate.js';
import {
  ensureIndex, ensureBank, hasBank, getBank, bankStatus, bankSubjects, retryLoad,
  tierInfo, typeLabel, chapterMustdo, chapterFamilies, famQuestions, askedYears, suggestFamilies, newestUnsat, progress,
  isMcqForm, isSample
} from '../qbank/bank.js';
import { texToText } from '../qbank/tex.js';

const bq = () => (ui.bq = ui.bq || { open: {}, ans: {}, more: {}, all: false });
export const pyqOf = () => { const p = state.pyq && typeof state.pyq === 'object' ? state.pyq : {}; return { done: p.done || {}, papers: p.papers || {} }; };

// Make sure the bank for a subject is on its way. Safe to call from any render.
export function wantBank(s){
  ensureIndex(render);
  if (hasBank(s)) ensureBank(s, render);
}

const paperUrl = (bank, file, page) => '/papers/' + bank.dir + '/' + encodeURIComponent(file) + (page ? '#page=' + page : '');

export function questionBlockHTML(bank, q, opts){
  const o = opts || {};
  const sample = isSample(q);
  let h = '';
  if (q.case_id && bank.cases[q.case_id]) h += '<span class="small muted" style="white-space:pre-line"><b>Case:</b> ' + esc(texToText(bank.cases[q.case_id].passage)) + '</span>';
  h += '<span style="white-space:pre-line;font-size:15px">' + esc(texToText(q.text)) + '</span>';
  if (isMcqForm(q) || (Array.isArray(q.options) && q.options.length)) h += '<div class="stack" style="gap:4px">' + q.options.map(x => '<span class="small">' + esc(texToText(x)) + '</span>').join('') + '</div>';
  const meta = (sample ? 'Sample paper 2026-27' : q.year + ' · ' + q.region) + ' · Q' + q.qno + ' · ' + q.marks + (q.marks === 1 ? ' mark' : ' marks') + ' · ' + typeLabel(q.type);
  h += '<span class="tiny muted">' + esc(meta) + '</span>';
  if (q.has_diagram && q.src && q.src.qp_file) h += '<a class="small" style="color:#175D9E;font-weight:600" href="' + esc(paperUrl(bank, q.src.qp_file, q.src.qp_pages && q.src.qp_pages[0])) + '" target="_blank" rel="noopener">Figure: open the original page</a>';
  if (q.syllabus === 'check') h += '<span class="small" style="background:#FFF5DE;border:1px solid #F3D9A0;color:#7A5410;border-radius:10px;padding:6px 10px">May be outside the 2026-27 syllabus. Check with your teacher.</span>';
  if (o.answer) {
    if (sample && !q.answer) h += '<div class="ans small" style="background:var(--okBg);border-radius:10px;padding:8px 10px">Official answer not available for the sample paper</div>';
    else if (!q.answer && !q.answer_key) h += '<div class="ans small" style="background:var(--okBg);border-radius:10px;padding:8px 10px">Official answer not available for this question.</div>';
    else h += '<div class="ans small" style="white-space:pre-line;background:var(--okBg);border-radius:10px;padding:8px 10px"><b>Marking scheme:</b> ' + esc(texToText(q.answer || q.answer_key)) + '</div>';
  }
  return h;
}

function ansToggle(qid){ return '<button class="btn sm ghost" data-a="bqAns" data-v="' + esc(qid) + '">' + (bq().ans[qid] ? 'Hide answer' : 'Show answer') + '</button>'; }

function mustRowHTML(bank, m){
  const t = tierInfo(m.tier), open = !!bq().open[m.family_id];
  const q = bank.byId[m.representative.id] || m.representative;
  const fam = bank.famById[m.family_id];
  let h = '<div style="border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:8px">'
    + '<button data-a="bqOpen" data-v="' + esc(m.family_id) + '" aria-expanded="' + open + '" style="text-align:left;background:none;border:0;padding:0;display:flex;flex-direction:column;gap:3px;min-height:44px">'
    + '<span class="row" style="gap:8px;align-items:flex-start"><span class="pill" style="background:#EAE4D2;color:var(--ink)">' + t.icon + ' ' + t.label + '</span><b style="flex:1;font-size:15px">' + esc(texToText(m.label)) + '</b></span>'
    + '<span class="small muted">Asked in ' + esc(askedYears(m)) + (m.in_sqp ? ' · in the 2026-27 sample paper' : '') + ' · ' + m.typical_marks + (m.typical_marks === 1 ? ' mark' : ' marks') + ' · ' + esc(typeLabel(m.typical_type)) + '</span></button>';
  if (open) {
    h += '<div class="card" style="background:#FBF8EE;gap:8px">' + questionBlockHTML(bank, q, { answer: !!bq().ans[q.id] }) + '<div class="row" style="gap:8px;flex-wrap:wrap">' + ansToggle(q.id)
      + '<button class="btn sm" data-a="pqOne" data-v="' + esc(q.id) + '">Practise</button></div>';
    const others = fam ? famQuestions(bank, fam).filter(x => x.id !== q.id) : [];
    if (others.length) {
      h += '<button class="btn sm ghost" style="align-self:flex-start" data-a="bqMore" data-v="' + esc(m.family_id) + '">' + (bq().more[m.family_id] ? 'Hide other versions' : '+ ' + others.length + ' other version' + (others.length === 1 ? '' : 's')) + '</button>';
      if (bq().more[m.family_id]) h += others.map(x => '<div class="stack" style="gap:4px;border-top:1px dashed var(--line);padding-top:8px">' + questionBlockHTML(bank, x, { answer: !!bq().ans[x.id] }) + '<div>' + ansToggle(x.id) + '</div></div>').join('');
    }
    h += '</div>';
  }
  return h + '</div>';
}

function allBoardHTML(bank, c){
  const fams = chapterFamilies(bank, c.id);
  const n = bank.questions.filter(q => q.chapter === c.id).length;
  let h = '<button class="btn sm ghost" style="align-self:flex-start" data-a="bqAll" aria-expanded="' + bq().all + '">' + (bq().all ? 'Hide' : 'Show') + ' all ' + n + ' board questions from this chapter</button>';
  if (!bq().all) return h;
  h += fams.map(f => {
    const t = tierInfo(f.tier);
    return '<div class="stack" style="gap:6px;border-top:1px solid var(--line);padding-top:10px"><span class="row" style="gap:8px;align-items:flex-start"><span class="pill" style="background:#EAE4D2;color:var(--ink)">' + t.icon + '</span><b style="flex:1;font-size:14px">' + esc(texToText(f.label)) + '</b><span class="tiny muted">' + f.question_ids.length + '×</span></span>'
      + famQuestions(bank, f).map(q => '<div class="stack" style="gap:4px;padding-left:6px;border-left:3px solid var(--line)">' + questionBlockHTML(bank, q, { answer: !!bq().ans[q.id] }) + '<div class="row" style="gap:8px;flex-wrap:wrap">' + ansToggle(q.id) + '<button class="btn sm" data-a="pqOne" data-v="' + esc(q.id) + '">Practise</button></div></div>').join('') + '</div>';
  }).join('');
  return h;
}

// Syllabus tab, below the chapter brief.
export function boardSectionHTML(c){
  wantBank(c.s);
  if (!hasBank(c.s)) return '';
  const st = bankStatus(c.s);
  if (st === 'loading' || st === 'idle') return '<div class="card"><div class="row"><span class="spin"></span><span class="small">Loading board questions…</span></div></div>';
  if (st === 'error') return '<div class="card"><b>Board questions</b><span class="small muted">They could not be loaded. Connect to the internet once and try again; after that they work offline.</span><button class="btn sm ghost" style="align-self:flex-start" data-a="bqRetry" data-v="' + c.s + '">Try again</button></div>';
  const bank = getBank(c.s);
  const must = chapterMustdo(bank, c.id);
  const years = bank.questions.filter(q => q.chapter === c.id && typeof q.year === 'number').map(q => q.year);
  const span = years.length ? Math.min(...years) + '–' + Math.max(...years) : '2022–2026' /* shown only once a bank exists */;
  let h = '<div class="card"><div class="stack" style="gap:2px"><h2>Board questions</h2><span class="small muted">' + must.length + ' must-do · asked in ' + span + '</span></div>';
  if (must.length) h += must.map(m => mustRowHTML(bank, m)).join('');
  else h += '<span class="small muted">No must-do questions picked for this chapter. Every board question is listed below.</span>';
  h += '<div style="border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:8px">' + allBoardHTML(bank, c) + '</div></div>';
  return h;
}

// Quest sheet: up to 3 must-do families for the chapter(s), red first, skipping ones already practised.
export function questBoardHTML(chapterIds){
  const subj = [...new Set(chapterIds.map(id => CH[id] && CH[id].s))].filter(Boolean);
  if (!subj.length) return '';
  subj.forEach(wantBank);
  const bank = subj.length === 1 ? getBank(subj[0]) : null;
  if (!bank) return '';
  const list = suggestFamilies(bank, chapterIds, pyqOf().done, 3);
  if (!list.length) return '';
  return '<div class="card"><span class="secttl">Board questions for this quest</span>'
    + list.map(m => { const t = tierInfo(m.tier); return '<div class="between" style="gap:8px;align-items:flex-start"><span class="small" style="flex:1"><span class="pill" style="background:#EAE4D2;color:var(--ink)">' + t.icon + '</span> ' + esc(texToText(m.label)) + '<br><span class="tiny muted">Asked in ' + esc(askedYears(m)) + '</span></span><button class="btn sm" data-a="pqOne" data-v="' + esc(m.representative.id) + '">Practise</button></div>'; }).join('')
    + '</div>';
}

// Full-paper quests: suggest the newest paper not yet sat.
export function paperSuggestHTML(b){
  if (!b.s) return '';
  wantBank(b.s);
  const bank = getBank(b.s);
  if (!bank) return '';
  const p = newestUnsat(bank, pyqOf().papers);
  if (!p) return '<div class="card"><span class="secttl">Past papers</span><span class="small">You have sat every board paper in the bank. Repeat the ones you scored lowest on.</span></div>';
  return '<div class="card"><span class="secttl">Suggested paper</span><span class="small">The newest paper you have not sat yet: <b>' + esc(p.label) + '</b>.</span><a class="btn sm" style="align-self:flex-start;text-decoration:none" href="' + esc(paperUrl(bank, p.file)) + '" target="_blank" rel="noopener">Open paper</a></div>';
}

// Base camp: one line per subject that has a bank.
export function opsBoardHTML(){
  ensureIndex(render);
  const subs = bankSubjects();
  if (!subs.length) return '';
  subs.forEach(s => ensureBank(s, render));
  const lines = subs.map(s => {
    const bank = getBank(s);
    if (!bank) return '<span class="small muted">' + esc(SUBJ[s] ? SUBJ[s].name : s) + ' board questions: loading…</span>';
    const p = progress(bank, pyqOf());
    return '<span class="small"><b>' + esc(SUBJ[s].name) + ' board questions:</b> <span class="num">' + p.mustdoDone + ' of ' + p.mustdoTotal + '</span> must-do practised · <span class="num">' + p.papersSat + ' of ' + p.papersTotal + '</span> papers sat</span>';
  });
  return '<div class="card"><h2>Board questions</h2>' + lines.join('') + '</div>';
}

export function handleBoardClick(a, v){
  const b = bq();
  switch (a) {
    case 'bqOpen': b.open[v] = !b.open[v]; render(); return true;
    case 'bqAns': b.ans[v] = !b.ans[v]; render(); return true;
    case 'bqMore': b.more[v] = !b.more[v]; render(); return true;
    case 'bqAll': b.all = !b.all; render(); return true;
    case 'bqRetry': retryLoad('*'); retryLoad(v); render(); return true;
  }
  return false;
}
