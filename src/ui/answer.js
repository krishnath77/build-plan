import { SUBJ, SUB_ORDER } from '../data/subjects.js';
import { CH, chOf } from '../data/chapters.js';
import { clamp } from '../logic/dates.js';
import { esc, todayStr, ico, toast } from './common.js';
import { ov, openOv, closeOv, renderOv } from './overlays.js';
import { state, answers, mistakes, canWrite, aiReady, touch } from '../appstate.js';
import { saveState, addDoc } from '../persist.js';
import { askJSON, errCopy } from '../ai.js';
import { buildGradePrompt } from '../qbank/grading.js';
import { pyqGraded } from './pyq.js';

/* --- answer check --- */
function openAns(preset){
  const s = (preset && preset.s) || SUB_ORDER[0]; const c = (preset && preset.c) || null;
  const base = {step:'setup', s, c: c || chOf(s).filter(x => x.kind!=='read')[0].id, mk:3, own:false, qtext:'', scheme:null, photos:[], res:null, err:null, showModel:false};
  if (preset && preset.pq) Object.assign(base, {step:'write', mk:preset.mk, own:true, qtext:preset.qtext, ref:preset.ref || '', pq:preset.pq, fromPyq:true});
  openOv('ans', base);
}
function ovAns(){
  let h = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Answer check"><div class="between"><button class="iconbtn" data-a="closeOv" aria-label="Close">'+ico('x',18,2.4)+'</button><h3>Answer check</h3><span style="width:44px"></span></div>';
  if (ov.step === 'setup') {
    h += '<div class="card"><div class="stack" style="gap:4px"><label for="aSub">Subject</label><select id="aSub" data-a="aSub">'+SUB_ORDER.map(s => '<option value="'+s+'" '+(ov.s===s?'selected':'')+'>'+SUBJ[s].name+'</option>').join('')+'</select></div>'
      + '<div class="stack" style="gap:4px"><label for="aCh">Chapter</label><select id="aCh" data-a="aCh">'+chOf(ov.s).filter(c => c.kind!=='read').map(c => '<option value="'+c.id+'" '+(ov.c===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></div>'
      + '<div class="stack" style="gap:4px"><span class="small muted" style="font-weight:600">Marks</span><div class="chips">'+[2,3,5].map(m => '<button class="chip sm" data-a="aMk" data-v="'+m+'" aria-pressed="'+(ov.mk===m)+'">'+m+' marks</button>').join('')+'</div></div></div>'
      + '<button class="btn" data-a="aGen">Give me a board-style question</button>'
      + '<div class="card"><label for="aOwn">Or use your own question (from a past paper or book)</label><textarea id="aOwn" placeholder="Type it here, or leave blank if the question is in your photo">'+esc(ov.qtext)+'</textarea><button class="btn ghost" data-a="aOwnGo">Use my question</button></div>';
    if (ov.err) h += '<span class="small" style="color:var(--warnInk)">'+esc(ov.err)+'</span>';
  } else if (ov.step === 'gen') {
    h += '<div class="card"><div class="row"><span class="spin"></span><span class="small">Writing a '+ov.mk+'-mark question…</span></div></div>';
  } else if (ov.step === 'write' || ov.step === 'grading') {
    const c = CH[ov.c];
    h += '<div class="card"><span class="tag" style="color:'+SUBJ[ov.s].tx+'">'+SUBJ[ov.s].name+' · '+esc(c.name)+' · '+ov.mk+' marks</span><span style="font-size:16px;white-space:pre-line">'+(ov.qtext ? esc(ov.qtext) : '<i>Question is in the photo.</i>')+'</span></div>'
      + '<div class="banner note small">Write the answer on paper in about '+Math.round(ov.mk*1.5+1)+' minutes, the way you would in the exam. Then photograph it in good light, flat, whole page visible.</div>'
      + (ov.photos.length ? '<div class="thumbs">'+ov.photos.map((p,k) => '<img src="'+p.url+'" alt="Answer photo '+(k+1)+'">').join('')+'</div>' : '')
      + (ov.step === 'grading' ? '<div class="card"><div class="row"><span class="spin"></span><span class="small">The examiner is marking your answer. This can take up to a minute.</span></div></div>'
        : '<div class="row"><button class="btn ghost" style="flex:1" data-a="aPhoto" '+(aiReady()?'':'disabled')+'>'+ico('camera',18)+(ov.photos.length?' Add another photo':' Add photo')+'</button>'+(ov.photos.length?'<button class="btn ghost" data-a="aClear">Clear</button>':'')+'</div><button class="btn amber" data-a="aGrade" '+(ov.photos.length?'':'disabled')+'>Mark my answer</button>')
      + (ov.err ? '<span class="small" style="color:var(--warnInk)">'+esc(ov.err)+'</span>' : '');
  } else if (ov.step === 'result') {
    const r = ov.res;
    if (!r.readable) {
      h += '<div class="card" style="background:var(--warnBg)"><b>Photo could not be read clearly</b><span class="small">'+esc(r.retakeAdvice || 'Retake it flat, in good light, with the whole answer in frame.')+'</span></div><button class="btn" data-a="aRetake">Retake photo</button>';
    } else {
      h += '<div class="row" style="gap:12px">'+(ov.photos[0]?'<img src="'+ov.photos[0].url+'" alt="Your answer" style="width:76px;height:96px;object-fit:cover;border-radius:10px">':'')+'<div class="stack" style="gap:2px"><span class="small muted">Your answer</span><span class="num" style="font-family:var(--display);font-size:40px;font-weight:700;line-height:1">'+esc(r.awarded)+'<span style="font-size:22px;color:var(--muted)"> / '+esc(r.max)+'</span></span><span class="small" style="color:var(--ok);font-weight:700">'+esc(r.summary||'')+'</span></div></div>'
        + '<div class="card" style="gap:0">'+(r.steps||[]).map(s => '<div class="between" style="padding:9px 0;border-bottom:1px solid #E7E1D0;align-items:flex-start"><div class="stack" style="gap:0;flex:1"><span class="small">'+esc(s.point)+'</span>'+(s.note?'<span class="tiny muted">'+esc(s.note)+'</span>':'')+'</div><span class="pill num" style="'+(Number(s.awarded)>=Number(s.max)?'background:var(--okBg);color:var(--ok)':'background:var(--warnBg);color:var(--warnInk)')+'">'+esc(s.awarded)+' / '+esc(s.max)+'</span></div>').join('')+'</div>'
        + (r.fix ? '<div class="card" style="background:var(--amberBg)"><b class="small" style="color:var(--amberInk)">How to get full marks</b><span class="small">'+esc(r.fix)+'</span></div>' : '')
        + (Number(r.awarded) < Number(r.max) ? '<span class="small muted">Added to your mistake log. It comes back in recall.</span>' : '')
        + (ov.showModel ? '<div class="card"><b class="small">Model answer</b><span class="small" style="white-space:pre-line">'+esc(r.modelAnswer||'')+'</span></div>' : '<button class="btn ghost" data-a="aModel">Show the model answer</button>')
        + (ov.fromPyq ? '<button class="btn" data-a="pqBack">Back to practice</button>' : '<button class="btn" data-a="aAgain">Try a similar question</button>');
    }
  }
  return h + '</div>';
}
async function ansGenerate(){
  ov.step = 'gen'; ov.err = null; renderOv();
  const c = CH[ov.c];
  const prompt = 'Write one CBSE Class 10 board-exam style written question worth '+ov.mk+' marks for '+SUBJ[c.s].name+', chapter "'+c.name+'" (2026-27 syllabus, current NCERT book; the 2027 board exam). Choose the kind of question that appears often in past CBSE papers for this chapter'+(ov.mk===5?' (a long answer or multi-part problem)':'')+'. Plain text with Unicode symbols, no LaTeX. '+(ov.avoid?'Do not repeat this earlier question: '+ov.avoid+'. ':'')
    + 'Also give the CBSE-style marking scheme. Reply with only JSON: {"question":"...","scheme":[{"point":"what earns the mark","marks":1}]}';
  try {
    const r = await askJSON('question', prompt);
    if (ov.kind !== 'ans') return;
    if (!r || typeof r.question !== 'string') throw {code:'invalid_json'};
    ov.qtext = r.question; ov.scheme = Array.isArray(r.scheme) ? r.scheme : null; ov.step = 'write';
  } catch (e) { if (ov.kind !== 'ans') return; ov.step = 'setup'; ov.err = errCopy(e); }
  renderOv();
}
async function shrink(file){
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 1600/Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth*k); cv.height = Math.round(img.naturalHeight*k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
    return {blob: blob || file, url};
  } catch (e) { return {blob:file, url:URL.createObjectURL(file)}; }
}
async function ansGrade(){
  ov.step = 'grading'; ov.err = null; renderOv();
  const c = CH[ov.c];
  const prompt = buildGradePrompt({subjectName:SUBJ[c.s].name, chapterName:c.name, photoCount:ov.photos.length, marks:ov.mk, qtext:ov.qtext, scheme:ov.scheme, ref:ov.ref});
  try {
    const r = await askJSON('grade', prompt, {images: ov.photos.map(p => p.blob)});
    if (ov.kind !== 'ans') return;
    if (!r || typeof r !== 'object') throw {code:'invalid_json'};
    r.readable = r.readable !== false; r.max = Number(r.max) || ov.mk; r.awarded = clamp(Number(r.awarded) || 0, 0, r.max);
    ov.res = r; ov.step = 'result';
    if (r.readable) {
      const q = ov.qtext || (r.steps && r.steps[0] && r.steps[0].point) || 'Question from photo';
      addDoc('answers', {d:todayStr(), at:Date.now(), s:c.s, ch:c.id, q, got:r.awarded, max:r.max, fix:r.fix||'', ...(ov.pq ? {source:'pyq', qid:ov.pq.qid, familyId:ov.pq.familyId, chapter:c.id, marks:r.max, score:r.awarded} : {})});
      if (ov.pq) pyqGraded(ov.pq, r.awarded, r.max);
      if (canWrite) { const x = state.ch[c.id] = state.ch[c.id] || {}; x.an = {got:(x.an?x.an.got:0) + r.awarded, max:(x.an?x.an.max:0) + r.max}; touch(); saveState(); }
      if (r.awarded < r.max) addDoc('mistakes', {ch:c.id, q, a:r.fix || 'See model answer', d:todayStr(), at:Date.now(), src:'answer', fixed:false});
      toast('+10 XP · answer marked');
    }
  } catch (e) { if (ov.kind !== 'ans') return; ov.step = 'write'; ov.err = errCopy(e); }
  renderOv();
}
export { openAns, ovAns, ansGenerate, shrink, ansGrade };
