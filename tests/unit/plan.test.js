// Plan checks on Class 10 data (Tejas): same checks as the Class 12 app, on the Class 10 chapters, phases and exams.
import { describe, it, expect } from 'vitest';
import { buildPlan, checkBlocks } from '../../src/logic/plan.js';
import { CHAPTERS, UNITS, CH } from '../../src/data/chapters.js';
import { SUBJ, SUB_ORDER } from '../../src/data/subjects.js';
import { PH, PLAN_END } from '../../src/data/phases.js';
import { addDays } from '../../src/logic/dates.js';

const baseState = (over = {}) => ({ v: 1, ch: {}, done: {}, energy: {}, marked: {}, pre: {}, B: 4, ...over });
const START = '2026-11-19';
const plan = buildPlan(baseState(), null, START);
const days = Object.keys(plan.days).sort();
const blocksOf = (p, phase) => days.flatMap(d => (p.days[d] && p.days[d].p === phase) ? p.days[d].b : []);
const studyOf = (p, id, phase = 'P1') => Object.keys(p.days).reduce((n, d) => n + (p.days[d].p === phase ? p.days[d].b.filter(b => b.t === 'study' && (b.cs || [b.c]).includes(id)).length : 0), 0);

describe('Class 10 data', () => {
  it('has 5 subjects in exam order, 80 theory marks each', () => {
    expect(SUB_ORDER).toEqual(['math', 'sci', 'eng', 'fr', 'sst']);
    expect(SUB_ORDER.map(s => SUBJ[s].exam)).toEqual(['2027-02-17', '2027-02-22', '2027-02-26', '2027-03-06', '2027-03-08']);
    SUB_ORDER.forEach(s => expect(SUBJ[s].theory).toBe(80));
  });
  it('chapter marks add up to 80 per subject', () => {
    SUB_ORDER.forEach(s => expect(Math.round(CHAPTERS.filter(c => c.s === s).reduce((a, c) => a + c.marks, 0))).toBe(80));
  });
});

describe('plan shape', () => {
  it('has 90 days from 2026-11-19 to 2027-02-16 and nothing after PLAN_END', () => {
    expect(PLAN_END).toBe('2027-02-16');
    expect(days.length).toBe(90);
    expect(days[0]).toBe('2026-11-19');
    expect(days[days.length - 1]).toBe('2027-02-16');
    days.forEach(d => expect(d <= PLAN_END).toBe(true));
  });

  it('phase day counts: CHK 3, P1 40, P2 31, P3 10, FW 6', () => {
    const by = {};
    days.forEach(d => { const p = plan.days[d].p; by[p] = (by[p] || 0) + 1; });
    expect(by).toEqual({ CHK: 3, P1: 40, P2: 31, P3: 10, FW: 6 });
    expect(PH.map(p => p.id)).toEqual(['CHK', 'P1', 'P2', 'P3', 'FW']);
  });

  it('every unit gets revision slots in P1 (no unit is left out)', () => {
    const covered = new Set();
    blocksOf(plan, 'P1').forEach(b => { if (b.t === 'study') (b.cs || [b.c]).forEach(id => covered.add(id)); });
    const missing = CHAPTERS.filter(c => !covered.has(c.id)).map(c => c.id);
    expect(missing).toEqual([]);
    expect(UNITS.every(u => studyOf(plan, u.id) > 0)).toBe(true);
  });

  it('still covers every unit with special days marked (preboards, school days, a day off)', () => {
    const st = baseState({ marked: { '2026-12-10': 'preboard', '2026-12-11': 'preboard', '2026-12-14': 'preboard', '2026-12-15': 'school', '2026-12-18': 'off', '2026-12-21': 'preboard' } });
    const p = buildPlan(st, null, START);
    const covered = new Set();
    Object.values(p.days).forEach(x => { if (x.p === 'P1') x.b.forEach(b => { if (b.t === 'study') (b.cs || [b.c]).forEach(id => covered.add(id)); }); });
    expect(CHAPTERS.filter(c => !covered.has(c.id)).map(c => c.id)).toEqual([]);
    expect(p.days['2026-12-18'].b).toEqual([]);
  });

  it('the starting check covers every checkable chapter exactly once and skips reading/writing items', () => {
    const got = blocksOf(plan, 'CHK').filter(b => b.t === 'check').flatMap(b => b.cs);
    const want = CHAPTERS.filter(c => c.kind !== 'read' && c.kind !== 'write').map(c => c.id);
    expect([...got].sort()).toEqual([...want].sort());
    expect(new Set(got).size).toBe(got.length);
    expect(checkBlocks().length).toBeGreaterThan(5);
  });

  it('no day is over 330 minutes', () => {
    let mx = 0;
    days.forEach(d => { mx = Math.max(mx, plan.days[d].b.reduce((a, b) => a + (b.m || 0), 0)); });
    expect(mx).toBeLessThanOrEqual(330);
  });

  it('a full day has the chosen number of quests (default 4)', () => {
    // 2026-11-23 is a Monday in P1: 2 heavy + 1 light study blocks + 1 recall
    expect(plan.days['2026-11-23'].b.length).toBe(4);
    const three = buildPlan(baseState({ B: 3 }), null, START);
    expect(three.days['2026-11-23'].b.length).toBe(3);
    const six = buildPlan(baseState({ B: 6 }), null, START);
    expect(six.days['2026-11-23'].b.length).toBe(6);
  });

  it('Sundays are half days and a day off has no quests', () => {
    expect(plan.days['2026-11-22'].h).toBe('half'); // Sunday
    const off = buildPlan(baseState({ marked: { '2026-12-02': 'off' } }), null, START);
    expect(off.days['2026-12-02'].b).toEqual([]);
  });
});

