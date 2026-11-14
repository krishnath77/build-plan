// Chapter briefs written by the app itself (through askClaude10) the first time each one is needed.
// A brief is stored once at apps/c10/briefs/{chapterId} as {...brief, by:'ai', model, createdAt}; anyone on the access list
// may create a missing one, only an admin may replace it (rules: firestore.rules in the Flight Plan repo).
import { SUBJ, SUB_ORDER } from './data/subjects.js';
import { CH, CHAPTERS, chOf } from './data/chapters.js';
import { briefs, canWrite, aiReady, isAdmin, briefsReady, ui, render } from './appstate.js';
import { setDoc } from './persist.js';
import { askJSON, errCopy, lastModel } from './ai.js';
import { esc } from './ui/common.js';

/* ---------------- prompts ---------------- */

const FIELDS = '{"overview":"3-4 sentences: what this chapter is about and why it matters",'
  + '"pattern":"2-4 sentences on how this chapter is usually examined: typical question types and their marks, written as patterns",'
  + '"link":"ONE friendly line (under 25 words) tying the chapter to games, building, gadgets or everyday life",'
  + '"map":[{"n":"branch name","i":["short item under 14 words"]}],'
  + '"topics":[{"t":"topic title","b":"explanation in 3-6 plain sentences","k":["key point"],"f":["formula, rule or reaction"],"must":["must-do item"],"q":[{"m":2,"q":"question","a":"marking-scheme style answer"}],"x":["way marks are lost"]}],'
  + '"asked":["typical board-question type"],'
  + '"hooks":["original memory trick"],'
  + '"quick":{"q":[{"m":2,"q":"question","a":"answer"}],"pts":["last-day must-know point"]}}';

const STYLE = 'Reply with ONLY one JSON object, no text before or after it. Plain text with Unicode symbols (², √, π, →, ⇌, °), no LaTeX and no markdown. '
  + 'Be accurate and use only standard textbook content. Keep every string short and clear for a 15-year-old.';

// Extra instructions that depend on the subject and kind of chapter.
export function kindNotes(c){
  const out = [];
  const s = c.s, id = c.id;
  if (s === 'eng' && (c.kind === 'lit' || c.kind === 'poem')) out.push('This is a literature item (' + (c.kind === 'poem' ? 'a poem' : 'a prose piece or play') + '). Cover themes, characters (or the speaker), key events or imagery, the message and, for poems, the poetic devices and their effect. Never quote more than a few words of the text. "f" is an empty list for every topic.');
  if (s === 'eng' && c.kind === 'read') out.push('This is a reading-skills item, not a textbook chapter. Topics are the question types and strategies for this kind of passage. Each practice question must carry its own short original passage (under 90 words) followed by the question. "f" is an empty list.');
  if (s === 'eng' && id === 'gr') out.push('This is the grammar section: determiners, tenses, modals, subject-verb concord and reported speech. One topic per area with the rule, one common error and short exercises. "f" holds the rules as one-line formulas.');
  if (s === 'eng' && (id === 'w1' || id === 'w2')) out.push('This is a writing task. Give the format, the word limit, what the examiner looks for (content, expression, accuracy) and a model answer in the "a" field of a practice question. "f" holds the format elements in order.');
  if (s === 'fr') {
    out.push('This is French (018). Write the brief itself (overview, topics, key points, answers) in simple French at A2 level, and put a short English help line in brackets after each point so a beginner can follow. Keep "pattern" and "link" in English.');
    if (c.kind === 'lit') out.push('This is a lesson of the Class 10 French textbook (Entre Jeunes). Cover the lesson\'s vocabulary, expressions, key facts about French culture and civilisation, and what a short answer on it looks like. Do not copy lines from the book.');
    if (id === 'fr1') out.push('This is the comprehension section: an unseen passage with questions. Practice questions each carry a short original French passage (under 70 words).');
    if (id === 'fr2' || id === 'fr3') out.push('This is a writing task: give the format, the expected length, useful phrases and a model answer.');
    if (/^fg/.test(id)) out.push('This is grammar: for each rule give the form, a short example and the usual mistakes; practice questions are short exercises.');
  }
  if (s === 'sst' && id === 'h3') out.push('Cover ONLY sections 1 to 1.3 of this chapter, the part examined in the board paper. Leave out everything after section 1.3.');
  if (s === 'sst' && id === 'ec4') out.push('Cover ONLY the board-examined part of this chapter. The rest of the chapter is assessed through an internal project and must not appear in this brief.');
  if (s === 'sst' && id === 'mp') out.push('This item is MAP WORK for History and Geography (5 marks: History 2, Geography 3). Use one topic for History map items and one for Geography map items (including the Lifelines of National Economy items). In each topic "k" lists the items to locate or identify, with a short memory tip for where they are. Practice questions are map questions in words ("Locate and label ...").');
  if (s === 'sci' && ['s1', 's2', 's3', 's4'].includes(id)) out.push('"f" holds the key formulas, chemical equations and reactions for each topic.');
  if (s === 'sci' && c.kind === 'num') out.push('"f" holds the formulas and laws with their units. Include 2 numerical questions with worked answers.');
  if (s === 'math') out.push('"f" holds the formulas and results for each topic. Practice questions are board-style, with step-by-step answers in marking-scheme style.');
  return out;
}

