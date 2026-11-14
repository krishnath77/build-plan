"use strict";
import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CHAPTERS, CH, chOf, UNITS } from '../data/chapters.js';
import { PH, PLAN_END } from '../data/phases.js';
import { addDays, diffDays, dow, range, clamp } from './dates.js';

const phaseOf = d => PH.find(p => d >= p.from && d <= p.to) || null;
const phase = id => PH.find(p => p.id === id);
const DEFAULT_B = 4; // quests on a full day; Tejas is in school until January
const HEAVY = SUB_ORDER.filter(s => SUBJ[s].heavy), LIGHT = SUB_ORDER.filter(s => !SUBJ[s].heavy);
function weak(c, st){
  const x = (st.ch && st.ch[c.id]) || {};
  let sum=0, w=0;
  if (x.dg && x.dg.n) { sum += 0.5*(1 - x.dg.r/x.dg.n); w += 0.5; }
  if (x.sr) { sum += 0.25*((5 - x.sr)/4); w += 0.25; }
  if (x.an && x.an.max > 0) { sum += 0.35*(1 - x.an.got/x.an.max); w += 0.35; }
  return w ? sum/w : 0.5;
}
function preFactor(s, st){ const p = st.pre && st.pre[s]; if (p === undefined || p === null || p === '') return 1; return clamp(1 + (75 - Number(p))/100, 0.85, 1.3); }
function prio(c, st){ return c.marks * (0.7 + 0.3*c.d) * (0.5 + weak(c, st)) * SUBJ[c.s].gap * preFactor(c.s, st); }
function uprio(u, st){ return u.cs.reduce((a,id) => a + prio(CH[id], st), 0); }

function alloc(items, cap, minEach){
  const res = {}; if (!items.length || cap <= 0) return res;
  const mins = Math.min(minEach, Math.floor(cap/items.length));
  const tot = items.reduce((a,i) => a + i.w, 0) || 1;
  const left = cap - mins*items.length; const fr = [];
  items.forEach(i => { const raw = left*i.w/tot; const f = Math.floor(raw); res[i.id] = mins + f; fr.push([raw - f, i.id]); });
  let used = Object.values(res).reduce((a,b) => a+b, 0);
  fr.sort((a,b) => b[0]-a[0]); let j = 0;
  while (used < cap && fr.length) { res[fr[j % fr.length][1]]++; used++; j++; }
  return res;
}
function dayType(d, st){
  const mk = st.marked && st.marked[d];
  if (mk === 'off') return 'none';
  if (mk === 'practical' || mk === 'school' || mk === 'preboard') return 'half';
  if (dow(d) === 0) return 'half';
  return 'full';
}
function slotsFor(type, B){ if (type === 'none') return {h:0,l:0,r:0}; if (type === 'half') return {h:2,l:0,r:1}; return {h:Math.max(1, B-2), l:1, r:1}; }
function fixChapter(s, i, st){
  const list = chOf(s).slice().sort((a,b) => weak(b,st)*b.marks - weak(a,st)*a.marks);
  const n = Math.min(5, list.length); return list[((i-1) % n + n) % n].id;
}
function topN(s, n, off, st){
  const list = chOf(s).slice().sort((a,b) => prio(b,st) - prio(a,st));
  const out = []; for (let i=0; i<n && i<list.length; i++) out.push(list[(off*n + i) % list.length].id);
  return out;
}

