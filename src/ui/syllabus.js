import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CHAPTERS, CH, chOf } from '../data/chapters.js';
import { esc, fmt, ico } from './common.js';
import { fmtMarks } from './blocks.js';
import { arr, renderBrief } from './brief.js';
import { briefs, ui, isAdmin } from '../appstate.js';
import { briefLink, ensureBrief, pendingBriefHTML } from '../briefs.js';
import { statusBanners } from './status.js';
import { boardSectionHTML } from './board.js';

function adminRegen(c){
  if (!isAdmin) return '';
  if (ui.confirmRegen === c.id) return '<div class="banner info"><span class="small">Replace this brief with a new one written now? The saved one is overwritten.</span><div class="row"><button class="btn sm" data-a="briefRegenYes" data-v="'+esc(c.id)+'">Yes, regenerate</button><button class="btn sm ghost" data-a="briefRegenNo">Cancel</button></div></div>';
  return '<button class="btn sm ghost" style="align-self:flex-start" data-a="briefRegenAsk" data-v="'+esc(c.id)+'">Regenerate brief</button>';
}
function renderSyl(){
  let h = statusBanners();
  if (ui.sylCh) {
    const c = CH[ui.sylCh], br = briefs[c.id];
    h += '<div class="row"><button class="iconbtn" data-a="sylBack" aria-label="Back to syllabus">'+ico('back',18,2.4)+'</button><span class="eyebrow">Syllabus · '+SUBJ[c.s].name+'</span></div>';
    h += '<div class="card" style="background:'+SUBJ[c.s].c+';color:#fff;align-items:center;text-align:center;gap:2px"><span class="tag">'+SUBJ[c.s].name+' · '+fmtMarks(c)+'</span><h2 style="color:#fff">'+esc(c.name)+'</h2></div>';
    if (!br) { ensureBrief(c.id); return h + pendingBriefHTML(c) + boardSectionHTML(c); }
    if (briefLink(c.id)) h += '<div class="card" style="flex-direction:row;gap:12px;align-items:flex-start"><div class="seal">'+ico('tip',18)+'</div><div class="stack" style="gap:2px"><span class="tag" style="color:var(--amberInk)">Where you see this</span><span class="small">'+esc(briefLink(c.id))+'</span></div></div>';
    return h + renderBrief(c, br) + adminRegen(c) + boardSectionHTML(c);
  }
  const total = CHAPTERS.length, ready = CHAPTERS.filter(c => briefs[c.id]).length;
  h += '<div class="stack" style="gap:2px"><h1>Syllabus</h1><span class="muted small">Every chapter of the 2026–27 syllabus with its guided brief: topics, memory map, how it’s asked and practice questions. A brief is written the first time you open it.</span></div>';
  h += '<div class="card"><div class="between"><b>Briefs written</b><span class="num"><b>'+ready+'</b> of '+total+'</span></div><div class="bar" style="background:#E3DCC8"><div style="width:'+(ready/total*100)+'%;background:var(--amber)"></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">' + SUB_ORDER.map(s => { const cs = chOf(s), r = cs.filter(c => briefs[c.id]).length; return '<div class="stack" style="gap:4px"><span class="small" style="font-weight:700;color:'+SUBJ[s].tx+'">'+SUBJ[s].name+'</span><span class="tiny muted num">'+r+' of '+cs.length+' ready</span><div class="bar" style="background:'+SUBJ[s].t+'"><div style="width:'+(r/cs.length*100)+'%;background:'+SUBJ[s].c+'"></div></div></div>'; }).join('') + '</div></div>';
  h += '<div class="chips">' + SUB_ORDER.map(s => '<button class="chip sm" data-a="sylSub" data-v="'+s+'" aria-pressed="'+(ui.sylSub===s)+'">'+SUBJ[s].name+'</button>').join('') + '</div>';
  const cs = chOf(ui.sylSub);
  const sum = cs.reduce((a,c) => a + c.marks, 0);
  h += '<span class="small muted">'+SUBJ[ui.sylSub].name+' theory paper: '+SUBJ[ui.sylSub].theory+' marks · exam '+fmt(SUBJ[ui.sylSub].exam)+'. Marks with ~ are an even split of a unit’s marks across its chapters.</span>';
  h += '<div class="card" style="gap:0;padding:6px 14px">' + cs.map((c,i) => { const br = briefs[c.id]; const nt = br ? arr(br.topics).length : 0; return '<button data-a="sylOpen" data-v="'+c.id+'" style="display:flex;gap:12px;align-items:center;width:100%;background:none;border:0;border-bottom:'+(i<cs.length-1?'1px solid #E7E1D0':'0')+';padding:12px 0;text-align:left"><span class="num small muted" style="width:22px">'+(i+1)+'</span><span class="stack" style="gap:0;flex:1;min-width:0"><b class="small" style="font-size:15px">'+esc(c.name)+'</b><span class="tiny muted">'+fmtMarks(c)+(nt ? ' · '+nt+' topics' : '')+'</span></span><span class="pill" style="'+(br?'background:var(--okBg);color:var(--ok)':'background:#EAE4D2;color:var(--muted)')+'">'+(br?'Ready':'Not built yet')+'</span></button>'; }).join('') + '</div>';
  return h;
}
export { renderSyl };