const subjectLine = c => SUBJ[c.s].name + ' (paper: ' + SUBJ[c.s].paper + ')';
const marksLine = c => 'worth about ' + c.marks + ' of the 80 theory marks' + (c.est ? ' (an estimate)' : '');

function head(c){
  return 'You are writing a study brief for a CBSE Class 10 student preparing for the 2027 board exam (2026-27 syllabus, current NCERT book). '
    + 'Subject: ' + subjectLine(c) + '. Chapter: "' + c.name + '", ' + marksLine(c) + '.\n'
    + kindNotes(c).map(x => x + '\n').join('');
}

const COUNTS = 'Write 4-8 topics. Across all topics write 6-10 practice questions (in each topic\'s "q"), with marks spread like the board paper (some 1-mark, some 2 and 3, and longer ones where this subject has them), each answer written in marking-scheme style: short points, each worth a mark. '
  + '"asked": 4-6 typical board-question types for this chapter, labelled as patterns ("Often a 3-mark question asking you to..."), never as claims about a particular year\'s paper. '
  + '"map": 4-6 branches with 2-5 short items each. "hooks": 2-4 original memory tricks. "quick": 4 board-style questions with answers and 5-8 last-day must-know points. '
  + '"link": no game name and no brand name. Use [] for any list that does not apply to this chapter.';

// part: 'all' (one call), 'A' (overview, pattern, link, map, topics without questions), 'B' (questions, asked, hooks, quick)
export function briefPrompt(c, part, topicTitles){
  if (part === 'A') {
    return head(c) + 'Write the first half of the brief. Reply with this JSON shape, leaving each topic\'s "q" as [] and omitting "asked", "hooks" and "quick":\n' + FIELDS + '\n'
      + 'Write 4-8 topics, each with "b", "k", "f", "must" and "x" filled in. "map": 4-6 branches with 2-5 short items each. "link": no game name and no brand name.\n' + STYLE;
  }
  if (part === 'B') {
    return head(c) + 'The topics of this brief are: ' + (topicTitles || []).map(t => '"' + t + '"').join(', ') + '.\nWrite the second half. Reply with only this JSON shape:\n'
      + '{"topicQs":[{"t":"exact topic title from the list","q":[{"m":2,"q":"question","a":"marking-scheme style answer"}]}],"asked":["typical board-question type"],"hooks":["original memory trick"],"quick":{"q":[{"m":2,"q":"question","a":"answer"}],"pts":["last-day must-know point"]}}\n'
      + 'Across all topics write 6-10 practice questions with marks spread like the board paper, answers in marking-scheme style. "asked": 4-6 typical board-question types, labelled as patterns, never as claims about a particular year\'s paper. "hooks": 2-4 original memory tricks. "quick": 4 board-style questions with answers and 5-8 last-day must-know points.\n' + STYLE;
  }
  return head(c) + 'Reply with exactly this JSON shape:\n' + FIELDS + '\n' + COUNTS + '\n' + STYLE;
}

/* ---------------- shape checks ---------------- */

const str = (v, n) => (v == null ? '' : String(v)).trim().slice(0, n || 1500);
const strs = (a, n, len) => (Array.isArray(a) ? a : []).map(x => str(x, len || 400)).filter(Boolean).slice(0, n || 12);
const qlist = (a, n) => (Array.isArray(a) ? a : []).filter(x => x && typeof x === 'object' && str(x.q)).slice(0, n || 12)
  .map(x => ({ m: Number(x.m) > 0 && Number(x.m) <= 10 ? Number(x.m) : 0, q: str(x.q, 1500), a: str(x.a, 2000) }));

