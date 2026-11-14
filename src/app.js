import { SUBJ } from './data/subjects.js';
import { PH } from './data/phases.js';
import { $ } from './ui/common.js';
import { renderNav } from './ui/nav.js';
import { renderToday } from './ui/today.js';
import { renderPlan } from './ui/planscreen.js';
import { renderSyl } from './ui/syllabus.js';
import { renderIntel } from './ui/target.js';
import { renderSim } from './ui/sim.js';
import { renderHangar } from './ui/hangar.js';
import { renderOps } from './ui/ops.js';
import { ov, renderOv } from './ui/overlays.js';
import { initEvents } from './ui/events.js';
import { db } from './store.js';
import { ensurePlan } from './persist.js';
import { defaultState, ui, refs, plan, setState, setPlan, setAnswers, setMistakes, setNotes, setBriefs, setBriefsLoaded, setMode, setStaleNote, setRenderer, getLocalDirty, render } from './appstate.js';

function renderAll(){
  renderNav();
  const m = $('#main');
  const fn = {today:renderToday, plan:renderPlan, syl:renderSyl, intel:renderIntel, sim:renderSim, hangar:renderHangar, ops:renderOps}[ui.tab];
  m.innerHTML = fn();
  if (ov.kind) renderOv();
}

export function initApp(){
  setRenderer(renderAll);
  initEvents();
  render();
}

// Live data: same document paths and shapes as the version that ran inside Claude.
export function startData(){
  setMode('db');
  refs.state = db.doc('fp/state'); refs.plan = db.doc('fp/plan');
  let gotS = false, gotP = false, planExists = false;
  const timer = setTimeout(() => { if (!gotS || !gotP) { setStaleNote(true); render(); } }, 10000);
  const settle = () => { if (gotS && gotP) { clearTimeout(timer); setStaleNote(false); if (!planExists && !plan) ensurePlan(); render(); } };
  refs.state.onSnapshot(snap => {
    if (snap.exists && !(snap.metadata.hasPendingWrites) && Date.now() - getLocalDirty() > 2500) { setState({...defaultState(), ...JSON.parse(JSON.stringify(snap.data()))}); }
    if (!snap.metadata.fromCache) gotS = true; settle(); render();
  }, () => { gotS = true; settle(); });
  refs.plan.onSnapshot(snap => {
    if (snap.exists) { planExists = true; if (!snap.metadata.hasPendingWrites) setPlan(JSON.parse(JSON.stringify(snap.data()))); }
    if (!snap.metadata.fromCache) gotP = true; settle(); render();
  }, () => { gotP = true; settle(); });
  db.collection('answers').orderBy('at','desc').limit(40).onSnapshot(s => { setAnswers(s.docs.map(d => ({id:d.id, ...d.data()}))); render(); }, () => {});
  db.collection('mistakes').orderBy('at','desc').limit(80).onSnapshot(s => { setMistakes(s.docs.map(d => ({id:d.id, ...d.data()}))); render(); }, () => {});
  db.collection('notes').onSnapshot(s => { const n = {}; s.docs.forEach(d => n[d.id] = d.data()); setNotes(n); render(); }, () => {});
  // the briefs are only trusted as complete once the server has answered (the local cache may be empty or partial)
  db.collection('briefs').onSnapshot(s => { const n = {}; s.docs.forEach(d => n[d.id] = d.data()); setBriefs(n); if (!s.metadata.fromCache) setBriefsLoaded(true); render(); }, () => { setBriefsLoaded(true); });
}
