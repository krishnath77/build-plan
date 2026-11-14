import { NAME, SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CH } from '../data/chapters.js';
import { PH } from '../data/phases.js';
import { diffDays, addDays, range } from '../logic/dates.js';
import { phaseOf } from '../logic/plan.js';
import { esc, todayStr, fmt, ico } from './common.js';
import { totals, weakList } from '../logic/derived.js';
import { blkTitle, blkSub, dotStyle, markName } from './blocks.js';
import { briefLink } from '../briefs.js';
import { state, plan, canWrite, ui } from '../appstate.js';
import { rebuild, CHECK_IDS } from '../persist.js';
import { statusBanners } from './status.js';

function renderToday(){
  const t = todayStr(); const tot = totals();
  const ph = phaseOf(t);
  const start = PH[0].from;
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  // the next paper on the date sheet (Maths first); after the last one it is exam season
  const nextSub = SUB_ORDER.find(k => SUBJ[k].exam >= t) || null;
  let h = statusBanners();
  h += '<div class="between"><div class="stack" style="gap:2px"><span class="eyebrow">'+fmt(t)+' · '+(ph ? ph.name : (t < start ? 'Quests start '+fmt(start) : 'Exam season'))+'</span><h1>'+greet+', '+esc(NAME)+'</h1></div>'
    + '<div class="stack" style="align-items:center;gap:2px"><div class="lvl">Lv '+tot.lv+'</div><span class="tiny muted">'+tot.rank+'</span></div></div>';
  h += pathHTML(t, start, nextSub);
  if (!plan) { h += '<div class="card"><span class="spin"></span><span class="small muted">Loading your plan…</span></div>'; return h; }
  // banners
  const curPh = ph ? ph.id : null;
  let missed = 0;
  for (const d in plan.days) { if (d >= t || plan.days[d].p !== curPh || !['P1','P2'].includes(curPh)) continue; plan.days[d].b.forEach((b,i) => { if (['study','pyq','fix'].includes(b.t) && !state.done[d+'|'+i]) missed++; }); }
  if (missed && canWrite) h += '<div class="banner info"><span class="small"><b>'+missed+' quest'+(missed>1?'s':'')+'</b> from earlier '+(missed>1?'are':'is')+' waiting. They can be folded into the coming days.</span><button class="btn sm" data-a="rebuild">Fold them in</button></div>';
  const chkDone = CHECK_IDS().every(id => state.ch[id] && state.ch[id].dg);
  if (chkDone && !state.rebuiltAfterCheck && canWrite) h += '<div class="banner ok"><span class="small"><b>Starting check complete.</b> Rebuild the plan so time goes where it’s needed most.</span><button class="btn sm" data-a="rebuild">Rebuild plan</button></div>';
  const showDay = t < start ? start : t;
  const day = plan.days[showDay];
  if (t < start) h += '<div class="banner note small">Day one is '+fmt(start)+': the starting check. You can take it today in Training if you like.</div>';
  // where you see this: the one-line link written into the chapter's brief (shown once that brief exists)
  const firstCh = day && day.b.find(b => b.c && briefLink(b.c));
  if (firstCh) h += '<div class="card" style="flex-direction:row;gap:12px;align-items:flex-start"><div class="seal">'+ico('tip',20)+'</div><div class="stack" style="gap:2px"><span class="tag" style="color:var(--amberInk)">Where you see this · '+esc(CH[firstCh.c].name)+'</span><span class="small">'+esc(briefLink(firstCh.c))+'</span></div></div>';
  // energy
  const en = state.energy[t] || '';
  if (day && day.b.length && t >= start) h += '<div class="stack" style="gap:8px"><span class="eyebrow">How’s your energy today?</span><div class="chips">'
    + [['low','Low'],['ok','Okay'],['great','Great']].map(([v,l]) => '<button class="chip" style="flex:1" data-a="energy" data-v="'+v+'" aria-pressed="'+(en===v)+'">'+l+'</button>').join('') + '</div></div>';
  if (!day || !day.b.length) { h += '<div class="card"><h2>No quests today</h2><span class="muted small">'+(day && state.marked[showDay] ? 'Marked as '+markName(state.marked[showDay])+'. Rest, or just glance at your mistake log.' : 'Rest day.')+'</span></div>'; return h; }
  const doneN = day.b.filter((b,i) => state.done[showDay+'|'+i]).length;
  h += '<div class="between" style="align-items:baseline"><h2>'+(t < start ? 'Day one’s quests' : 'Today’s '+day.b.length+' quests')+'</h2><span class="small" style="color:var(--ok);font-weight:700">'+doneN+' of '+day.b.length+' done</span></div>';
  const optional = idxOptional(day, en);
  let nextMarked = false;
  h += '<div class="stack" style="gap:8px">' + day.b.map((b,i) => {
    const done = !!state.done[showDay+'|'+i]; const isNext = !done && !nextMarked && !optional.has(i); if (isNext) nextMarked = true;
    return blkRow(b, i, showDay, done, isNext, optional.has(i));
  }).join('') + '</div>';
  if (en === 'great') { const w = weakList(1)[0]; h += '<div class="banner info"><span class="small"><b>Bonus quest:</b> a 10-minute recall on '+(w ? esc(w.c.name) : 'your weakest chapters')+'.</span><button class="btn sm" data-a="bonus">Start bonus</button></div>'; }
  if (en === 'low') h += '<div class="banner note small">Lighter day: the faded quests are optional. Whatever is left gets folded into later days.</div>';
  return h;
}
function idxOptional(day, en){
  const s = new Set(); if (en !== 'low') return s;
  let kept = 0; day.b.forEach((b,i) => { if (['study','quick','pyq','fix','sweep'].includes(b.t)) { kept++; if (kept > 2) s.add(i); } });
  return s;
}
function blkRow(b, i, d, done, isNext, opt){
  const sub = blkSub(b);
  return '<div class="blk '+(done?'done ':'')+(isNext?'next ':'')+(opt?'opt ':'')+(ui.pop === d+'|'+i ? 'pop' : '')+'">'
    + '<button class="dot" style="'+(done ? 'background:var(--ok);color:#fff' : dotStyle(b))+'" data-a="toggle" data-d="'+d+'" data-i="'+i+'" aria-label="'+(done?'Mark not done':'Mark done')+'" aria-pressed="'+done+'" '+(canWrite?'':'disabled')+'>'+(done ? ico('check',16,3) : (b.t==='recall' ? ico('recall',16,2.4) : (i+1)))+'</button>'
    + '<button class="body" data-a="focus" data-d="'+d+'" data-i="'+i+'"><span class="tag" style="color:'+(b.s?SUBJ[b.s].tx:'var(--amberInk)')+'">'+esc(sub)+(isNext?' · up next':'')+(opt?' · optional today':'')+'</span><span class="ttl">'+esc(blkTitle(b))+'</span></button>'
    + (isNext ? '<button class="btn sm" data-a="focus" data-d="'+d+'" data-i="'+i+'" aria-label="Start this quest">'+ico('play',14)+'</button>' : '')
    + '</div>';
}

