import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CH, chOf } from '../data/chapters.js';
import { esc, todayStr, ico } from './common.js';
import { fmtMarks } from './blocks.js';
import { renderBrief } from './brief.js';
import { briefLink, ensureBrief, pendingBriefHTML } from '../briefs.js';
import { mistakes, notes, briefs, canWrite, ui, aiReady, render } from '../appstate.js';
import { setDoc } from '../persist.js';
import { askJSON, errCopy } from '../ai.js';
import { statusBanners } from './status.js';

function renderHangar(){
  let h = statusBanners();
  if (ui.noteCh) return h + renderNoteDetail(CH[ui.noteCh]);
  h += '<div class="stack" style="gap:2px"><h1>Inventory</h1><span class="muted small">One quick card per chapter: memory map, formulas, tricks and where you see it in real life.</span></div>';
  h += '<div class="chips">' + SUB_ORDER.map(s => '<button class="chip sm" data-a="noteSub" data-v="'+s+'" aria-pressed="'+(ui.noteSub===s)+'">'+SUBJ[s].name+'</button>').join('') + '</div>';
  h += '<div class="grid2">' + chOf(ui.noteSub).map(c => '<button class="card" style="border:0;text-align:left;border-left:5px solid '+SUBJ[c.s].c+'" data-a="openNote" data-v="'+c.id+'"><div class="between"><b>'+esc(c.name)+'</b><span class="pill" style="background:'+SUBJ[c.s].t+';color:'+SUBJ[c.s].tx+'">'+fmtMarks(c)+'</span></div>'+(briefLink(c.id)?'<span class="small muted">'+esc(briefLink(c.id))+'</span>':'')+'<span class="tiny" style="color:'+(briefs[c.id]||notes[c.id]?'var(--ok)':'var(--muted)')+';font-weight:700">'+(briefs[c.id]?'Full brief ready':notes[c.id]?'Quick card ready':'Built when you open it')+'</span></button>').join('') + '</div>';
  return h;
}
function renderNoteDetail(c){
  const n = notes[c.id], br = briefs[c.id];
  let h = '<div class="row"><button class="iconbtn" data-a="closeNote" aria-label="Back to chapters">'+ico('back',18,2.4)+'</button><span class="eyebrow">Inventory · '+SUBJ[c.s].name+'</span></div>';
  h += '<div class="card" style="background:'+SUBJ[c.s].c+';color:#fff;align-items:center;text-align:center;gap:2px"><span class="tag">'+SUBJ[c.s].name+' · '+fmtMarks(c)+'</span><h2 style="color:#fff">'+esc(c.name)+'</h2></div>';
  if (briefLink(c.id)) h += '<div class="card" style="flex-direction:row;gap:12px;align-items:flex-start"><div class="seal">'+ico('tip',18)+'</div><div class="stack" style="gap:2px"><span class="tag" style="color:var(--amberInk)">Where you see this</span><span class="small">'+esc(briefLink(c.id))+'</span></div></div>';
  if (br) return h + renderBrief(c, br);
  if (!n) { ensureBrief(c.id); return h + pendingBriefHTML(c); }
  h += '<div class="chips">' + [['map','Map'],['f','Formulas'],['tricks','Tricks']].map(([v,l]) => '<button class="chip sm" data-a="noteTab" data-v="'+v+'" aria-pressed="'+(ui.noteTab===v)+'">'+l+'</button>').join('') + '</div>';
  if (n.summary) h += '<span class="small">'+esc(n.summary)+'</span>';
  const col = SUBJ[c.s].c;
  if (ui.noteTab === 'map') h += '<div class="grid2">' + (n.branches||[]).map(b => '<div class="branch" style="--c:'+col+'"><b class="small" style="color:'+SUBJ[c.s].tx+'">'+esc(b.name)+'</b>'+(b.items||[]).map(i => '<span class="small">'+esc(i)+'</span>').join('')+'</div>').join('') + '</div>';
  if (ui.noteTab === 'f') h += '<div class="card">' + ((n.formulas||[]).length ? (n.formulas||[]).map(f => '<div class="stack" style="gap:0;border-bottom:1px solid var(--line);padding-bottom:6px"><span class="tiny muted" style="font-weight:700">'+esc(f.name)+'</span><span style="font-size:16px">'+esc(f.f)+'</span></div>').join('') : '<span class="small muted">No formulas for this chapter.</span>') + '</div>';
  if (ui.noteTab === 'tricks') h += '<div class="card dark"><b style="color:var(--amber)">Memory hooks</b>'+(n.hooks||[]).map(x => '<span class="small">'+esc(x)+'</span>').join('')+'</div>'
    + '<div class="card"><b>Mistakes that cost marks</b>'+(n.mistakes||[]).map(x => '<span class="small">'+esc(x)+'</span>').join('')+'</div>'
    + '<div class="card"><b>Often asked in board papers</b><span class="tiny muted">Claude’s estimate until we analyse the real past papers.</span>'+(n.asked||[]).map(x => '<span class="small">'+esc(x)+'</span>').join('')+'</div>';
  if (canWrite && aiReady()) h += '<button class="btn sm ghost" style="align-self:flex-start" data-a="buildNote" data-v="'+c.id+'">'+(ui.loadNote?'<span class="spin"></span> Rebuilding…':'Rebuild this quick card')+'</button>';
  return h;
}
/* --- notes --- */
async function buildNote(id){
  const c = CH[id]; ui.loadNote = true; ui.noteErr = null; render();
  const isEng = c.s === 'eng', isFr = c.s === 'fr';
  const prompt = 'Create a one-screen revision "quick card" for a CBSE Class 10 student (board exam 2027, 2026-27 syllabus, current NCERT book). Subject: '+SUBJ[c.s].name+'. Chapter: "'+c.name+'". Use only standard textbook content and be accurate.\n'
    + (isEng ? 'For this English item, the branches cover theme, characters or speaker, key events or imagery, message, and likely exam angles. Do not quote more than a few words of the text. Formulas is an empty list; for writing items, give the format and word limits in branches instead.\n' : '')
    + (isFr ? 'For this French item, write the card in simple French (A2) with a short English help line after each point.\n' : '')
    + 'Reply with only JSON: {"summary":"2 sentences","branches":[{"name":"short branch name","items":["item under 14 words"]}],"formulas":[{"name":"...","f":"formula, law or key reaction in plain text with Unicode"}],"hooks":["original memory tricks or mnemonics"],"mistakes":["common mistakes that lose marks"],"asked":["topics that frequently appear in CBSE board papers"]}\n'
    + 'Limits: 4-5 branches with 2-4 items each; up to 10 formulas; 2-4 hooks; 2-4 mistakes; 3-5 asked.';
  try {
    const r = await askJSON('notes', prompt);
    if (!r || !Array.isArray(r.branches)) throw {code:'invalid_json'};
    const data = {d:todayStr(), at:Date.now(), summary:String(r.summary||''), branches:r.branches.slice(0,6).map(b => ({name:String(b.name||''), items:(b.items||[]).slice(0,5).map(String)})), formulas:(r.formulas||[]).slice(0,12).map(f => ({name:String(f.name||''), f:String(f.f||'')})), hooks:(r.hooks||[]).slice(0,5).map(String), mistakes:(r.mistakes||[]).slice(0,5).map(String), asked:(r.asked||[]).slice(0,6).map(String)};
    notes[id] = data; await setDoc('notes/'+id, data);
  } catch (e) { ui.noteErr = errCopy(e); }
  ui.loadNote = false; render();
}
export { renderHangar, renderNoteDetail, buildNote };
