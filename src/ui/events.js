import { CH, chOf } from '../data/chapters.js';
import { clamp } from '../logic/dates.js';
import { $, todayStr, toast } from './common.js';
import { blkXP, weakList } from '../logic/derived.js';
import { checkGroups } from './sim.js';
import { buildNote } from './hangar.js';
import { ov, openOv, closeOv, renderOv } from './overlays.js';
import { startQuiz, loadQuizItem, quizPick, quizItemDone, checkItems, startRecall } from './quiz.js';
import { openAns, ansGenerate, shrink, ansGrade } from './answer.js';
import { state, plan, mistakes, canWrite, ui, imgLimits, aiReady, touch, render } from '../appstate.js';
import { saveState, addDoc, setDoc, rebuild } from '../persist.js';
import { retryBrief, regenerate, buildAllMissing, stopBuildAll } from '../briefs.js';
import { exportAll } from '../export.js';
import { signOutUser } from '../auth.js';
import { handleBoardClick } from './board.js';
import { handlePyqClick, resumePyq } from './pyq.js';

function initEvents(){
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-a]'); if (!el) { if (ev.target.id === 'ov') closeOv(); return; }
  const a = el.dataset.a, v = el.dataset.v;
  if (a === 'signOut') { signOutUser(); return; }
  if (handleBoardClick(a, v) || handlePyqClick(a, v)) return;
  switch (a) {
    case 'tab': ui.tab = v; ui.noteCh = null; ui.sylCh = null; ui.confirmRebuild = false; window.scrollTo(0,0); render(); break;
    case 'energy': if (!canWrite) break; state.energy[todayStr()] = state.energy[todayStr()] === v ? '' : v; touch(); saveState(); render(); break;
    case 'toggle': { if (!canWrite) break; const k = el.dataset.d+'|'+el.dataset.i; if (state.done[k]) delete state.done[k]; else { state.done[k] = 1; ui.pop = k; setTimeout(() => { if (ui.pop === k) ui.pop = null; }, 600); toast('+'+blkXP(plan.days[el.dataset.d].b[+el.dataset.i])+' XP · quest complete'); } touch(); saveState(); render(); break; }
    case 'focus': openOv('focus', {d:el.dataset.d, i:+el.dataset.i, left:null, st:{}}); break;
    case 'closeOv': if (ov.kind === 'ans' && ov.fromPyq) { resumePyq(); break; } closeOv(); break;
    case 'step': ov.st[v] = !ov.st[v]; renderOv(); break;
    case 'timer': {
      const b = plan.days[ov.d].b[ov.i]; const total = (b.m||50)*60;
      if (ov.timer) { clearInterval(ov.timer); ov.timer = null; }
      else { if (ov.left == null) ov.left = total; ov.breakNow = false; ov.timer = setInterval(() => { if (ov.kind !== 'focus') return; ov.left = Math.max(0, ov.left-1); if (ov.left === 0) { clearInterval(ov.timer); ov.timer = null; ov.breakNow = true; toast('Quest time is up. Take your break.'); } renderOv(); }, 1000); }
      renderOv(); break; }
    case 'doneBlk': { const k = ov.d+'|'+ov.i; if (!state.done[k]) { state.done[k] = 1; toast('+'+blkXP(plan.days[ov.d].b[ov.i])+' XP · quest complete'); touch(); saveState(); } closeOv(); break; }
    case 'checkFromBlk': { const b = plan.days[ov.d].b[ov.i]; if (!aiReady()) { toast('You are offline. Connect to take the check.'); break; } const items = checkItems(b.cs.filter(id => !(state.ch[id] && state.ch[id].dg)).length ? b.cs.filter(id => b.grp || !(state.ch[id] && state.ch[id].dg)) : b.cs, b.grp, b.s); closeOv(); startQuiz(items, 'Starting check', 'check'); break; }
    case 'recallFromBlk': { const b = plan.days[ov.d].b[ov.i]; closeOv(); startRecall(b.cs); break; }
    case 'goRate': closeOv(); ui.tab = 'sim'; render(); break;
    case 'noteFromBlk': { const b = plan.days[ov.d].b[ov.i]; const id = b.c || (b.cs && b.cs[0]); closeOv(); ui.tab = 'hangar'; ui.noteCh = id; ui.noteTab = 'map'; ui.noteSub = CH[id].s; window.scrollTo(0,0); render(); break; }
    case 'ansFromBlk': { const b = plan.days[ov.d].b[ov.i]; closeOv(); openAns({s:b.s, c:b.c || (b.cs && b.cs[0])}); break; }
    case 'bonus': { if (!aiReady()) { toast('You are offline. Quizzes need an internet connection.'); break; } startRecall(weakList(4).map(o => o.c.id)); break; }
    case 'rebuild': rebuild(); break;
    case 'rebuildAsk': ui.confirmRebuild = true; render(); break;
    case 'rebuildNo': ui.confirmRebuild = false; render(); break;
    case 'rebuildYes': rebuild(); break;
    case 'setB': state.B = +v; touch(); saveState(); render(); toast('Saved. Rebuild the plan to apply it.'); break;
    case 'addMark': { const d = $('#mkDate').value, ty = $('#mkType').value; if (!d) { toast('Pick a date first.'); break; } state.marked[d] = ty; touch(); saveState(); render(); toast('Added. Rebuild the plan to apply it.'); break; }
    case 'delMark': delete state.marked[v]; touch(); saveState(); render(); break;
    case 'simSub': ui.simSub = v; render(); break;
    case 'rate': { if (!canWrite) break; const id = el.dataset.c; state.ch[id] = {...(state.ch[id]||{}), sr:+v}; touch(); saveState(); render(); break; }
    case 'runCheck': { if (!aiReady()) break; const g = checkGroups(ui.simSub).find(x => x.key === v); const todo = g.grp ? g.cs : g.cs.filter(id => !(state.ch[id] && state.ch[id].dg)); startQuiz(checkItems(todo.length ? todo : g.cs, g.grp, ui.simSub).map(it => ({...it, label: g.grp ? g.name : it.label})), 'Starting check', 'check'); break; }
    case 'fixM': { const m = mistakes.find(x => x.id === v); if (m) { m.fixed = true; const {id, ...rest} = m; setDoc('mistakes/'+v, rest); render(); toast('+5 XP · mistake fixed'); } break; }
    case 'ansOpen': openAns(); break;
    case 'aMk': ov.mk = +v; renderOv(); break;
    case 'aGen': ov.own = false; ansGenerate(); break;
    case 'aOwnGo': ov.own = true; ov.qtext = ($('#aOwn').value || '').trim(); ov.scheme = null; ov.step = 'write'; ov.err = null; renderOv(); break;
    case 'aPhoto': $('#photoIn').click(); break;
    case 'aClear': ov.photos = []; renderOv(); break;
    case 'aGrade': ansGrade(); break;
    case 'aRetake': ov.photos = []; ov.step = 'write'; renderOv(); break;
    case 'aModel': ov.showModel = true; renderOv(); break;
    case 'aAgain': ov.avoid = ov.qtext; ov.photos = []; ov.res = null; ov.showModel = false; ov.qtext = ''; ansGenerate(); break;
    case 'quizNext': ov.qi++; ov.picked = null; if (ov.qi >= ov.qs.length) quizItemDone(); renderOv(); break;
    case 'quizNextItem': loadQuizItem(ov.ii + 1); break;
    case 'quizRetry': loadQuizItem(ov.ii); break;
    case 'pick': quizPick(+v); break;
    case 'noteSub': ui.noteSub = v; render(); break;
    case 'sylSub': ui.sylSub = v; render(); break;
    case 'sylOpen': ui.sylCh = v; ui.noteTab = 'map'; window.scrollTo(0,0); render(); break;
    case 'sylBack': ui.sylCh = null; render(); break;
    case 'openNote': ui.noteCh = v; ui.noteTab = 'map'; ui.noteErr = null; window.scrollTo(0,0); render(); break;
    case 'closeNote': ui.noteCh = null; render(); break;
    case 'noteTab': ui.noteTab = v; render(); break;
    case 'buildNote': if (!ui.loadNote) buildNote(v); break;
    case 'exportAll': exportAll(); break;
    case 'briefRetry': retryBrief(v); break;
    case 'briefRegenAsk': ui.confirmRegen = v; render(); break;
    case 'briefRegenNo': ui.confirmRegen = null; render(); break;
    case 'briefRegenYes': regenerate(v); break;
    case 'buildAll': buildAllMissing(); break;
    case 'buildAllStop': stopBuildAll(); break;
    case 'openBrief': closeOv(); ui.tab = 'syl'; ui.sylCh = v; ui.sylSub = CH[v].s; ui.noteTab = 'map'; window.scrollTo(0,0); render(); break;
    case 'report': { const t = ($('#repTxt').value || '').trim(); if (!t) { toast('Describe the problem first.'); break; } if (canWrite) await addDoc('reports', {ch:v, text:t.slice(0,1000), d:todayStr(), at:Date.now()}); $('#repTxt').value = ''; toast('Thanks. Reported for review.'); break; }
  }
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.a === 'pre') { const v = el.value === '' ? null : clamp(Number(el.value), 0, 100); if (v === null) delete state.pre[el.dataset.v]; else state.pre[el.dataset.v] = v; touch(); saveState(); toast('Saved. Rebuild the plan to use it.'); }
  if (el.dataset.a === 'aSub') { ov.s = el.value; ov.c = chOf(ov.s).filter(c => c.kind!=='read')[0].id; renderOv(); }
  if (el.dataset.a === 'aCh') { ov.c = el.value; }
});
$('#photoIn').addEventListener('change', async ev => {
  const files = [...ev.target.files]; ev.target.value = '';
  const max = imgLimits.maxCount;
  for (const f of files) { if (ov.photos.length >= max) { toast('Up to '+max+' photos per answer.'); break; } ov.photos.push(await shrink(f)); }
  renderOv();
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && ov.kind) closeOv(); });
}
export { initEvents };
