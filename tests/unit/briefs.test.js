// Briefs written by the app: prompts, shape checks, the save, the retry, the admin actions and the daily-cap stop.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ai = { askJSON: vi.fn(), model: 'claude-sonnet-5-5' };
vi.mock('../../src/ai.js', () => ({
  askJSON: (...a) => ai.askJSON(...a),
  errCopy: e => 'copy:' + (e && e.code),
  get lastModel() { return ai.model; }
}));
const saved = [];
vi.mock('../../src/persist.js', () => ({ setDoc: async (p, d) => { saved.push({ path: p, data: d }); } }));

const B = await import('../../src/briefs.js');
const A = await import('../../src/appstate.js');
const { CHAPTERS, CH } = await import('../../src/data/chapters.js');

const good = (n = 4) => ({
  overview: 'A clear three-sentence overview of the chapter so a student knows what it covers and why.',
  pattern: 'Often a 3-mark question and a 5-mark question.',
  link: 'Builders use this every day.',
  map: [{ n: 'Branch one', i: ['a', 'b'] }, { n: 'Branch two', i: ['c'] }],
  topics: Array.from({ length: n }, (_, i) => ({ t: 'Topic ' + (i + 1), b: 'Explanation ' + i, k: ['k'], f: ['f'], must: ['m'], q: [{ m: 2, q: 'Question ' + i + '?', a: 'Answer' }], x: ['x'] })),
  asked: ['A 3-mark question asking you to explain'], hooks: ['A memory trick'], quick: { q: [{ m: 1, q: 'Quick?', a: 'Yes' }], pts: ['Point'] }
});
const partA = () => { const b = good(4); b.topics.forEach(t => { t.q = []; }); delete b.asked; delete b.hooks; delete b.quick; return b; };
const partB = () => ({ topicQs: [1, 2, 3, 4].map(i => ({ t: 'Topic ' + i, q: [{ m: 2, q: 'Q' + i + '?', a: 'A' }, { m: 3, q: 'Q' + i + 'b?', a: 'A' }] })), asked: ['Pattern'], hooks: ['Hook'], quick: { q: [{ m: 2, q: 'Quick?', a: 'A' }], pts: ['P'] } });

beforeEach(() => {
  ai.askJSON = vi.fn(); ai.model = 'claude-sonnet-5-5'; saved.length = 0;
  B.resetBriefStatus(); A.setBriefs({}); A.setBriefsLoaded(true); A.setIsAdmin(false); A.setCanWrite(true); A.ui.buildAll = null; A.ui.confirmRegen = null;
});

describe('prompt', () => {
  const p = id => B.briefPrompt(CH[id], 'all');
  it('names the class, exam year, syllabus, book, subject paper, chapter and marks', () => {
    const t = p('m6');
    ['CBSE Class 10', '2027 board exam', '2026-27 syllabus', 'current NCERT book', 'Mathematics Standard (041)', '"Triangles"', '8 of the 80 theory marks'].forEach(x => expect(t).toContain(x));
    expect(t).not.toContain('Class 12');
  });
  it('asks for exactly the JSON the brief screen renders', () => {
    const t = p('m6');
    ['"overview"', '"pattern"', '"link"', '"map":[{"n"', '"topics":[{"t"', '"b"', '"k"', '"f"', '"must"', '"q":[{"m"', '"x"', '"asked"', '"hooks"', '"quick":{"q"', '"pts"'].forEach(x => expect(t).toContain(x));
    expect(t).toContain('4-8 topics');
    expect(t).toContain('6-10 practice questions');
    expect(t).toContain('marking-scheme style');
    expect(t).toContain('never as claims about a particular');
    expect(t).toContain('no game name and no brand name');
  });
  it('English literature: themes, characters, message, devices, never more than a few words quoted', () => {
    const t = p('ff1');
    expect(t).toContain('themes'); expect(t).toContain('characters'); expect(t).toContain('message'); expect(t).toContain('poetic devices');
    expect(t).toContain('Never quote more than a few words');
    expect(p('fp1')).toContain('a poem');
  });
  it('French: simple French with short English help lines', () => {
    ['fc4', 'fg1', 'fr1'].forEach(id => { expect(p(id)).toContain('simple French'); expect(p(id)).toContain('English help line'); });
    expect(CH.fc4.name).toBe('L5 Les médias');
  });
  it('Social Science: only the board part of h3 and ec4; map items for mp', () => {
    expect(p('h3')).toContain('ONLY sections 1 to 1.3');
    expect(p('ec4')).toContain('ONLY the board-examined part');
    expect(p('mp')).toContain('MAP WORK');
    expect(p('mp')).toContain('Lifelines of National Economy');
    expect(p('h1')).not.toContain('ONLY sections');
    expect(p('h1')).not.toContain('ONLY the board');
  });
  it('Science s1-s4 ask for formulas, equations and reactions', () => {
    ['s1', 's2', 's3', 's4'].forEach(id => expect(p(id)).toContain('chemical equations and reactions'));
  });
  it('the split halves cover the two groups of fields', () => {
    const a = B.briefPrompt(CH.m6, 'A'), b = B.briefPrompt(CH.m6, 'B', ['Topic 1', 'Topic 2']);
    expect(a).toContain('first half'); expect(a).toContain('"overview"');
    expect(b).toContain('second half'); expect(b).toContain('"topicQs"'); expect(b).toContain('"Topic 1", "Topic 2"'); expect(b).toContain('"hooks"'); expect(b).toContain('"quick"');
  });
  it('every chapter prompt (all three shapes) fits the function limit of 20,000 characters', () => {
    CHAPTERS.forEach(c => ['all', 'A', 'B'].forEach(part => expect(B.briefPrompt(c, part, ['t1', 't2', 't3', 't4']).length).toBeLessThan(20000)));
  });
});

