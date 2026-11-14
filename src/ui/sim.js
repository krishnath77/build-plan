import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CH, chOf } from '../data/chapters.js';
import { esc, fmtShort, ico } from './common.js';
import { state, answers, mistakes, canWrite, ui, aiReady } from '../appstate.js';
import { CHECK_IDS } from '../persist.js';
import { statusBanners } from './status.js';
import { practiceCardHTML, papersCardHTML } from './pyq.js';

function renderSim(){
  let h = statusBanners() + '<div class="stack" style="gap:2px"><h1>Training</h1><span class="muted small">Starting check, written-answer marking, recall and your mistake log.</span></div>';
  const noClaude = !aiReady();
  if (noClaude) h += '<div class="banner note small">You are offline. Questions and marking need an internet connection.</div>';
  h += '<div class="grid2"><div class="card dark hudgrid"><h2 style="color:#fff">Check a written answer</h2><span class="small" style="color:var(--hud)">Write on paper, take a photo, and get CBSE-style step marking with what to fix.</span><button class="btn amber" data-a="ansOpen" '+(noClaude?'disabled':'')+'>'+ico('camera',18)+' Start answer check</button></div>'
    + '<div class="card"><h2>Quick recall</h2><span class="small muted">Ten minutes on the chapters that need it most, plus past mistakes.</span><button class="btn" data-a="bonus" '+(noClaude?'disabled':'')+'>'+ico('recall',18)+' Start recall</button></div></div>';
  h += practiceCardHTML() + papersCardHTML();
  // starting check
  h += '<div class="card"><div class="between"><h2>Starting check</h2><span class="small muted">'+CHECK_IDS().filter(id => state.ch[id] && state.ch[id].dg).length+' of '+CHECK_IDS().length+' done</span></div><span class="small muted">Five quick questions per chapter, plus a 1–5 self-rating. Results decide where revision time goes.</span>'
    + '<div class="chips">' + SUB_ORDER.map(s => '<button class="chip sm" data-a="simSub" data-v="'+s+'" aria-pressed="'+(ui.simSub===s)+'">'+SUBJ[s].name+'</button>').join('') + '</div>';
  const groups = checkGroups(ui.simSub);
  h += groups.map(g => {
    const doneN = g.cs.filter(id => state.ch[id] && state.ch[id].dg).length;
    return '<div class="stack" style="gap:6px;border-top:1px solid var(--line);padding-top:10px"><div class="between"><b class="small">'+esc(g.name)+'</b><button class="btn sm '+(doneN===g.cs.length?'ghost':'')+'" data-a="runCheck" data-v="'+g.key+'" '+(noClaude?'disabled':'')+'>'+(doneN===g.cs.length?'Retake':doneN?'Continue':'Start')+'</button></div>'
      + g.cs.map(id => { const c = CH[id], x = state.ch[id] || {}; return '<div class="between small" style="gap:8px"><span style="flex:1;min-width:0">'+esc(c.name)+'</span>'+(x.dg?'<span class="pill num" style="'+scoreStyle(x.dg.r/x.dg.n)+'">'+x.dg.r+'/'+x.dg.n+'</span>':'')+'<span class="row" style="gap:3px" role="group" aria-label="Self-rating for '+esc(c.name)+'">'+[1,2,3,4,5].map(v => '<button class="chip sm" style="min-width:34px;padding:0" data-a="rate" data-c="'+id+'" data-v="'+v+'" aria-pressed="'+(x.sr===v)+'" '+(canWrite?'':'disabled')+'>'+v+'</button>').join('')+'</span></div>'; }).join('')
      + '</div>';
  }).join('');
  const rateOnly = chOf(ui.simSub).filter(c => c.kind==='read'||c.kind==='write');
  if (rateOnly.length) h += '<div class="stack" style="gap:6px;border-top:1px solid var(--line);padding-top:10px"><b class="small">'+(ui.simSub==='fr'?'Comprehension, writing and grammar':'Reading, writing and grammar')+' (rate only)</b>' + rateOnly.map(c => { const x = state.ch[c.id]||{}; return '<div class="between small"><span>'+esc(c.name)+'</span><span class="row" style="gap:3px">'+[1,2,3,4,5].map(v => '<button class="chip sm" style="min-width:34px;padding:0" data-a="rate" data-c="'+c.id+'" data-v="'+v+'" aria-pressed="'+(x.sr===v)+'" '+(canWrite?'':'disabled')+'>'+v+'</button>').join('')+'</span></div>'; }).join('') + '</div>';
  h += '</div>';
  // mistakes + answers
  const open = mistakes.filter(m => !m.fixed);
  h += '<div class="grid2"><div class="card"><div class="between"><h2>Mistake log</h2><span class="small muted">'+open.length+' open</span></div>'
    + (open.length ? open.slice(0,12).map(m => '<div class="stack" style="gap:2px;border-top:1px solid var(--line);padding-top:8px"><span class="tag" style="color:'+(CH[m.ch]?SUBJ[CH[m.ch].s].tx:'var(--muted)')+'">'+esc(CH[m.ch] ? CH[m.ch].name : '')+'</span><span class="small">'+esc(m.q)+'</span><span class="small" style="color:var(--ok)"><b>Right idea:</b> '+esc(m.a)+'</span>'+(canWrite?'<button class="btn sm ghost" style="align-self:flex-start" data-a="fixM" data-v="'+esc(m.id)+'">Got it now</button>':'')+'</div>').join('') : '<span class="small muted">Empty for now. Wrong answers in quizzes and lost marks land here.</span>')
    + '</div><div class="card"><h2>Recently marked answers</h2>' + answersTable(8) + '</div></div>';
  return h;
}
function scoreStyle(r){ return r >= 0.8 ? 'background:var(--okBg);color:var(--ok)' : r >= 0.5 ? 'background:#EAE4D2;color:var(--ink)' : 'background:var(--warnBg);color:var(--warnInk)'; }
function answersTable(n){
  if (!answers.length) return '<span class="small muted">No marked answers yet.</span>';
  return '<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Subject</th><th>Question</th><th style="text-align:right">Marks</th></tr></thead><tbody>'
    + answers.slice(0,n).map(a => '<tr><td class="num">'+esc(fmtShort(a.d))+'</td><td style="color:'+(SUBJ[a.s]?SUBJ[a.s].tx:'inherit')+';font-weight:600">'+esc(SUBJ[a.s]?SUBJ[a.s].name:'')+'</td><td>'+esc(String(a.q||'').slice(0,90))+'</td><td class="num" style="text-align:right">'+esc(a.got)+' / '+esc(a.max)+'</td></tr>').join('')
    + '</tbody></table></div>';
}
function checkGroups(s){
  const ids = chOf(s).filter(c => c.kind !== 'read' && c.kind !== 'write').map(c => c.id);
  const pre = p => ids.filter(i => i.startsWith(p));
  if (s === 'eng') return [{key:'eng-ff', name:'First Flight prose', cs:pre('ff'), grp:1}, {key:'eng-fp', name:'First Flight poems', cs:pre('fp'), grp:1}, {key:'eng-fw', name:'Footprints without Feet', cs:pre('fw'), grp:1}];
  if (s === 'fr') return [{key:'fr-fc', name:'Culture and civilisation lessons', cs:pre('fc'), grp:1}];
  if (s === 'sst') return [{key:'sst-h', name:'History', cs:pre('h')}, {key:'sst-g', name:'Geography and map work', cs:pre('g').concat(ids.filter(i => i === 'mp'))}, {key:'sst-pl', name:'Political Science', cs:pre('pl')}, {key:'sst-ec', name:'Economics', cs:pre('ec')}];
  return [{key:s, name:SUBJ[s].name+' chapters', cs:ids}];
}
export { renderSim, scoreStyle, answersTable, checkGroups };