describe('time goes where the marks, difficulty and weakness are', () => {
  it('chapters with more marks get at least as much time as small ones in the same subject', () => {
    const n = id => studyOf(plan, id);
    expect(n('m6')).toBeGreaterThanOrEqual(n('m2'));   // Triangles 8 marks vs Polynomials 3
    expect(n('s9')).toBeGreaterThanOrEqual(n('s10'));  // Light 8 vs Human Eye 4
    expect(n('s9') + n('s11') + n('m6')).toBeGreaterThan(n('s10') + n('m2') + n('m11'));
  });

  it('harder chapters get more time per mark than easy ones (heavy subjects)', () => {
    const perMark = d => { const cs = CHAPTERS.filter(c => SUBJ[c.s].heavy && c.d === d && c.id !== 'mp'); return cs.reduce((a, c) => a + studyOf(plan, c.id), 0) / cs.reduce((a, c) => a + c.marks, 0); };
    expect(perMark(3)).toBeGreaterThan(perMark(1));
    // the same size and difficulty gap in one pair: Triangles (8 marks, hard 3) vs Probability (5 marks, easy)
    expect(studyOf(plan, 'm6')).toBeGreaterThan(studyOf(plan, 'm14'));
  });

  it('weaker chapters get more blocks than the same chapters when strong (and no fewer than neutral)', () => {
    const SET = ['m6', 'm10', 'm13', 's5', 's9', 's11', 'h2', 'pl2', 'ec3', 'm12'];
    const neutral = buildPlan(baseState(), null, START);
    const mk = (r, sr) => { const st = baseState(); SET.forEach(id => { st.ch[id] = { dg: { r, n: 5 }, sr }; }); return buildPlan(st, null, START); };
    const weakened = mk(0, 1), strong = mk(5, 5);
    const total = p => SET.reduce((a, id) => a + studyOf(p, id), 0);
    expect(total(weakened)).toBeGreaterThan(total(strong));
    expect(total(weakened)).toBeGreaterThanOrEqual(total(neutral));
    expect(total(neutral)).toBeGreaterThanOrEqual(total(strong));
  });
});

describe('revision finishes before each exam', () => {
  it('the plan ends the day before the first exam (Maths, 17 Feb)', () => {
    expect(addDays(PLAN_END, 1)).toBe(SUBJ.math.exam);
  });
  it('every subject has all its study blocks scheduled before its own exam date', () => {
    SUB_ORDER.forEach(s => {
      const last = days.filter(d => plan.days[d].b.some(b => b.s === s && b.t === 'study')).pop();
      expect(last && last < SUBJ[s].exam).toBe(true);
    });
  });
  it('the last 6 days are the final-week placeholder', () => {
    days.slice(-6).forEach(d => { expect(plan.days[d].p).toBe('FW'); expect(plan.days[d].b).toEqual([{ t: 'final', m: 0 }]); });
  });
  it('paper practice gives every subject at least one full paper in January', () => {
    const papers = blocksOf(plan, 'P2').filter(b => b.t === 'paper').map(b => b.s);
    SUB_ORDER.forEach(s => expect(papers).toContain(s));
    expect(papers.filter(s => s === 'math').length).toBeGreaterThanOrEqual(papers.filter(s => s === 'fr').length);
  });
});

describe('mid-P1 rebuild', () => {
  const REBUILD_FROM = '2026-12-05';
  // finish the first 3 quests of each day from 24 Nov to 4 Dec
  const finished = () => {
    const st = baseState();
    days.filter(d => d >= '2026-11-24' && d < REBUILD_FROM).forEach(d => plan.days[d].b.forEach((b, i) => { if (i < 3) st.done[d + '|' + i] = 1; }));
    return st;
  };

  it('keeps finished quests (days before the rebuild date are untouched)', () => {
    const st = finished();
    const p2 = buildPlan(st, plan, REBUILD_FROM);
    days.filter(d => d < REBUILD_FROM).forEach(d => expect(p2.days[d]).toEqual(plan.days[d]));
    expect(Object.keys(st.done).length).toBeGreaterThan(0);
    Object.keys(st.done).forEach(k => { const [d, i] = k.split('|'); expect(p2.days[d].b[+i]).toEqual(plan.days[d].b[+i]); });
  });

  it('gives more blocks to weaker chapters after the rebuild', () => {
    const SET = ['m6', 'm10', 'm13', 's5', 's9', 's11', 'h2', 'pl2', 'ec3', 'm12'];
    const blocksAfter = (p, id) => Object.keys(p.days).reduce((n, d) => n + (p.days[d].p === 'P1' && d >= REBUILD_FROM ? p.days[d].b.filter(b => b.t === 'study' && b.c === id).length : 0), 0);
    const mk = (r, sr) => { const st = finished(); SET.forEach(id => { st.ch[id] = { dg: { r, n: 5 }, sr }; }); return buildPlan(st, plan, REBUILD_FROM); };
    const total = p => SET.reduce((a, id) => a + blocksAfter(p, id), 0);
    expect(total(mk(0, 1))).toBeGreaterThan(total(mk(5, 5)));
  });

  it('plans nothing past PLAN_END after a rebuild in the last week', () => {
    const late = buildPlan(baseState(), plan, '2027-02-12');
    Object.keys(late.days).forEach(d => expect(d <= PLAN_END).toBe(true));
  });
});
