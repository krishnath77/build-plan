import { SUBJ } from '../data/subjects.js';
import { CH } from '../data/chapters.js';
import { weak } from '../logic/plan.js';
import { plan, answers, mistakes, notes } from '../appstate.js';

/* --- block wording --- */
function blkTitle(b){
  const c = b.c ? CH[b.c] : null, sn = b.s ? SUBJ[b.s].name : '';
  switch (b.t) {
    case 'study': return unitName(b);
    case 'quick': return unitName(b) + ' · quick pass';
    case 'pyq': return 'Past questions: ' + unitName(b);
    case 'fix': return 'Fix weak spots: ' + c.name;
    case 'check': return b.grp ? 'Starting check: ' + groupName(b) : 'Starting check: ' + sn + ' (' + b.cs.length + ' chapters)';
    case 'rate': return 'Rate every chapter, 1 to 5';
    case 'recall': return b.cs && b.cs.length ? 'Quick recall: ' + b.cs.map(id => CH[id].name).join(', ') : 'Quick recall: mistake log';
    case 'paper': return 'Full paper ' + b.x + ' · ' + sn;
    case 'review': return 'Mark paper ' + b.x + ' and log mistakes';
    case 'half': return 'Timed half paper · ' + sn;
    case 'sweep': return 'Quick-card sweep: ' + b.cs.map(id => CH[id].name).join(', ');
    case 'pre': return 'Preboard prep: tomorrow’s paper';
    case 'final': return 'Final-week plan: we build this together';
  }
  return '';
}
function unitName(b){ if (b.cs && b.cs.length > 1) return b.cs.map(id => CH[id].name).join(' + '); return CH[b.c].name; }
function unitMarks(b){ const ids = (b.cs && b.t !== 'sweep') ? b.cs : [b.c]; const m = ids.reduce((a,id) => a + CH[id].marks, 0); return (ids.some(id => CH[id].est) ? '~' : '') + (Math.round(m*10)/10) + ' marks'; }
function groupName(b){ const f = b.cs[0]; if (f === 'ff1') return 'English, First Flight prose'; if (f === 'fp1') return 'English, First Flight poems'; if (f === 'fw1') return 'English, Footprints without Feet'; if (f === 'fc1') return 'French, culture lessons'; return SUBJ[b.s].name; }
function blkSub(b){
  const c = b.c ? CH[b.c] : null; const m = b.m ? (b.m >= 60 ? (b.m/60) + ' h' : b.m + ' min') : '';
  if (c) { const part = b.n > 1 ? ' · part ' + b.k + ' of ' + b.n : ''; return SUBJ[c.s].name.toUpperCase() + ' · ' + unitMarks(b) + part; }
  if (b.s) return SUBJ[b.s].name.toUpperCase() + (m ? ' · ' + m : '');
  if (b.t === 'recall') return 'QUICK RECALL · ' + m;
  if (b.t === 'pre') return 'PREBOARDS · ' + m;
  if (b.t === 'rate') return 'SELF-CHECK · ' + m;
  return m.toUpperCase();
}
function fmtMarks(c){ return (c.est ? '~' : '') + (Math.round(c.marks*10)/10) + ' marks'; }
function blkSteps(b){
  const c = b.c ? CH[b.c] : null; const k = b.k || 1;
  const byKind = {
    num: k === 1 ? ['Read the NCERT key points and solved examples', 'Write every formula from memory, then check', (c && c.s === 'sci') ? 'Practise this chapter’s numericals and diagrams' : 'Do the NCERT examples without looking'] : k === 2 ? ['Recall the formulas in 2 minutes, no book', 'Solve 6 past board questions', 'Photo one answer for marking'] : ['Redo the questions you got wrong', 'Try 4 harder questions', 'Add anything new to your mistake log'],
    org: k === 1 ? ['Go through the reaction map in the Inventory', 'Write the named reactions from memory', 'Do 5 conversions'] : ['Solve past board questions on this chapter', 'Write mechanisms step by step', 'Photo one answer for marking'],
    inorg: k === 1 ? ['Read the NCERT key points', 'Make a one-page summary of trends and exceptions', 'Answer 5 past questions'] : ['Recall trends without the book', 'Solve past board questions', 'Photo one answer for marking'],
    theory: ['Read the NCERT key points', 'Make a one-page summary', 'Answer 5 past questions'],
    lit: k === 1 ? ['Read the theme map in the Inventory', 'List characters and key events from memory', 'Outline 2 long answers'] : ['Write one 120-word answer', 'Photo it for marking', 'Fix what the marking points out'],
    poem: ['Read the poem’s theme map', 'Note poetic devices and their effect', 'Write one short answer and photo it'],
    read: ['Do one passage with a 15-minute timer', 'Check answers and note the question types you missed'],
    write: ['Learn the format from the Inventory', 'Write one piece in 15 minutes', 'Photo it for marking'],
    gram: ['Read the rule summary in the Inventory', 'Do 10 short exercises without looking', 'Note the mistakes you repeat']
  };
  switch (b.t) {
    case 'study': return (c.id === 'gr' || /^fg/.test(c.id)) ? byKind.gram : (byKind[c.kind] || byKind.theory);
    case 'quick': return ['Formulas and key points only (Inventory card)', 'Do 4 past board questions', 'Mark anything shaky'];
    case 'pyq': return ['Solve past board questions from this chapter for 40 minutes', 'Check against the marking scheme', 'Log every lost mark'];
    case 'fix': return ['Open the chapter’s quick card', 'Redo questions where you lost marks', 'Do 3 fresh questions and photo one'];
    case 'check': return ['Answer the quick questions for each chapter', 'No book. Guessing is fine: it shows what to revise'];
    case 'rate': return ['Rate each chapter from 1 (shaky) to 5 (solid)', 'Be honest; it only decides where time goes'];
    case 'recall': return ['Take the recall quiz', 'Re-read only what you got wrong'];
    case 'paper': return ['Table, phone away, timer on', 'Write the full paper in exam conditions', 'Use a CBSE sample paper or past paper'];
    case 'review': return ['Mark it with the official marking scheme', 'Photo 2 answers you are unsure of for marking', 'Add every lost mark to the mistake log'];
    case 'half': return ['90-minute mixed paper, timed', 'Mark it straight after'];
    case 'sweep': return ['Read the quick cards of these chapters', 'Write formulas and reactions from memory', 'Re-read the memory hooks'];
    case 'pre': return ['Check tomorrow’s paper on the school timetable', 'Revise its formulas and notes', 'Sleep on time'];
  }
  return [];
}
function dotStyle(b){ if (b.s) return 'background:'+SUBJ[b.s].t+';color:'+SUBJ[b.s].tx; if (b.t === 'recall') return 'background:#F7E49A;color:#6B4A00'; return 'background:#E3DCC8;color:var(--ink)'; }
const markName = v => ({preboard:'school preboard exam', practical:'practical exam', school:'school day', off:'day off'})[v] || v;
export { blkTitle, unitName, unitMarks, groupName, blkSub, fmtMarks, blkSteps, dotStyle, markName };