describe('shape checks', () => {
  it('accepts a complete brief and cleans it', () => {
    const c = B.cleanBrief(good());
    expect(B.validBrief(c)).toBe(true);
    expect(c.topics.length).toBe(4);
  });
  it('rejects a cut-off or wrong-shaped reply', () => {
    expect(B.validBrief(null)).toBe(false);
    expect(B.validBrief(B.cleanBrief({ overview: 'short' }))).toBe(false);
    expect(B.validBrief(B.cleanBrief({ ...good(), topics: good(2).topics }))).toBe(false);
    expect(B.validBrief(B.cleanBrief({ ...good(), map: [] }))).toBe(false);
    expect(B.cleanBrief('text')).toBe(null);
  });
  it('merges the second half into the first by topic title', () => {
    const m = B.mergeParts(partA(), partB());
    expect(B.validBrief(m)).toBe(true);
    expect(m.topics[2].q.map(q => q.q)).toEqual(['Q3?', 'Q3b?']);
    expect(m.hooks).toEqual(['Hook']);
  });
});

describe('building and saving', () => {
  it('writes one call, saves {...brief, by, model, createdAt} at briefs/{id}, and shows it', async () => {
    ai.askJSON.mockResolvedValue(good());
    expect(await B.buildBrief('m6')).toBe(true);
    expect(ai.askJSON).toHaveBeenCalledTimes(1);
    expect(ai.askJSON.mock.calls[0][0]).toBe('brief');
    expect(saved.length).toBe(1);
    expect(saved[0].path).toBe('briefs/m6');
    expect(saved[0].data).toMatchObject({ by: 'ai', model: 'claude-sonnet-5-5' });
    expect(typeof saved[0].data.createdAt).toBe('number');
    expect(saved[0].data.topics.length).toBe(4);
    expect(A.briefs.m6).toBeTruthy();
    expect(B.briefState('m6')).toBe(null);
  });
  it('shows "Building this brief… (about a minute)" while it works', async () => {
    let release; ai.askJSON.mockImplementation(() => new Promise(r => { release = r; }));
    const p = B.buildBrief('m6');
    expect(B.pendingBriefHTML(CH.m6)).toContain('Building this brief… (about a minute)');
    await new Promise(r => setTimeout(r, 5));
    release(good()); await p;
  });
  it('does not call again while one build is running, or for a brief that exists', async () => {
    ai.askJSON.mockResolvedValue(good());
    await Promise.all([B.buildBrief('m6'), B.buildBrief('m6')]);
    expect(ai.askJSON).toHaveBeenCalledTimes(1);
    await B.buildBrief('m6');
    expect(ai.askJSON).toHaveBeenCalledTimes(1);
  });
  it('a reply that is cut short is retried once as two smaller calls and merged', async () => {
    ai.askJSON.mockRejectedValueOnce({ code: 'invalid_json' }).mockResolvedValueOnce(partA()).mockResolvedValueOnce(partB());
    expect(await B.buildBrief('m7')).toBe(true);
    expect(ai.askJSON).toHaveBeenCalledTimes(3);
    expect(saved[0].path).toBe('briefs/m7');
    expect(saved[0].data.topics[0].q.length).toBe(2);
  });
  it('a wrong shape is also retried as two calls', async () => {
    ai.askJSON.mockResolvedValueOnce({ overview: 'x' }).mockResolvedValueOnce(partA()).mockResolvedValueOnce(partB());
    expect(await B.buildBrief('m8')).toBe(true);
    expect(ai.askJSON).toHaveBeenCalledTimes(3);
  });
  it('after the retry fails it shows a friendly message with a Try again button, and saves nothing', async () => {
    ai.askJSON.mockRejectedValue({ code: 'invalid_json' });
    expect(await B.buildBrief('m9')).toBe(false);
    expect(saved.length).toBe(0);
    const html = B.pendingBriefHTML(CH.m9);
    expect(html).toContain('Try again'); expect(html).toContain('data-a="briefRetry"'); expect(html).toContain('data-v="m9"');
    ai.askJSON.mockResolvedValue(good());
    expect(await B.retryBrief('m9')).toBe(true);
    expect(A.briefs.m9).toBeTruthy();
  });
  it('does not retry on a daily-cap or access error', async () => {
    ai.askJSON.mockRejectedValue({ code: 'daily_cap' });
    expect(await B.buildBrief('m10')).toBe(false);
    expect(ai.askJSON).toHaveBeenCalledTimes(1);
    expect(B.briefState('m10').code).toBe('daily_cap');
  });
  it('ensureBrief waits for the saved briefs to load, then builds a missing one once', async () => {
    ai.askJSON.mockResolvedValue(good());
    A.setBriefsLoaded(false);
    B.ensureBrief('m11');
    await new Promise(r => setTimeout(r, 10));
    expect(ai.askJSON).not.toHaveBeenCalled();
    A.setBriefsLoaded(true);
    B.ensureBrief('m11'); B.ensureBrief('m11');
    await new Promise(r => setTimeout(r, 30));
    expect(ai.askJSON).toHaveBeenCalledTimes(1);
    expect(A.briefs.m11).toBeTruthy();
  });
  it('ensureBrief never builds when the brief exists or the account cannot save', async () => {
    A.setBriefs({ m12: good() });
    B.ensureBrief('m12');
    A.setCanWrite(false); B.ensureBrief('m13');
    await new Promise(r => setTimeout(r, 20));
    expect(ai.askJSON).not.toHaveBeenCalled();
    A.setCanWrite(true);
  });
  it('the saved link is what the screens show as "where you see this"', () => {
    A.setBriefs({ m6: good() });
    expect(B.briefLink('m6')).toBe('Builders use this every day.');
    expect(B.briefLink('m1')).toBe('');
  });
});