function fillStudy(dlist, ph, nmap, kstart, tt, B, st, days){
  const q = {}; SUB_ORDER.forEach(s => q[s] = []);
  const us = UNITS.filter(u => nmap[u.id] > 0).sort((a,b) => uprio(b,st) - uprio(a,st));
  us.forEach(u => { const n = nmap[u.id]; const k0 = kstart[u.id] || 0; for (let i=1; i<=n; i++) { const bl = {t:tt, s:u.s, c:u.id, k:k0+i, n:k0+n, m:50}; if (u.cs.length > 1) bl.cs = u.cs.slice(); q[u.s].push(bl); } });
  const init = {}; SUB_ORDER.forEach(s => init[s] = q[s].length || 1);
  const heavyS = HEAVY, lightS = LIGHT;
  let fixI = 0;
  const fixPool = CHAPTERS.filter(c => SUBJ[c.s].heavy).sort((a,b) => weak(b,st)*b.marks - weak(a,st)*a.marks).slice(0,12);
  dlist.forEach(d => {
    const type = dayType(d, st); const sl = slotsFor(type, B); const b = [];
    let h = sl.h; const picks = [];
    const order = heavyS.filter(s => q[s].length).sort((a,b2) => q[b2].length/init[b2] - q[a].length/init[a]);
    let guard = 0;
    while (h > 0 && heavyS.some(s => q[s].length) && guard < 10) {
      for (const s of order) { if (h <= 0) break; const avail = q[s].length - (picks.find(p => p[0]===s)||[0,0])[1]; if (avail <= 0) continue; const take = Math.min(2, h, avail); const e = picks.find(p => p[0]===s); if (e) e[1] += take; else picks.push([s, take]); h -= take; }
      guard++;
    }
    picks.sort((a,b2) => SUBJ[b2[0]].hard - SUBJ[a[0]].hard);
    picks.forEach(([s,n]) => { for (let i=0; i<n; i++) b.push(q[s].shift()); });
    let l = sl.l;
    while (l > 0) {
      const ls = lightS.filter(s => q[s].length).sort((a,b2) => q[b2].length/init[b2] - q[a].length/init[a]);
      if (ls.length) { b.push(q[ls[0]].shift()); l--; } else { h++; l--; }
    }
    while (h > 0) {
      const hs = heavyS.filter(s => q[s].length);
      const ls2 = lightS.filter(s => q[s].length); // light units that did not fit their own slots are taken here, not dropped
      if (hs.length) b.push(q[hs[0]].shift());
      else if (ls2.length) b.push(q[ls2.sort((a,b2) => q[b2].length - q[a].length)[0]].shift());
      else { const c = fixPool[fixI++ % fixPool.length]; b.push({t:'fix', s:c.s, c:c.id, m:50}); }
      h--;
    }
    for (let i=0; i<sl.r; i++) b.push({t:'recall', m:30});
    days[d] = {p:ph, h:type, b};
  });
  // anything left over (capacity shortfall) is appended to the last full days, one per day
  const leftovers = SUB_ORDER.flatMap(s => q[s]);
  if (leftovers.length) {
    const full = dlist.filter(d => days[d].h === 'full').reverse();
    leftovers.forEach((x, i) => { const d = full[i % Math.max(1, full.length)]; if (d) days[d].b.splice(days[d].b.length-1, 0, x); });
  }
}
function capOf(dlist, st, B){ let h=0,l=0; dlist.forEach(d => { const sl = slotsFor(dayType(d,st), B); h += sl.h; l += sl.l; }); return {h,l}; }

// Paper practice (P2): how often each subject is picked, and the fast-track (P3) subject rotation (10 days).
// Exam order is Maths, Science, English, French, Social Science, so the first papers get the most practice.
const PAPER_WEIGHT = {math:1.3, sci:1.2, sst:1.0, eng:0.8, fr:0.7};
const FAST_ROT = ['math','sci','sst','math','sci','eng','math','sci','sst','fr'];

// Every unit must get at least one revision block. When quest slots are tight (a low daily load, or special days),
// the allocation can leave a unit at zero: give it one block and take the same number from the heaviest-booked heavy units.
function ensureCoverage(nmap, units, heavyUnits, st){
  const missing = units.filter(u => !(nmap[u.id] > 0));
  if (!missing.length) return nmap;
  missing.forEach(u => { nmap[u.id] = 1; });
  const donors = heavyUnits.slice().sort((a,b) => (nmap[b.id]||0) - (nmap[a.id]||0) || uprio(a,st) - uprio(b,st));
  let need = missing.length;
  while (need > 0) {
    const d = donors.find(u => nmap[u.id] > 1 && !missing.includes(u));
    if (!d) break;
    nmap[d.id]--; need--;
    donors.sort((a,b) => (nmap[b.id]||0) - (nmap[a.id]||0) || uprio(a,st) - uprio(b,st));
  }
  return nmap;
}

