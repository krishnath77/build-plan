import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { PH, PLAN_END } from '../data/phases.js';
import { addDays, dow } from '../logic/dates.js';
import { esc, todayStr, fmt, fmtShort } from './common.js';
import { blkTitle, markName } from './blocks.js';
import { state, plan, canWrite, ui } from '../appstate.js';
import { rebuild } from '../persist.js';
import { statusBanners } from './status.js';

function renderPlan(){
  const t = todayStr();
  let h = statusBanners() + '<div class="stack" style="gap:2px"><h1>World map</h1><span class="muted small">'+fmt(PH[0].from)+' to '+fmt(PLAN_END)+'. First paper: '+SUBJ[SUB_ORDER[0]].name+' on '+fmt(SUBJ[SUB_ORDER[0]].exam)+'.</span></div>';
  h += '<div class="card"><div class="chips">' + PH.map(p => { const cur = t >= p.from && t <= p.to; const past = t > p.to; return '<span class="pill" style="'+(cur?'background:var(--amber);color:var(--ink)':past?'background:var(--okBg);color:var(--ok)':'background:#EAE4D2;color:var(--muted)')+'">'+p.name+' · '+fmtShort(p.from)+(p.from!==p.to?'–'+fmtShort(p.to):'')+'</span>'; }).join('') + '</div></div>';
  // settings
  const mk = Object.entries(state.marked).sort();
  h += '<div class="grid2"><div class="card"><h3>Daily load</h3><span class="small muted">Quests on a full day. Sundays and marked half days are lighter. Four is about 3 hours of focused study plus breaks; pick fewer while school is on.</span><div class="chips">'
    + [3,4,5,6].map(n => '<button class="chip" data-a="setB" data-v="'+n+'" aria-pressed="'+((state.B||4)===n)+'" '+(canWrite?'':'disabled')+'>'+n+' quests</button>').join('') + '</div></div>'
    + '<div class="card"><h3>Special days</h3><span class="small muted">School preboards, practicals, school days or days off. The plan works around them when you rebuild.</span>'
    + (canWrite ? '<div class="row wrap"><label class="sr" for="mkDate">Date</label><input type="date" id="mkDate" min="'+PH[0].from+'" max="'+PLAN_END+'"><label class="sr" for="mkType">Type</label><select id="mkType"><option value="preboard">School preboard exam (half day)</option><option value="practical">Practical exam (half day)</option><option value="school">School day (half day)</option><option value="off">Day off (no quests)</option></select><button class="btn sm" data-a="addMark">Add</button></div>' : '')
    + (mk.length ? '<div class="stack" style="gap:4px">'+mk.map(([d,v]) => '<div class="between small"><span>'+fmt(d)+' · '+markName(v)+'</span>'+(canWrite?'<button class="btn sm ghost" data-a="delMark" data-v="'+d+'">Remove</button>':'')+'</div>').join('')+'</div>' : '<span class="small muted">None yet.</span>')
    + '</div></div>';
  if (canWrite) h += ui.confirmRebuild
    ? '<div class="banner info"><span class="small">This re-plans every day from today using his latest scores, ratings and special days. Finished quests stay as they are.</span><div class="row"><button class="btn sm" data-a="rebuildYes">Yes, rebuild</button><button class="btn sm ghost" data-a="rebuildNo">Cancel</button></div></div>'
    : '<div class="row"><button class="btn" data-a="rebuildAsk">Rebuild plan from today</button><span class="small muted">Use after the starting check, preboard marks or adding special days.</span></div>';
  if (!plan) return h + '<div class="card"><span class="spin"></span></div>';
  // weeks
  const ds = Object.keys(plan.days).sort();
  const weeks = []; ds.forEach(d => { const wk = addDays(d, -((dow(d)+6)%7)); let w = weeks[weeks.length-1]; if (!w || w.k !== wk) { w = {k:wk, days:[]}; weeks.push(w); } w.days.push(d); });
  const curWk = addDays(t, -((dow(t)+6)%7));
  h += '<div class="stack" style="gap:10px">' + weeks.map(w => {
    let tot = 0, dn = 0; const phs = new Set();
    w.days.forEach(d => { phs.add(plan.days[d].p); plan.days[d].b.forEach((b,i) => { if (b.t === 'final') return; tot++; if (state.done[d+'|'+i]) dn++; }); });
    const open = ui.openWeek ? ui.openWeek === w.k : (w.k === curWk || (t < PH[0].from && w === weeks[0]));
    const phName = [...phs].map(p => PH.find(x => x.id === p).name).join(' / ');
    return '<details class="card" '+(open?'open':'')+' data-wk="'+w.k+'"><summary class="between"><div class="stack" style="gap:0"><h3>Week of '+fmtShort(w.k < PH[0].from ? PH[0].from : w.k)+'</h3><span class="small muted">'+phName+'</span></div><span class="pill num" style="background:'+(dn && dn===tot?'var(--okBg);color:var(--ok)':'#EAE4D2;color:var(--muted)')+'">'+dn+' / '+tot+'</span></summary>'
      + '<div>' + w.days.map(d => { const day = plan.days[d]; return '<div class="daytile"><div style="width:74px;flex-shrink:0" class="small"><b>'+fmt(d).slice(0,3)+'</b> '+fmtShort(d)+(d===t?'<br><span class="pill" style="background:var(--amber);color:var(--ink)">Today</span>':'')+(state.marked[d]?'<br><span class="tiny muted">'+markName(state.marked[d])+'</span>':'')+'</div><div class="stack" style="gap:4px;flex:1;min-width:0">'
        + (day.b.length ? day.b.map((b,i) => '<div class="row small" style="gap:8px;align-items:flex-start"><span style="width:10px;height:10px;border-radius:5px;margin-top:5px;flex-shrink:0;background:'+(state.done[d+'|'+i]?'var(--ok)':(b.s?SUBJ[b.s].c:'#D9A81C'))+'"></span><span style="'+(state.done[d+'|'+i]?'text-decoration:line-through;color:var(--muted)':'')+'">'+esc(blkTitle(b))+(b.n>1?' <span class="muted">· part '+b.k+' of '+b.n+'</span>':'')+'</span></div>').join('') : '<span class="small muted">No quests</span>')
        + '</div></div>'; }).join('') + '</div></details>';
  }).join('') + '</div>';
  return h;
}
export { renderPlan };
