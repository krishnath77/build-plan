import { CHAPTERS } from './data/chapters.js';
import { PH } from './data/phases.js';
import { addDays } from './logic/dates.js';
import { buildPlan } from './logic/plan.js';
import { todayStr, fmt, toast } from './ui/common.js';
import { db } from './store.js';
import { state, plan, refs, mode, canWrite, setPlan, setCanWrite, touch, render, ui } from './appstate.js';

/* --- saving: one write at a time per document --- */
function makeWriter(getRef){
  let busy = false, pending = null, timer = null;
  async function flush(){
    if (busy || !pending) return; busy = true; const data = pending; pending = null;
    try { await getRef().set(data); }
    catch (e) {
      if (e && e.code === 'permission-denied') { setCanWrite(false); render(); }
      else if (e && e.code === 'resource-exhausted') toast('Storage is full.');
      else { pending = pending || data; setTimeout(() => { busy = false; flush(); }, 1500 + Math.random()*1000); return; }
    }
    busy = false; if (pending) flush();
  }
  return function(data){
    if (mode !== 'db' || !canWrite) return;
    pending = JSON.parse(JSON.stringify(data)); clearTimeout(timer); timer = setTimeout(flush, 500);
  };
}
const writeState = makeWriter(() => refs.state);
const writePlan = makeWriter(() => refs.plan);
export const saveState = () => writeState(state);
export const savePlan = () => writePlan(plan);

export async function addDoc(coll, data){
  if (mode === 'db' && canWrite) {
    try { await db.collection(coll).add(data); }
    catch (e) { if (e && e.code === 'resource-exhausted') toast('Storage is full.'); }
  }
}
export async function setDoc(path, data){
  if (mode === 'db' && canWrite) { try { await db.doc(path).set(data); } catch(e){} }
}

export function ensurePlan(){
  if (plan) return;
  if (!canWrite && mode === 'db') return;
  const t = todayStr();
  setPlan(buildPlan(state, null, t < PH[0].from ? PH[0].from : t));
  savePlan();
}
export const CHECK_IDS = () => CHAPTERS.filter(c => c.kind !== 'read' && c.kind !== 'write').map(c => c.id);
export function rebuild(){
  const t = todayStr();
  const doneToday = plan && plan.days[t] && plan.days[t].b.some((x,i) => state.done[t+'|'+i]);
  const start = doneToday ? addDays(t,1) : (t < PH[0].from ? PH[0].from : t);
  setPlan(buildPlan(state, plan, start));
  Object.keys(state.done).forEach(k => { if (k.split('|')[0] >= start) delete state.done[k]; });
  const chkDone = CHECK_IDS().every(id => state.ch[id] && state.ch[id].dg);
  if (chkDone) state.rebuiltAfterCheck = true;
  touch(); saveState(); savePlan(); ui.confirmRebuild = false;
  toast('Plan rebuilt from ' + fmt(start));
  render();
}
