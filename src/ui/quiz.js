import { SUBJ } from '../data/subjects.js';
import { CH } from '../data/chapters.js';
import { topN } from '../logic/plan.js';
import { SUB_ORDER } from '../data/subjects.js';
import { esc, todayStr, ico, toast } from './common.js';
import { weakList } from '../logic/derived.js';
import { ov, openOv, closeOv, renderOv } from './overlays.js';
import { state, plan, mistakes, canWrite, aiReady, touch } from '../appstate.js';
import { saveState, addDoc } from '../persist.js';
import { askJSON, errCopy } from '../ai.js';

/* --- quiz runner (starting check, recall) --- */
function startQuiz(items, title, src){
  openOv('quiz', {title, items, src, ii:0, qs:null, qi:0, picked:null, score:0, loading:true, err:null, pre:{}, sumR:[]});
  loadQuizItem(0);
}
function quizPrompt(item){
  const chs = item.cs.map(id => CH[id]);
  const subj = SUBJ[chs[0].s].name;
  const isEng = chs[0].s === 'eng', isFr = chs[0].s === 'fr', isNum = ['math','sci'].includes(chs[0].s);
  const scope = chs.length === 1 ? 'the chapter "'+chs[0].name+'"' : 'these chapters: '+chs.map(c => '"'+c.name+'"').join(', ');
  const extra = item.mistakes && item.mistakes.length ? '\nAlso include 2 questions that re-test these earlier mistakes:\n' + item.mistakes.map(m => '- '+m.q+' (right idea: '+m.a+')').join('\n') : '';
  return 'You are setting a quick check for a CBSE Class 10 student preparing for the 2027 board exam (2026-27 syllabus, current NCERT books). Subject: '+subj+'. Cover '+scope+'.\n'
    + 'Write exactly '+item.n+' multiple-choice questions at Class 10 board-exam level that sample the most important and most frequently examined ideas'+(chs.length>1?', spread across the chapters':'')+'. '
    + (isEng ? 'Ask about content, themes, characters, message and poetic devices; do not quote more than a few words of any text. ' : isFr ? 'Write the questions and options in simple French (A2 level) with a short English translation of each question in brackets. Ask about vocabulary, the lesson content and French culture. ' : isNum ? 'Mix conceptual questions with short numerical or application questions, and include one assertion-reason question in CBSE format. ' : 'Mix factual, conceptual and application questions in the style of the CBSE board paper. ')
    + 'Each question has exactly 4 options and exactly one correct answer; check every answer twice. Keep questions under 60 words, plain text, Unicode symbols (², √, π, →, Ω, °), no LaTeX.' + extra + '\n'
    + 'Reply with only JSON: {"questions":[{"chapter":"exact chapter name from the list","q":"...","options":["...","...","...","..."],"answer":0,"why":"one short sentence"}]}';
}
function fetchQuiz(item){
  const p = askJSON('quiz', quizPrompt(item));
  return p.then(r => {
    const qs = (r && Array.isArray(r.questions) ? r.questions : []).filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    if (!qs.length) throw {code:'invalid_json'};
    return qs;
  });
}
async function loadQuizItem(ii){
  ov.ii = ii; ov.qi = 0; ov.picked = null; ov.score = 0; ov.loading = true; ov.err = null; renderOv();
  const item = ov.items[ii];
  try {
    const p = ov.pre[ii] || fetchQuiz(item); ov.pre[ii] = p;
    const qs = await p;
    if (ov.kind !== 'quiz' || ov.ii !== ii) return;
    ov.qs = qs; ov.loading = false;
    if (ov.items[ii+1] && !ov.pre[ii+1]) { ov.pre[ii+1] = fetchQuiz(ov.items[ii+1]); ov.pre[ii+1].catch(() => {}); }
  } catch (e) { if (ov.kind !== 'quiz') return; delete ov.pre[ii]; ov.loading = false; ov.err = errCopy(e); }
  renderOv();
}
function ovQuiz(){
  const item = ov.items[ov.ii];
  let h = '<div class="sheet" role="dialog" aria-modal="true" aria-label="'+esc(ov.title)+'"><div class="between"><button class="iconbtn" data-a="closeOv" aria-label="Close">'+ico('x',18,2.4)+'</button><span class="small muted">'+esc(ov.title)+(ov.items.length>1?' · '+(ov.ii+1)+' of '+ov.items.length:'')+'</span><span style="width:44px"></span></div>';
  h += '<h2>'+esc(item.label)+'</h2>';
  if (ov.loading) return h + '<div class="card"><div class="row"><span class="spin"></span><span class="small">Your questions are being written. First set takes up to a minute; the next ones are prepared while you answer.</span></div></div></div>';
  if (ov.err) return h + '<div class="card"><span class="small">'+esc(ov.err)+'</span><button class="btn" data-a="quizRetry">Try again</button></div></div>';
  if (ov.qi >= ov.qs.length) {
    h += '<div class="card" style="align-items:center;text-align:center"><span class="num" style="font-family:var(--display);font-size:44px;font-weight:700">'+ov.score+'<span style="font-size:22px;color:var(--muted)"> / '+ov.qs.length+'</span></span><span class="small muted">'+(ov.score/ov.qs.length >= 0.8 ? 'Solid. This one needs less time.' : ov.score/ov.qs.length >= 0.5 ? 'Decent base. Revision will firm it up.' : 'Good to know now. The plan gives this extra time.')+'</span></div>';
    h += ov.ii + 1 < ov.items.length ? '<button class="btn" data-a="quizNextItem">Next: '+esc(ov.items[ov.ii+1].label)+'</button><button class="btn ghost" data-a="closeOv">Stop here for now</button>' : '<button class="btn" data-a="closeOv">Finish</button>';
    return h + '</div>';
  }
  const q = ov.qs[ov.qi];
  h += '<span class="small muted">Question '+(ov.qi+1)+' of '+ov.qs.length+(q.chapter && item.cs.length>1?' · '+esc(q.chapter):'')+'</span><div class="card"><span style="font-size:16px;white-space:pre-line">'+esc(q.q)+'</span></div><div class="stack" style="gap:8px">'
    + q.options.map((o,k) => { let cls = 'opt'; if (ov.picked != null) { if (k === q.answer) cls += ' right'; else if (k === ov.picked) cls += ' wrong'; } return '<button class="'+cls+'" data-a="pick" data-v="'+k+'" '+(ov.picked!=null?'disabled':'')+'><b>'+'ABCD'[k]+'.</b> '+esc(o)+'</button>'; }).join('') + '</div>';
  if (ov.picked != null) h += '<div class="card" style="background:'+(ov.picked===q.answer?'var(--okBg)':'var(--warnBg)')+'"><b class="small">'+(ov.picked===q.answer?'Correct.':'Not this time. The answer is '+'ABCD'[q.answer]+'.')+'</b><span class="small">'+esc(q.why||'')+'</span></div><button class="btn" data-a="quizNext">'+(ov.qi+1<ov.qs.length?'Next question':'See score')+'</button>';
  return h + '</div>';
}
function quizPick(k){
  const q = ov.qs[ov.qi]; ov.picked = k; const right = k === q.answer; if (right) ov.score++;
  const item = ov.items[ov.ii];
  if (!right) { const chId = matchCh(q.chapter, item.cs); addDoc('mistakes', {ch:chId, q:q.q, a:q.options[q.answer] + (q.why ? ' — ' + q.why : ''), d:todayStr(), at:Date.now(), src:'quiz', fixed:false}); }
  if (!item.res) item.res = {}; const chId = matchCh(q.chapter, item.cs); item.res[chId] = item.res[chId] || {r:0,n:0}; item.res[chId].n++; if (right) item.res[chId].r++;
  renderOv();
}
function matchCh(name, cs){ if (cs.length === 1) return cs[0]; const n = String(name||'').toLowerCase(); const hit = cs.find(id => CH[id].name.toLowerCase() === n) || cs.find(id => n && (CH[id].name.toLowerCase().includes(n) || n.includes(CH[id].name.toLowerCase()))); return hit || cs[0]; }
function quizItemDone(){
  const item = ov.items[ov.ii];
  if (ov.src === 'check' && canWrite) {
    if (item.grp) { item.cs.forEach(id => { state.ch[id] = {...(state.ch[id]||{}), dg:{r:ov.score, n:ov.qs.length, d:todayStr()}}; }); }
    else { const res = item.res || {}; item.cs.forEach(id => { const x = res[id]; if (x) state.ch[id] = {...(state.ch[id]||{}), dg:{r:x.r, n:x.n, d:todayStr()}}; }); }
    touch(); saveState();
  }
}
function checkItems(cs, grp, s){
  if (grp) return [{cs, n: cs.length > 6 ? 8 : 6, grp:1, label: s === 'eng' ? 'English group check' : 'Group check'}];
  return cs.map(id => ({cs:[id], n:5, label:CH[id].name}));
}
function startRecall(cs){
  if (!aiReady()) { toast('You are offline. Quizzes need an internet connection.'); return; }
  let list = (cs || []).filter(Boolean);
  if (!list.length) list = weakList(3).map(o => o.c.id);
  if (!list.length) list = topN('math',1,0,state).concat(topN('sci',1,0,state), topN('sst',1,0,state));
  const ms = mistakes.filter(m => !m.fixed && list.includes(m.ch)).slice(0,3);
  startQuiz([{cs:list, n:8, label:'Recall: '+list.map(id => CH[id].name).join(', '), mistakes:ms}], 'Quick recall', 'recall');
}
export { startQuiz, quizPrompt, fetchQuiz, loadQuizItem, ovQuiz, quizPick, matchCh, quizItemDone, checkItems, startRecall };
