import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CHAPTERS, CH, chOf } from '../data/chapters.js';
import { RANKS } from '../data/phases.js';
import { addDays, diffDays, dow, range, clamp } from '../logic/dates.js';
import { weak } from '../logic/plan.js';
import { esc, todayStr, WD, fmtShort } from './common.js';
import { totals, coverage, weakList, reasonFor } from '../logic/derived.js';
import { fmtMarks } from './blocks.js';
import { answersTable } from './sim.js';
import { state, plan, answers, briefs, canWrite, isAdmin, aiReady, ui } from '../appstate.js';
import { rebuild } from '../persist.js';
import { missingBriefs, subjectBriefCounts } from '../briefs.js';
import { exportAll } from '../export.js';
import { statusBanners } from './status.js';
import { accountCardHTML } from '../auth.js';
import { opsBoardHTML } from './board.js';

function renderOps(){
  const t = todayStr(); const cov = coverage(); const tot = totals();
  let h = statusBanners() + '<div class="between wrap"><div class="stack" style="gap:2px"><h1>Base camp</h1><span class="muted small">Counted in marks, so a 10-mark chapter counts more than a 4-mark one.</span></div>'
    + '<div class="stack" style="gap:4px;min-width:220px"><span class="small"><b>'+tot.rank+'</b> · <span class="num">'+tot.xp+' XP</span></span>'+(tot.next?'<div class="bar" style="background:#E3DCC8"><div style="width:'+clamp((tot.xp-RANKS[tot.lv-1][0])/(tot.next[0]-RANKS[tot.lv-1][0])*100,0,100)+'%;background:var(--amber)"></div></div><span class="tiny muted">'+(tot.next[0]-tot.xp)+' XP to '+tot.next[1]+'</span>':'')+'</div></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">'
    + '<div class="card dark"><span class="small" style="color:var(--hud)">All subjects</span><span class="num" style="font-family:var(--display);font-size:32px;font-weight:700">'+Math.round(cov.tot)+'<span style="font-size:17px;color:var(--hud)"> / '+cov.totMax+'</span></span><span class="small" style="color:var(--amber)">marks revised</span></div>'
    + SUB_ORDER.map(s => { const p = cov.per[s]; const dl = diffDays(t, SUBJ[s].exam); return '<div class="card"><span class="small" style="font-weight:700;color:'+SUBJ[s].tx+'">'+SUBJ[s].name+' · '+fmtShort(SUBJ[s].exam)+'</span><span class="num" style="font-family:var(--display);font-size:26px;font-weight:700">'+Math.round(p.got)+'<span style="font-size:15px;color:var(--muted)"> / '+p.max+'</span></span><div class="bar" style="background:'+SUBJ[s].t+'"><div style="width:'+(p.got/p.max*100)+'%;background:'+SUBJ[s].c+'"></div></div><span class="tiny muted">'+(dl>0?dl+' days to go':'Done')+'</span></div>'; }).join('')
    + '</div>';
  // hours chart + radar
  const last7 = range(addDays(t,-6), t);
  const mx = Math.max(300, ...last7.map(d => tot.mins[d]||0));
  let steady = 0; last7.forEach(d => { const day = plan && plan.days[d]; if (!day || !day.b.length) return; const dn = day.b.filter((b,i) => state.done[d+'|'+i]).length; if (dn >= Math.ceil(day.b.length*0.6)) steady++; });
  h += '<div class="grid2"><div class="card"><div class="between" style="align-items:baseline"><h2>Study hours, last 7 days</h2><span class="small" style="color:var(--ok);font-weight:700">Steady on '+steady+' of 7 days</span></div>'
    + '<div style="display:flex;align-items:flex-end;gap:12px;height:150px;border-bottom:1px solid var(--line);padding:0 4px">' + last7.map(d => { const m = tot.mins[d]||0; const hgt = Math.max(3, m/mx*120); return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span class="tiny muted num">'+(m?(m/60).toFixed(1):'')+'</span><div style="width:100%;height:'+hgt+'px;border-radius:6px 6px 0 0;background:'+(m?'var(--navy)':'#CFC7B2')+'"></div></div>'; }).join('') + '</div>'
    + '<div style="display:flex;gap:12px;padding:0 4px">' + last7.map(d => '<span class="tiny muted" style="flex:1;text-align:center">'+WD[dow(d)]+'</span>').join('') + '</div>'
    + '<span class="small muted">A day counts as steady when about 60% of its quests are done. Low-energy days are normal.</span></div>';
  const wl = weakList(6);
  h += '<div class="card"><h2>Radar: needs a little more time</h2>' + radarSVG() + (wl.length ? wl.map(o => '<div class="row" style="gap:12px;padding:8px 10px;background:#FBF8EE;border-radius:12px"><span style="width:8px;height:34px;border-radius:4px;background:'+SUBJ[o.c.s].c+';flex-shrink:0"></span><div class="stack" style="gap:0;flex:1;min-width:0"><b class="small">'+esc(o.c.name)+'</b><span class="tiny muted">'+esc(reasonFor(o))+'</span></div><span class="tiny muted">'+fmtMarks(o.c)+'</span></div>').join('') : '<span class="small muted">Fills in after the starting check.</span>') + '</div></div>';
  // preboards + answers
  h += '<div class="grid2"><div class="card"><h2>Preboard results</h2><span class="small muted">Enter his percentage per subject. Weaker subjects get a little more time when you rebuild.</span><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">'
    + SUB_ORDER.map(s => '<div class="stack" style="gap:4px"><label for="pre-'+s+'">'+SUBJ[s].name+' %</label><input type="number" min="0" max="100" inputmode="numeric" id="pre-'+s+'" data-a="pre" data-v="'+s+'" value="'+esc(state.pre[s] ?? '')+'" '+(canWrite?'':'disabled')+'></div>').join('')
    + '</div></div><div class="card"><h2>Recently marked answers</h2>'+answersTable(6)+'</div></div>';
  // check summary
  h += '<div class="card"><h2>Starting check by subject</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">' + SUB_ORDER.map(s => { const cs = chOf(s).filter(c => state.ch[c.id] && state.ch[c.id].dg); const r = cs.reduce((a,c) => a + state.ch[c.id].dg.r, 0), n = cs.reduce((a,c) => a + state.ch[c.id].dg.n, 0); return '<div class="stack" style="gap:2px"><span class="small" style="font-weight:700;color:'+SUBJ[s].tx+'">'+SUBJ[s].name+'</span><span class="num" style="font-family:var(--display);font-size:22px;font-weight:700">'+(n?Math.round(r/n*100)+'%':'–')+'</span><span class="tiny muted">'+cs.length+' chapters checked</span></div>'; }).join('') + '</div></div>';
  h += opsBoardHTML();
  h += accountCardHTML();
  if (isAdmin) h += buildAllHTML();
  h += '<div class="card"><h2>Export all data</h2><span class="small muted">Downloads one file with the plan, progress, ratings, marked answers, mistake log and all chapter briefs. A backup you can keep.</span><button class="btn ghost" style="align-self:flex-start" data-a="exportAll">Download export file</button></div>';
  return h;
}
// Admin only: build every missing chapter brief now, one at a time, instead of waiting for each first open.
function buildAllHTML(){
  const miss = missingBriefs().length, total = CHAPTERS.length, st = ui.buildAll;
  let h = '<div class="card"><h2>Chapter briefs</h2><div class="between"><span class="small"><b class="num">'+(total-miss)+'</b> of '+total+' written</span><span class="tiny muted">'+subjectBriefCounts().map(x => SUBJ[x.s].name+' '+x.ready+'/'+x.total).join(' · ')+'</span></div>'
    + '<div class="bar"><div style="width:'+((total-miss)/total*100)+'%;background:var(--grass)"></div></div>';
  if (st && st.running) {
    h += '<div class="row"><span class="spin"></span><span class="small">Building '+(st.done+1)+' of '+st.total+(st.current && CH[st.current] ? ': '+esc(CH[st.current].name) : '')+'. About a minute each; keep this page open.</span></div>'
      + '<div class="bar"><div style="width:'+(st.done/st.total*100)+'%;background:var(--gold)"></div></div><button class="btn sm ghost" style="align-self:flex-start" data-a="buildAllStop">Stop after this one</button>';
  } else {
    if (st && st.stop) {
      const why = {daily_cap:'Stopped at today’s limit. Press the button again tomorrow and it carries on with the ones still missing.', session_expired:'Stopped: please sign in again.', not_granted:'Stopped: this account is not allowed.', rate_limited:'Stopped: Claude is busy. Try again in a while.', errors:'Stopped after several failed briefs in a row. Try again later.', cancel:'Stopped. Press the button to carry on.', done:'All briefs are written.', none:'All briefs are written.'}[st.stop];
      h += '<div class="banner note small">'+esc(why)+(st.done ? ' Built this time: '+st.done+'.' : '')+(st.failed ? ' Failed: '+st.failed+'.' : '')+'</div>';
    }
    h += miss ? '<button class="btn" style="align-self:flex-start" data-a="buildAll" '+(!canWrite||!aiReady()?'disabled':'')+'>Build all briefs now ('+miss+' to go)</button><span class="small muted">Builds the missing briefs one at a time and stops cleanly at the daily limit. Briefs that already exist are never touched.</span>'
      : '<span class="small" style="color:var(--ok);font-weight:700">Every chapter has a brief.</span>';
  }
  return h + '</div>';
}
function radarSVG(){
  const pts = CHAPTERS.map(c => ({c, w:weak(c,state), x:state.ch[c.id]||{}})).filter(o => o.x.dg || o.x.sr || o.x.an);
  const W = 220, R = 96, cx = 110, cy = 110;
  const sec = {}; SUB_ORDER.forEach((s,i) => sec[s] = i);
  let dots = '';
  const per = {}; pts.forEach(o => { per[o.c.s] = (per[o.c.s]||0) + 1; });
  const seen = {};
  pts.forEach(o => { const i = sec[o.c.s]; const k = seen[o.c.s] = (seen[o.c.s]||0) + 1; const n = per[o.c.s]; const ang = (i + k/(n+1)) * (2*Math.PI/5) - Math.PI/2; const r = 14 + o.w*(R-18); dots += '<circle cx="'+(cx + r*Math.cos(ang)).toFixed(1)+'" cy="'+(cy + r*Math.sin(ang)).toFixed(1)+'" r="'+(3 + o.c.marks/3).toFixed(1)+'" fill="'+SUBJ[o.c.s].c+'" fill-opacity=".85"/>'; });
  let lines = ''; for (let i=0; i<5; i++) { const a = i*(2*Math.PI/5) - Math.PI/2; lines += '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+R*Math.cos(a)).toFixed(1)+'" y2="'+(cy+R*Math.sin(a)).toFixed(1)+'" stroke="#4A4F5C" stroke-width="1"/>'; const la = a + Math.PI/5; }
  const labels = SUB_ORDER.map((s,i) => { const a = (i+0.5)*(2*Math.PI/5) - Math.PI/2; return '<text x="'+(cx+(R+2)*Math.cos(a)*0.62).toFixed(1)+'" y="'+(cy+(R+2)*Math.sin(a)*0.62+4).toFixed(1)+'" font-size="10" fill="#D4D2C8" text-anchor="middle" font-family="DM Sans">'+SUBJ[s].name+'</text>'; }).join('');
  return '<div class="row" style="justify-content:center"><svg width="'+W+'" height="'+W+'" viewBox="0 0 '+W+' '+W+'" role="img" aria-label="Radar of chapters needing attention: dots further from the centre need more time"><circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="#23262E"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(R*0.66)+'" fill="none" stroke="#4A4F5C"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(R*0.33)+'" fill="none" stroke="#4A4F5C"/>'+lines+labels+dots+'</svg></div><span class="tiny muted" style="text-align:center">Further from the centre means weaker. Bigger dots carry more marks.</span>';
}
export { renderOps, radarSVG };
