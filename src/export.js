import { toast, todayStr } from './ui/common.js';
import { state, plan, briefs, notes, answers, mistakes } from './appstate.js';
import { db } from './store.js';

export async function exportAll(){
  let reports = [];
  try { const r = await db.collection('reports').get(); reports = r.docs.map(d => ({id:d.id, ...d.data()})); } catch(e){}
  const out = {format:'buildplan-export', version:1, exportedAt:new Date().toISOString(), state, plan, briefs, notes, answers, mistakes, reports};
  try {
    const blob = new Blob([JSON.stringify(out, null, 1)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'buildplan-export-'+todayStr()+'.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Export file ready.');
  } catch (e) { toast('Export could not be saved.'); }
}