describe('admin actions', () => {
  it('Regenerate replaces an existing brief', async () => {
    A.setBriefs({ m6: { ...good(), overview: 'OLD overview that is long enough to pass the check.' } });
    ai.askJSON.mockResolvedValue(good());
    expect(await B.regenerate('m6')).toBe(true);
    expect(saved[0].path).toBe('briefs/m6');
    expect(A.briefs.m6.overview).not.toContain('OLD');
  });
  it('Build all builds the missing briefs one at a time and stops cleanly at the daily cap', async () => {
    A.setIsAdmin(true);
    A.setBriefs({ m1: good() });
    ai.askJSON.mockResolvedValueOnce(good()).mockResolvedValueOnce(good()).mockRejectedValue({ code: 'daily_cap' });
    await B.buildAllMissing();
    const st = A.ui.buildAll;
    expect(st.running).toBe(false);
    expect(st.stop).toBe('daily_cap');
    expect(st.done).toBe(2);
    expect(st.total).toBe(CHAPTERS.length - 1);
    expect(saved.map(s => s.path)).toEqual(['briefs/m2', 'briefs/m3']);
    expect(ai.askJSON).toHaveBeenCalledTimes(3); // the cap error is not retried
    // next time it resumes with only the ones still missing
    expect(B.missingBriefs().length).toBe(CHAPTERS.length - 3);
  });
  it('Build all does nothing for a non-admin', async () => {
    await B.buildAllMissing();
    expect(ai.askJSON).not.toHaveBeenCalled();
    expect(A.ui.buildAll).toBe(null);
  });
  it('Build all can be stopped after the current brief', async () => {
    A.setIsAdmin(true);
    ai.askJSON.mockImplementation(async () => { B.stopBuildAll(); return good(); });
    await B.buildAllMissing();
    expect(A.ui.buildAll.stop).toBe('cancel');
    expect(A.ui.buildAll.done).toBe(1);
  });
});