// Starting check blocks: [{day, b}] with day = 0, 1 or 2 (which CHK day). Built from the data, so every checkable chapter is covered.
function checkBlocks(){
  const ok = id => { const k = CH[id].kind; return k !== 'read' && k !== 'write'; };
  const q = (s, cs, m, day, grp) => ({day, b:{t:'check', s, ...(grp ? {grp:1} : {}), cs, m}});
  const list = [
    q('math', ['m1','m2','m3','m4','m5','m6','m7'], 40, 0), q('math', ['m8','m9','m10','m11','m12','m13','m14'], 40, 0),
    q('sci', ['s1','s2','s3','s4'], 30, 0), q('sci', ['s5','s6','s7','s8','s13'], 35, 0), q('sci', ['s9','s10','s11','s12'], 35, 0),
    q('sst', ['h1','h2','h3','h4'], 35, 1), q('sst', ['g1','g2','g3','g4','g5','g6','mp'], 35, 1), q('sst', ['pl1','pl2','pl3','pl4','pl5'], 35, 1),
    q('eng', ['ff1','ff2','ff3','ff4','ff5','ff6','ff7','ff8','ff9'], 15, 1, 1), q('eng', ['fp1','fp2','fp3','fp4','fp5','fp6','fp7','fp8','fp9','fp10'], 12, 1, 1),
    q('sst', ['ec1','ec2','ec3','ec4'], 30, 2), q('eng', ['fw1','fw2','fw3','fw4','fw5','fw6','fw7','fw8','fw9'], 12, 2, 1),
    q('fr', ['fc1','fc2','fc3','fc4','fc5','fc6','fc7','fc8'], 12, 2, 1),
    {day:2, b:{t:'rate', m:15}}
  ];
  list.forEach(x => { if (x.b.cs) x.b.cs = x.b.cs.filter(ok); });
  return list;
}