// A path of blocks to the next exam: one block per day, placed (grass) once most of that day's quests are done.
const dayDone = d => { const day = plan && plan.days[d]; if (!day || !day.b.length) return false; const n = day.b.filter((b,i) => state.done[d+'|'+i]).length; return n >= Math.ceil(day.b.length*0.6); };
function pathHTML(t, start, nextSub){
  const sub = nextSub ? SUBJ[nextSub] : null;
  if (!sub) return '<div class="card dark"><h3>Exam season</h3><span class="small" style="color:var(--hud)">All five papers are on the date sheet. Take one paper at a time.</span></div>';
  const idx = SUB_ORDER.indexOf(nextSub);
  const from = idx > 0 ? addDays(SUBJ[SUB_ORDER[idx-1]].exam, 1) : start;
  const ds = range(from, addDays(sub.exam, -1));
  const placed = ds.filter(dayDone).length, left = diffDays(t, sub.exam);
  return '<div class="card dark hudgrid" style="gap:12px"><div class="between" style="align-items:baseline"><h3 style="font-size:17px">Path to '+esc(sub.name)+'</h3><span class="small" style="color:var(--hud)">'+(left > 0 ? left+' days · '+fmt(sub.exam) : 'Paper day')+'</span></div>'
    + '<div class="bpath" role="img" aria-label="Path of '+ds.length+' blocks to the '+esc(sub.name)+' paper, '+placed+' placed">'
    + ds.map(d => '<i class="'+(dayDone(d) ? 'placed' : d === t ? 'today' : d < t && plan && plan.days[d] && plan.days[d].b.length ? 'gap' : '')+'" title="'+esc(fmt(d))+'"></i>').join('')
    + '</div><span class="small" style="color:var(--hud)"><b style="color:#fff">'+placed+'</b> of '+ds.length+' blocks placed. A day counts when most of its quests are done.</span></div>';
}
export { renderToday, idxOptional, blkRow, pathHTML };