export function cleanBrief(r){
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const topics = (Array.isArray(r.topics) ? r.topics : []).filter(t => t && typeof t === 'object' && str(t.t)).slice(0, 10).map(t => ({
    t: str(t.t, 160), b: str(t.b, 2500), k: strs(t.k, 10), f: strs(t.f, 12), must: strs(t.must, 8), q: qlist(t.q, 6), x: strs(t.x, 8)
  }));
  const map = (Array.isArray(r.map) ? r.map : []).filter(b => b && str(b.n)).slice(0, 8).map(b => ({ n: str(b.n, 80), i: strs(b.i, 6, 200) }));
  const quick = r.quick && typeof r.quick === 'object' ? r.quick : {};
  return {
    overview: str(r.overview, 2000), pattern: str(r.pattern, 1500), link: str(r.link, 300), map, topics,
    asked: strs(r.asked, 8), hooks: strs(r.hooks, 6), quick: { q: qlist(quick.q, 6), pts: strs(quick.pts, 10) }
  };
}

// A brief the screens can render: has an overview, at least 3 topics (4-8 are asked for) and some questions to practise.
export function validBrief(b){
  if (!b || typeof b !== 'object') return false;
  if (!str(b.overview) || str(b.overview).length < 20) return false;
  if (!Array.isArray(b.topics) || b.topics.length < 3) return false;
  if (!b.topics.every(t => str(t.t) && (str(t.b) || (Array.isArray(t.k) && t.k.length)))) return false;
  if (!Array.isArray(b.map) || b.map.length < 2) return false;
  const nq = b.topics.reduce((a, t) => a + (t.q || []).length, 0) + ((b.quick && b.quick.q) || []).length;
  return nq >= 4;
}

// Put the second half's questions into the first half's topics (matched by title, then by position).
export function mergeParts(a, b){
  const A = cleanBrief(a), B = b && typeof b === 'object' ? b : {};
  if (!A) return null;
  const tq = Array.isArray(B.topicQs) ? B.topicQs : [];
  A.topics.forEach((t, i) => {
    const hit = tq.find(x => x && str(x.t).toLowerCase() === t.t.toLowerCase()) || tq[i];
    t.q = qlist(hit && hit.q, 6);
  });
  const quick = B.quick && typeof B.quick === 'object' ? B.quick : {};
  A.asked = strs(B.asked, 8); A.hooks = strs(B.hooks, 6); A.quick = { q: qlist(quick.q, 6), pts: strs(quick.pts, 10) };
  return A;
}

/* ---------------- building and saving ---------------- */

const status = {};      // chapterId -> { state: 'building' | 'error', err?: string, code?: string }
const inflight = {};    // chapterId -> promise
let running = 0; const waiting = [];

export const briefState = id => status[id] || null;
export const resetBriefStatus = () => { Object.keys(status).forEach(k => delete status[k]); Object.keys(inflight).forEach(k => delete inflight[k]); running = 0; waiting.length = 0; };
export const briefLink = id => { const b = briefs[id]; return b && b.link ? String(b.link) : ''; };
export const missingBriefs = () => CHAPTERS.filter(c => !briefs[c.id]);

const slot = () => new Promise(res => { if (running < 2) { running++; res(); } else waiting.push(res); });
const release = () => { const n = waiting.shift(); if (n) n(); else running--; };

async function generate(c){
  // One call first. If the reply is cut short or not in the right shape, try once more as two smaller calls and merge them.
  try {
    const r = cleanBrief(await askJSON('brief', briefPrompt(c, 'all')));
    if (validBrief(r)) return r;
  } catch (e) {
    if (!e || (e.code !== 'invalid_json' && e.code !== 'upstream_error')) throw e;
  }
  const a = cleanBrief(await askJSON('brief', briefPrompt(c, 'A')));
  if (!a || !a.topics.length) throw { code: 'invalid_json' };
  const b = await askJSON('brief', briefPrompt(c, 'B', a.topics.map(t => t.t)));
  const merged = mergeParts(a, b);
  if (!validBrief(merged)) throw { code: 'invalid_json' };
  return merged;
}

