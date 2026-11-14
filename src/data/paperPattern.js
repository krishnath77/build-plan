// Blueprint tab data: where each subject's 80 theory marks sit, by unit or section.
// Unit totals are CBSE's (2026-27 curriculum); they are added up from the chapter marks in chapters.js,
// so there is one source of truth. The question pattern (how many questions of each type) is NOT here yet:
// it comes from the 2026-27 sample papers later, and nothing is invented in the meantime.
import { SUBJ, SUB_ORDER } from './subjects.js';
import { CH } from './chapters.js';

// ids = chapters that make up the unit; extra = marks that belong to the unit but sit inside another item
// (the Social Science map work 'mp' is 5 marks: History 2 and Geography 3).
const UNIT_DEFS = {
  math: [
    { name: 'Number Systems', ids: ['m1'] },
    { name: 'Algebra', ids: ['m2', 'm3', 'm4', 'm5'] },
    { name: 'Coordinate Geometry', ids: ['m7'] },
    { name: 'Geometry', ids: ['m6', 'm10'] },
    { name: 'Trigonometry', ids: ['m8', 'm9'] },
    { name: 'Mensuration', ids: ['m11', 'm12'] },
    { name: 'Statistics and Probability', ids: ['m13', 'm14'] }
  ],
  sci: [
    { name: 'Chemical Substances: Nature and Behaviour', ids: ['s1', 's2', 's3', 's4'] },
    { name: 'World of Living', ids: ['s5', 's6', 's7', 's8'] },
    { name: 'Natural Phenomena', ids: ['s9', 's10'] },
    { name: 'Effects of Current', ids: ['s11', 's12'] },
    { name: 'Natural Resources', ids: ['s13'] }
  ],
  eng: [
    { name: 'Reading', ids: ['r1', 'r2'] },
    { name: 'Writing with Grammar', ids: ['gr', 'w1', 'w2'] },
    { name: 'Literature', ids: ['ff1', 'ff2', 'ff3', 'ff4', 'ff5', 'ff6', 'ff7', 'ff8', 'ff9', 'fp1', 'fp2', 'fp3', 'fp4', 'fp5', 'fp6', 'fp7', 'fp8', 'fp9', 'fp10', 'fw1', 'fw2', 'fw3', 'fw4', 'fw5', 'fw6', 'fw7', 'fw8', 'fw9'] }
  ],
  fr: [
    { name: 'Comprehension', ids: ['fr1'] },
    { name: 'Writing', ids: ['fr2', 'fr3'] },
    { name: 'Grammar', ids: ['fg1', 'fg2', 'fg3'] },
    { name: 'Culture and Civilisation', ids: ['fc1', 'fc2', 'fc3', 'fc4', 'fc5', 'fc6', 'fc7', 'fc8'] }
  ],
  sst: [
    { name: 'History', ids: ['h1', 'h2', 'h3', 'h4'], extra: 2 },
    { name: 'Geography', ids: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'], extra: 3 },
    { name: 'Political Science', ids: ['pl1', 'pl2', 'pl3', 'pl4', 'pl5'] },
    { name: 'Economics', ids: ['ec1', 'ec2', 'ec3', 'ec4'] }
  ]
};

const round1 = n => Math.round(n * 10) / 10;
const unitMarks = u => round1(u.ids.reduce((a, id) => a + CH[id].marks, 0) + (u.extra || 0));

export const PP_ORDER = SUB_ORDER.slice();
export const PP_UNITS = Object.fromEntries(SUB_ORDER.map(s => [s, UNIT_DEFS[s].map(u => ({ name: u.name, marks: unitMarks(u), ids: u.ids }))]));
export const ppTotal = s => round1(PP_UNITS[s].reduce((a, u) => a + u.marks, 0));
export const ppTheory = s => SUBJ[s].theory;
export const PP_NOTE = 'The question pattern (how many questions of each type, and the choices) will be added from the 2026-27 CBSE sample papers later. Unit marks here are CBSE’s totals; the split of a unit across its chapters is an estimate.';
