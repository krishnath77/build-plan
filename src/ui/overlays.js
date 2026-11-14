import { SUBJ } from '../data/subjects.js';
import { CH } from '../data/chapters.js';
import { pad } from '../logic/dates.js';
import { $, esc, fmt, ico } from './common.js';
import { blkTitle, blkSub, blkSteps } from './blocks.js';
import { questContent } from './brief.js';
import { briefLink } from '../briefs.js';
import { ovQuiz } from './quiz.js';
import { ovAns } from './answer.js';
import { ovPyq } from './pyq.js';
import { state, plan, canWrite, aiReady, render } from '../appstate.js';

const ov = {kind:null};
function openOv(kind, data){ Object.keys(ov).forEach(k => delete ov[k]); Object.assign(ov, {kind}, data || {}); renderOv(); $('#ov').hidden = false; }
function closeOv(){ if (ov.timer) clearInterval(ov.timer); if (ov.ctl) try { ov.ctl.abort(); } catch(e){} Object.keys(ov).forEach(k => delete ov[k]); ov.kind = null; $('#ov').hidden = true; $('#ov').innerHTML = ''; render(); }
function renderOv(){
  const el = $('#ov'); let h = '';
  if (ov.kind === 'focus') h = ovFocus();
  else if (ov.kind === 'quiz') h = ovQuiz();
  else if (ov.kind === 'ans') h = ovAns();
  else if (ov.kind === 'pyq') h = ovPyq();
  el.innerHTML = h;
}
function ovFocus(){
  const day = plan.days[ov.d]; const b = day.b[ov.i]; const done = !!state.done[ov.d+'|'+ov.i];
  const total = (b.m || 50)*60; const left = ov.left ?? total; const frac = 1 - left/total;
  const mm = Math.floor(left/60), ss = left % 60; const C = 2*Math.PI*104;
  const steps = blkSteps(b);
  const sub = b.s ? SUBJ[b.s] : null;
  let actions = '';
  if (b.t === 'check') actions = '<button class="btn amber" data-a="checkFromBlk">Start the check</button>';
  else if (b.t === 'recall') actions = '<button class="btn amber" data-a="recallFromBlk">Start recall quiz</button>';
  else if (b.t === 'rate') actions = '<button class="btn amber" data-a="goRate">Open self-ratings</button>';
  else if (b.c || b.cs) actions = '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><button class="btn ghostd" data-a="noteFromBlk">Quick card</button><button class="btn ghostd" data-a="ansFromBlk" '+(!aiReady()?'disabled':'')+'>'+ico('camera',16)+' Photo answer</button></div>';
  else if (b.s) actions = '<button class="btn ghostd" data-a="ansFromBlk" '+(!aiReady()?'disabled':'')+'>'+ico('camera',16)+' Photo an answer for marking</button>';
  const content = questContent(b);
  return '<div class="sheet navy'+(content?' wide':'')+'" role="dialog" aria-modal="true" aria-label="Quest"><div class="between"><button class="iconbtn" data-a="closeOv" aria-label="Close">'+ico('back',18,2.4)+'</button><span class="small" style="color:var(--hud)">'+fmt(ov.d)+' · quest '+(ov.i+1)+' of '+day.b.length+'</span><span style="width:44px"></span></div>'
    + '<div class="stack" style="align-items:center;gap:4px;text-align:center"><span class="tag" style="color:'+(sub?'#BFD8F0':'var(--amber)')+'">'+esc(blkSub(b))+'</span><h2 style="font-size:22px;color:#fff">'+esc(blkTitle(b))+'</h2></div>'
    + (b.m ? '<div style="position:relative;width:220px;height:220px;align-self:center"><svg width="220" height="220" viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="104" fill="none" stroke="#3A3F4B" stroke-width="14"/><circle cx="120" cy="120" r="104" fill="none" stroke="#F2C230" stroke-width="14" stroke-linecap="butt" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*frac).toFixed(1)+'" transform="rotate(-90 120 120)"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="num" style="font-family:var(--display);font-size:50px;font-weight:600" aria-live="off">'+pad(mm)+':'+pad(ss)+'</span><span class="small" style="color:var(--hud)">of '+b.m+' min</span></div></div>' : '')
    + (steps.length ? '<div class="card steps" style="background:var(--navy2);color:#fff"><b class="small" style="color:var(--hud)">In this quest</b>' + steps.map((s,k) => '<button class="st" data-a="step" data-v="'+k+'" aria-pressed="'+!!(ov.st&&ov.st[k])+'"><span class="box">'+(ov.st&&ov.st[k]?ico('check',12,3.4):'')+'</span><span>'+esc(s)+'</span></button>').join('') + '</div>' : '')
    + (b.c && briefLink(b.c) ? '<span class="small" style="color:var(--hud)"><b style="color:var(--amber)">Where you see this:</b> '+esc(briefLink(b.c))+'</span>' : '')
    + actions
    + content
    + (b.m ? '<div class="row"><button class="btn ghostd" style="flex:1" data-a="timer">'+(ov.timer?'Pause':(ov.left!=null&&ov.left<total?'Resume':'Start timer'))+'</button><button class="btn amber" style="flex:1" data-a="doneBlk" '+(canWrite?'':'disabled')+'>'+(done?'Done ✓':'Mark done')+'</button></div>' : '')
    + '<span class="small" style="color:var(--hud);text-align:center">'+(ov.breakNow?'Break: 10 minutes. Stand up, drink water, look out of the window.':'After this: a 10-minute break away from the screen.')+'</span></div>';
}
export { ov, openOv, closeOv, renderOv, ovFocus };
