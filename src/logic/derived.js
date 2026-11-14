import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CHAPTERS, chOf } from '../data/chapters.js';
import { RANKS } from '../data/phases.js';
import { weak } from './plan.js';
import { state, plan, answers, mistakes } from '../appstate.js';

/* --- derived numbers --- */
function blkXP(b){ return ({study:20, quick:20, pyq:20, fix:20, paper:60, half:40, review:20, sweep:15, recall:10, check:15, pre:15, rate:10})[b.t] || 0; }
function totals(){
  let xp = 0; const mins = {};
  if (plan) for (const d in plan.days) plan.days[d].b.forEach((b,i) => { if (state.done[d+'|'+i]) { xp += blkXP(b); mins[d] = (mins[d]||0) + (b.m||0); } });
  xp += answers.length*10 + mistakes.filter(m => m.fixed).length*5;
  xp += Object.values(state.ch).filter(x => x.dg).length*5;
  let ri = 0; for (let i=0; i<RANKS.length; i++) if (xp >= RANKS[i][0]) ri = i;
  return {xp, mins, rank:RANKS[ri][1], lv:ri+1, next:RANKS[ri+1]};
}
function coverage(){
  const planned = {}, doneN = {};
  if (plan) for (const d in plan.days) { const day = plan.days[d]; day.b.forEach((b,i) => {
    if (!b.c || b.t === 'sweep') return;
    (b.cs || [b.c]).forEach(id => {
      if (day.p === 'P1' && b.t === 'study') planned[id] = Math.max(planned[id]||0, b.n||1);
      if (state.done[d+'|'+i]) { const w = b.t === 'quick' ? 0.5 : (['study','pyq','fix'].includes(b.t) ? 1 : 0); doneN[id] = (doneN[id]||0) + w; }
    });
  }); }
  const per = {}; let tot = 0, totMax = 0;
  SUB_ORDER.forEach(s => {
    let got = 0, mx = 0;
    chOf(s).forEach(c => { const p = planned[c.id] || 2; const cov = Math.min(1, (doneN[c.id]||0)/p); got += c.marks*cov; mx += c.marks; });
    per[s] = {got, max: SUBJ[s].theory}; tot += got; totMax += SUBJ[s].theory;
  });
  return {per, tot, totMax};
}
function weakList(n){
  return CHAPTERS.map(c => ({c, w:weak(c,state), x:state.ch[c.id]||{}})).filter(o => o.x.dg || o.x.sr || o.x.an).sort((a,b) => b.w*b.c.marks - a.w*a.c.marks).slice(0,n);
}
function reasonFor(o){
  const x = o.x;
  if (x.an && x.an.max && x.an.got/x.an.max < 0.7) return 'Lost ' + (x.an.max - x.an.got) + ' of ' + x.an.max + ' marks in written answers';
  if (x.dg) return 'Starting check: ' + x.dg.r + ' of ' + x.dg.n + ' correct';
  if (x.sr) return 'Rated himself ' + x.sr + ' of 5';
  return '';
}
export { blkXP, totals, coverage, weakList, reasonFor };
