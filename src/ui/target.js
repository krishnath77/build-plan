import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { PP_UNITS, ppTotal, PP_NOTE } from '../data/paperPattern.js';
import { esc, fmtShort } from './common.js';
import { diffDays } from '../logic/dates.js';
import { todayStr } from './common.js';
import { statusBanners } from './status.js';

// Blueprint tab: where each paper's 80 marks sit, by unit or section. Static data, no Firestore.
// The question pattern (number of questions of each type) is not here yet: it comes from the 2026-27 sample papers later.

// a row of blocks: one block per mark, rounded to the nearest whole mark, so a 20-mark unit is a row of 20 blocks
function markBlocks(marks, color){
  const n = Math.max(1, Math.round(marks));
  return '<span class="mblocks" role="img" aria-label="'+marks+' marks">' + Array.from({length:n}, () => '<i style="background:'+color+'"></i>').join('') + '</span>';
}

function card(s){
  const S = SUBJ[s], units = PP_UNITS[s], total = ppTotal(s);
  const days = diffDays(todayStr(), S.exam);
  const top = units.slice().sort((a,b) => b.marks - a.marks)[0];
  return '<article class="pp-card" style="--c:'+S.c+';--tx:'+S.tx+';--t:'+S.t+'">'
    + '<div class="pp-head"><div class="pp-row1"><div class="pp-name">'+esc(S.name)+'</div><div class="pp-date">'+esc(fmtShort(S.exam))+'</div></div>'
    + '<div class="pp-meta"><span><b>'+S.theory+'</b> theory marks</span><span>'+esc(S.paper)+'</span>'+(days > 0 ? '<span><b>'+days+'</b> days to go</span>' : '')+'</div></div>'
    + '<div class="pp-body"><div class="pp-secs">'
    + units.map(u => '<div class="pp-sec"><div class="pp-what"><b>'+esc(u.name)+'</b><span>'+markBlocks(u.marks, S.c)+'</span></div><div class="pp-m">'+u.marks+'<small>marks</small></div></div>').join('')
    + '</div><div class="pp-big"><div class="pp-pct">'+Math.round(top.marks/total*100)+'%</div><div><b>'+esc(top.name)+'</b> is the biggest block: '+top.marks+' of '+total+' marks.</div></div>'
    + (total !== S.theory ? '<div class="pp-flag">The units add up to '+total+', not '+S.theory+'. Tell Krishnath.</div>' : '')
    + '</div></article>';
}

function renderIntel(){
  const strip = SUB_ORDER.map(k => { const S = SUBJ[k], d = diffDays(todayStr(), S.exam);
    return '<div class="pp-tgt"><div class="pp-n">'+S.theory+'<small> marks</small></div><div class="pp-s"><span class="pp-dot" style="background:'+S.c+'"></span>'+esc(S.name)+'</div><div class="pp-d">'+esc(fmtShort(S.exam))+(d > 0 ? ' · '+d+' days' : '')+'</div></div>';
  }).join('');
  const tot = SUB_ORDER.reduce((a,k) => a + SUBJ[k].theory, 0);
  return statusBanners() + '<div class="pp"><section class="pp-brief">'
    + '<span class="pp-tag">Blueprint · Boards 2027</span>'
    + '<h1>Know the map before you build</h1>'
    + '<p>Where the marks sit in each paper, unit by unit. Learn the shape once and nothing in the exam hall surprises you.</p>'
    + '<div class="pp-strip">'+strip+'</div>'
    + '<div class="pp-total"><b>'+tot+'</b> theory marks across 5 papers, in the order you sit them. Each paper is 80 marks of theory; the school gives the other 20.</div></section>'
    + '<div class="pp-grid">'+SUB_ORDER.map(card).join('')+'</div>'
    + '<div class="pp-foot">'+esc(PP_NOTE)+'</div></div>';
}
export { renderIntel };
