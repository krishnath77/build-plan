import { SUBJ } from '../data/subjects.js';
import { CH } from '../data/chapters.js';
import { esc } from './common.js';
import { briefs, canWrite, ui } from '../appstate.js';
import { ensureBrief, pendingBriefHTML } from '../briefs.js';
import { questBoardHTML, paperSuggestHTML } from './board.js';

/* --- chapter briefs (written content) --- */
function arr(x){ return Array.isArray(x) ? x : []; }
function qaHTML(q){
  return '<div class="qa"><div class="row" style="gap:8px;align-items:flex-start"><span class="pill" style="background:#EAE4D2;color:var(--ink)">'+esc(q.m ? q.m+(q.m==1?' mark':' marks') : 'Q')+'</span><span style="white-space:pre-line">'+esc(q.q)+'</span></div>'
    + (q.a ? '<details><summary>Show answer</summary><div class="ans">'+esc(q.a)+'</div></details>' : '') + '</div>';
}
function topicHTML(t, c){
  const col = SUBJ[c.s].tx;
  let h = '<div class="card topic"><h3 style="color:'+col+'">'+esc(t.t)+'</h3>';
  if (t.b) h += '<span style="font-size:15px;white-space:pre-line">'+esc(t.b)+'</span>';
  if (arr(t.k).length) h += '<span class="secttl">Key points</span><ul class="lst">'+arr(t.k).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>';
  if (arr(t.f).length) h += '<span class="secttl">'+(c.s==='sci' && ['s1','s2','s3','s4'].includes(c.id) ? 'Formulas and reactions' : 'Formulas')+'</span><div class="fx">'+arr(t.f).map(x => '<span>'+esc(x)+'</span>').join('')+'</div>';
  if (arr(t.must).length) h += '<span class="secttl">Must do</span><ul class="lst">'+arr(t.must).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>';
  if (arr(t.q).length) h += '<span class="secttl">How it’s asked</span>'+arr(t.q).map(qaHTML).join('');
  if (arr(t.x).length) h += '<span class="secttl" style="color:var(--warnInk)">Marks are lost when</span><ul class="lst">'+arr(t.x).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>';
  return h + '</div>';
}
function mapHTML(br, c){
  return '<div class="grid2">' + arr(br.map).map(b => '<div class="branch" style="--c:'+SUBJ[c.s].c+'"><b class="small" style="color:'+SUBJ[c.s].tx+'">'+esc(b.n)+'</b>'+arr(b.i).map(i => '<span class="small">'+esc(i)+'</span>').join('')+'</div>').join('') + '</div>';
}
function partPlan(br, b){
  const T = arr(br.topics).length, n = b.n || 1, k = b.k || 1;
  if (!T) return {practice:true, list:[]};
  const L = n >= 3 ? Math.min(T, n-1) : Math.min(T, n);
  if (k > L) return {practice:true, list:[]};
  const a = Math.floor((k-1)*T/L), z = Math.floor(k*T/L);
  return {practice:false, list: br.topics.slice(a, Math.max(z, a+1))};
}
function allQs(br){ return arr(br.topics).flatMap(t => arr(t.q).map(q => ({...q, topic:t.t}))); }
function questContent(b){
  const ids = b.t === 'sweep' ? arr(b.cs) : (b.c ? (b.cs && b.t !== 'sweep' ? b.cs : [b.c]) : []);
  if (b.t === 'paper' || b.t === 'half') return paperSuggestHTML(b);
  if (!ids.length || ['recall','check','rate','paper','review','half','pre','final'].includes(b.t)) return '';
  let h = '';
  ids.forEach(id => {
    const c = CH[id], br = briefs[id];
    if (!br) { ensureBrief(id); h += pendingBriefHTML(c); return; }
    if (ids.length > 1) h += '<h2 style="color:#fff;margin-top:6px">'+esc(c.name)+'</h2>';
    if (b.t === 'quick') {
      const qp = br.quick || {};
      h += '<div class="card"><span class="secttl">Quick pass · must-know</span><ul class="lst">'+arr(qp.pts).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
      if (br.pattern) h += '<div class="card"><span class="secttl">How this chapter is asked</span><span class="small" style="white-space:pre-line">'+esc(br.pattern)+'</span></div>';
      if (arr(qp.q).length) h += '<div class="card"><span class="secttl">Board-style questions</span>'+arr(qp.q).map(qaHTML).join('')+'</div>';
    } else if (b.t === 'sweep') {
      h += mapHTML(br, c);
      if (arr(br.hooks).length) h += '<div class="card"><span class="secttl">Memory hooks</span><ul class="lst">'+arr(br.hooks).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
    } else if (b.t === 'fix') {
      const xs = arr(br.topics).flatMap(t => arr(t.x));
      h += '<div class="card"><span class="secttl" style="color:var(--warnInk)">Where marks usually slip</span><ul class="lst">'+xs.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
      h += '<div class="card"><span class="secttl">Redo these</span>'+allQs(br).slice(0,6).map(qaHTML).join('')+'</div>';
    } else if (b.t === 'pyq') {
      if (br.pattern) h += '<div class="card"><span class="secttl">How this chapter is asked</span><span class="small" style="white-space:pre-line">'+esc(br.pattern)+'</span></div>';
      if (arr(br.asked).length) h += '<div class="card"><span class="secttl">Asked often</span><ul class="lst">'+arr(br.asked).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
      h += '<div class="card"><span class="secttl">Practice set</span>'+allQs(br).map(qaHTML).join('')+'</div>';
    } else {
      const pp = partPlan(br, b);
      if (pp.practice) {
        h += '<div class="card"><span class="secttl">Practice round</span><span class="small">All topics are covered. This quest is for questions: solve them on paper first, then reveal the answers.</span></div>';
        h += '<div class="card">'+allQs(br).map(qaHTML).join('')+'</div>';
      } else {
        if ((b.k||1) === 1 && br.overview) h += '<div class="card"><span class="secttl">Chapter brief</span><span style="font-size:15px;white-space:pre-line">'+esc(br.overview)+'</span>'+(br.pattern?'<span class="secttl">How it’s asked</span><span class="small" style="white-space:pre-line">'+esc(br.pattern)+'</span>':'')+'</div>';
        h += '<span class="small" style="color:var(--hud)">Topics for this quest: '+pp.list.map(t => esc(t.t)).join(', ')+'</span>';
        h += pp.list.map(t => topicHTML(t, c)).join('');
      }
    }
    h += '<button class="btn sm ghostd" style="align-self:flex-start" data-a="openBrief" data-v="'+id+'">Full chapter brief and memory map</button>';
  });
  return h + questBoardHTML(ids);
}
function renderBrief(c, br){
  let h = '<div class="chips">' + [['map','Memory map'],['topics','Topics'],['qs','Questions'],['tricks','Tricks']].map(([v,l]) => '<button class="chip sm" data-a="noteTab" data-v="'+v+'" aria-pressed="'+(ui.noteTab===v)+'">'+l+'</button>').join('') + '</div>';
  if (ui.noteTab === 'map') {
    if (br.overview) h += '<span style="font-size:15px;white-space:pre-line">'+esc(br.overview)+'</span>';
    h += mapHTML(br, c);
  }
  if (ui.noteTab === 'topics') h += arr(br.topics).map(t => topicHTML(t, c)).join('');
  if (ui.noteTab === 'qs') {
    if (br.pattern) h += '<div class="card"><span class="secttl">How this chapter is asked</span><span class="small" style="white-space:pre-line">'+esc(br.pattern)+'</span></div>';
    if (arr(br.asked).length) h += '<div class="card"><span class="secttl">Asked often in board papers</span><ul class="lst">'+arr(br.asked).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul><span class="tiny muted">These are typical patterns, not claims about particular papers.</span></div>';
    h += '<div class="card"><span class="secttl">Practice questions</span>'+allQs(br).map(qaHTML).join('')+'</div>';
    if (br.quick && arr(br.quick.q).length) h += '<div class="card"><span class="secttl">Quick-pass questions</span>'+arr(br.quick.q).map(qaHTML).join('')+'</div>';
  }
  if (ui.noteTab === 'tricks') {
    h += '<div class="card dark"><b style="color:var(--amber)">Memory hooks</b><ul class="lst">'+arr(br.hooks).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
    const xs = arr(br.topics).flatMap(t => arr(t.x));
    if (xs.length) h += '<div class="card"><b>Marks are lost when</b><ul class="lst">'+xs.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
    if (br.quick && arr(br.quick.pts).length) h += '<div class="card"><b>Last-day must-knows</b><ul class="lst">'+arr(br.quick.pts).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul></div>';
  }
  h += '<div class="card"><b class="small">Spotted something wrong or unclear?</b><label class="sr" for="repTxt">Describe the problem</label><textarea id="repTxt" placeholder="Tell us what looks wrong, and where"></textarea><button class="btn sm ghost" style="align-self:flex-start" data-a="report" data-v="'+c.id+'" '+(canWrite?'':'disabled')+'>Report a problem</button></div>';
  return h;
}
export { arr, qaHTML, topicHTML, mapHTML, partPlan, allQs, questContent, renderBrief };