// Builds and saves one brief. Returns true when a brief now exists. force = admin "Regenerate" (replaces the saved one).
export function buildBrief(id, opts){
  const force = !!(opts && opts.force);
  if (inflight[id]) return inflight[id];
  const c = CH[id];
  if (!c || (briefs[id] && !force)) return Promise.resolve(!!briefs[id]);
  status[id] = { state: 'building' };
  const p = (async () => {
    await slot();
    try {
      render();
      const data = await generate(c);
      const doc = { ...data, by: 'ai', model: lastModel || '', createdAt: Date.now() };
      briefs[id] = doc;
      await setDoc('briefs/' + id, doc);
      delete status[id];
      return true;
    } catch (e) {
      status[id] = { state: 'error', code: (e && e.code) || 'unknown', err: errCopy(e) };
      return false;
    } finally { release(); delete inflight[id]; render(); }
  })();
  inflight[id] = p;
  render();
  return p;
}

// Called while a screen is drawn. Starts a build once, only after the saved briefs have loaded from the server.
export function ensureBrief(id){
  if (briefs[id] || status[id] || inflight[id] || !briefsReady() || !canWrite || !aiReady()) return;
  status[id] = { state: 'building' };
  setTimeout(() => { delete status[id]; buildBrief(id); }, 0);
}

export function retryBrief(id){ delete status[id]; return buildBrief(id); }

// The card shown where a brief will appear.
export function pendingBriefHTML(c){
  const st = status[c.id];
  if (st && st.state === 'building') return '<div class="card"><div class="row"><span class="spin"></span><b>Building this brief… (about a minute)</b></div><span class="small muted">' + esc(c.name) + '. It is saved once it is written, so it only has to be built once.</span></div>';
  if (st && st.state === 'error') return '<div class="card"><b>The brief did not build</b><span class="small" style="color:var(--warnInk)">' + esc(st.err) + '</span><button class="btn sm" style="align-self:flex-start" data-a="briefRetry" data-v="' + esc(c.id) + '">Try again</button></div>';
  if (!aiReady()) return '<div class="card"><b>' + esc(c.name) + '</b><span class="small muted">This brief has not been built yet. Connect to the internet and open it again.</span></div>';
  if (!briefsReady()) return '<div class="card"><div class="row"><span class="spin"></span><span class="small">Checking for a saved brief…</span></div></div>';
  if (!canWrite) return '<div class="card"><b>' + esc(c.name) + '</b><span class="small muted">This brief has not been built yet, and this account cannot save one.</span></div>';
  return '<div class="card"><div class="row"><span class="spin"></span><b>Building this brief… (about a minute)</b></div></div>';
}

/* ---------------- admin: regenerate one, build all missing ---------------- */

export function regenerate(id){ ui.confirmRegen = null; return buildBrief(id, { force: true }); }

const STOP_CODES = ['daily_cap', 'session_expired', 'not_granted', 'rate_limited'];

// Builds every missing brief, one at a time, with progress in ui.buildAll. Stops cleanly at the daily cap; running it again resumes.
export async function buildAllMissing(){
  if (!isAdmin || (ui.buildAll && ui.buildAll.running)) return;
  const todo = missingBriefs().map(c => c.id);
  if (!todo.length) { ui.buildAll = { running: false, total: 0, done: 0, failed: 0, stop: 'none' }; render(); return; }
  const st = ui.buildAll = { running: true, total: todo.length, done: 0, failed: 0, current: null, stop: null, cancel: false };
  let strikes = 0;
  render();
  for (const id of todo) {
    if (st.cancel) { st.stop = 'cancel'; break; }
    if (briefs[id]) { st.done++; continue; }
    st.current = id; render();
    delete status[id];
    const ok = await buildBrief(id);
    if (ok) { st.done++; strikes = 0; }
    else {
      const code = status[id] && status[id].code;
      st.failed++; strikes++;
      if (STOP_CODES.includes(code)) { st.stop = code; break; }
      if (strikes >= 3) { st.stop = 'errors'; break; }
    }
  }
  st.running = false; st.current = null; if (!st.stop) st.stop = 'done';
  render();
}
export function stopBuildAll(){ if (ui.buildAll) ui.buildAll.cancel = true; }

export const subjectBriefCounts = () => SUB_ORDER.map(s => { const cs = chOf(s); return { s, ready: cs.filter(c => briefs[c.id]).length, total: cs.length }; });