function buildPlan(st, old, start){
  const days = {};
  if (old && old.days) for (const d in old.days) if (d < start) days[d] = old.days[d];
  const B = st.B || DEFAULT_B;
  const from = start < PH[0].from ? PH[0].from : start;
  const all = from <= PLAN_END ? range(from, PLAN_END) : [];
  const byPh = {}; all.forEach(d => { const p = phaseOf(d); if (p) (byPh[p.id] = byPh[p.id] || []).push(d); });
  // Starting check: every checkable chapter once, spread over the CHK days (reading and writing items are rated, not quizzed).
  // With fewer than 3 days left (a late go-live) the blocks are folded into the days that remain.
  const chkDays = byPh.CHK || [];
  const chkPlan = {}; chkDays.forEach(d => { chkPlan[d] = []; });
  if (chkDays.length) checkBlocks().forEach(x => chkPlan[chkDays[Math.min(chkDays.length - 1, Math.floor(x.day * chkDays.length / 3))]].push(x.b));
  chkDays.forEach(d => { days[d] = {p:'CHK', h:'full', b:chkPlan[d].map(x => ({...x}))}; });
  // P1 revision: whole syllabus, marks-weighted
  if (byPh.P1) {
    const cap = capOf(byPh.P1, st, B);
    const doneCnt = {};
    if (old && old.days) for (const d in old.days) { if (d >= start || old.days[d].p !== 'P1') continue; old.days[d].b.forEach((x,i) => { if (x.t === 'study' && st.done && st.done[d+'|'+i]) doneCnt[x.c] = (doneCnt[x.c]||0) + 1; }); }
    const heavyC = UNITS.filter(u => SUBJ[u.s].heavy), lightC = UNITS.filter(u => !SUBJ[u.s].heavy);
    let nmap;
    if (start <= phase('P1').from) {
      nmap = {...alloc(heavyC.map(c => ({id:c.id, w:uprio(c,st)})), cap.h, 2), ...alloc(lightC.map(c => ({id:c.id, w:uprio(c,st)})), cap.l, 1)};
      ensureCoverage(nmap, heavyC.concat(lightC), heavyC, st);
    } else {
      const fullCap = capOf(range(phase('P1').from, phase('P1').to), st, B);
      const nFull = {...alloc(heavyC.map(c => ({id:c.id, w:uprio(c,st)})), fullCap.h, 2), ...alloc(lightC.map(c => ({id:c.id, w:uprio(c,st)})), fullCap.l, 1)};
      const remW = c => { const n = nFull[c.id] || 0; const r = Math.max(0, n - (doneCnt[c.id]||0)); return n ? uprio(c,st) * (r/n) : 0; };
      const hi = heavyC.map(c => ({id:c.id, w:remW(c)})).filter(i => i.w > 0);
      const li = lightC.map(c => ({id:c.id, w:remW(c)})).filter(i => i.w > 0);
      nmap = {...alloc(hi, cap.h, 1), ...alloc(li, cap.l, 1)};
    }
    fillStudy(byPh.P1, 'P1', nmap, doneCnt, 'study', B, st, days);
  }
  // P2 paper practice
  if (byPh.P2) {
    const W = PAPER_WEIGHT;
    const counts = Object.fromEntries(SUB_ORDER.map(s => [s, 0]));
    if (old && old.days) for (const d in old.days) { if (d >= start || old.days[d].p !== 'P2') continue; old.days[d].b.forEach(x => { if (x.t === 'paper') counts[x.s] = Math.max(counts[x.s], x.x); }); }
    let last = null, alt = 0; const paperDays = [], pyqDays = [];
    const before = range(phase('P2').from, addDays(byPh.P2[0], -1)).filter(d => dayType(d,st) === 'full').length;
    alt = before;
    byPh.P2.forEach(d => { const type = dayType(d, st); if (type === 'none') { days[d] = {p:'P2', h:type, b:[]}; return; } if (type === 'full') { if (alt % 2 === 0) paperDays.push(d); else pyqDays.push(d); alt++; } else pyqDays.push(d); });
    paperDays.forEach(d => {
      let best = null, bv = -1;
      SUB_ORDER.forEach(s => { if (s === last) return; const v = W[s]/(counts[s]+1); if (v > bv) { bv = v; best = s; } });
      counts[best]++; last = best;
      days[d] = {p:'P2', h:'full', b:[{t:'paper', s:best, x:counts[best], m:180}, {t:'review', s:best, x:counts[best], m:50}, {t:'fix', s:best, c:fixChapter(best, counts[best], st), m:50}, {t:'recall', m:30}]};
    });
    const cap = capOf(pyqDays, st, B);
    const nmap = {...alloc(UNITS.filter(u => SUBJ[u.s].heavy).map(u => ({id:u.id, w:uprio(u,st)})), cap.h, 1), ...alloc(UNITS.filter(u => !SUBJ[u.s].heavy).map(u => ({id:u.id, w:uprio(u,st)})), cap.l, 0)};
    fillStudy(pyqDays, 'P2', nmap, {}, 'pyq', B, st, days);
  }
  // P3 fast-track
  const ROT = FAST_ROT;
  (byPh.P3 || []).forEach(d => {
    const type = dayType(d, st); const idx = diffDays(phase('P3').from, d); const s = ROT[idx % ROT.length];
    if (type === 'none') { days[d] = {p:'P3', h:type, b:[]}; return; }
    const ls = SUBJ[s].heavy ? LIGHT[idx % LIGHT.length] : HEAVY[idx % HEAVY.length];
    const b = type === 'full'
      ? [{t:'half', s, m:90}, {t:'sweep', s, cs:topN(s,3,idx,st), m:50}, {t:'fix', s, c:fixChapter(s, idx+1, st), m:50}, {t:'sweep', s:ls, cs:topN(ls,3,idx,st), m:40}, {t:'recall', m:30}]
      : [{t:'sweep', s, cs:topN(s,3,idx,st), m:50}, {t:'recall', m:30}];
    days[d] = {p:'P3', h:type, b};
  });
  (byPh.FW || []).forEach(d => { days[d] = {p:'FW', h:'full', b:[{t:'final', m:0}]}; });
  // spaced recall: 1, 3 and 7 days back
  Object.keys(days).sort().forEach(d => {
    if (d < start) return;
    days[d].b.forEach(bl => {
      if (bl.t !== 'recall') return;
      const cs = [];
      [1,3,7].forEach(off => { const pd = days[addDays(d,-off)]; if (!pd) return; pd.b.forEach(x => { if (['study','pyq','fix','quick'].includes(x.t) && x.c) (x.cs || [x.c]).forEach(c => { if (!cs.includes(c)) cs.push(c); }); if (x.t === 'sweep' && x.cs) x.cs.forEach(c => { if (!cs.includes(c)) cs.push(c); }); }); });
      bl.cs = cs.slice(0,4);
    });
  });
  return {v:1, start, B, days};
}
export { phase, checkBlocks, ensureCoverage, phaseOf, weak, preFactor, prio, uprio, alloc, dayType, slotsFor, fixChapter, topN, fillStudy, capOf, buildPlan };
