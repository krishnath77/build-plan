"use strict";
// Build Plan — Tejas, CBSE Class 10, board exam Phase 1 (2027).
// Exam dates: CBSE date sheet released 6 Nov 2026 (cbse.gov.in), checked in chat on 14 Nov 2026.
// Theory is 80 marks in every subject (+20 internal assessment, not planned here).
// Colours are starting values: check every text colour (tx) against its tint (t) and white for 4.5:1 contrast and adjust if needed.

const NAME = 'Tejas';
const SUBJ = {
  math:{name:'Maths', paper:'Mathematics Standard (041)', exam:'2027-02-17', theory:80, c:'#3B5BDB', tx:'#3249B8', t:'#E6EBFB', gap:1.1, heavy:true, hard:3},
  sci:{name:'Science', paper:'Science (086)', exam:'2027-02-22', theory:80, c:'#2F9E44', tx:'#237A34', t:'#E3F4E6', gap:1.1, heavy:true, hard:2},
  eng:{name:'English', paper:'English Language and Literature (184)', exam:'2027-02-26', theory:80, c:'#A0612B', tx:'#8A5021', t:'#F5EADF', gap:0.9, heavy:false, hard:0},
  fr:{name:'French', paper:'French (018)', exam:'2027-03-06', theory:80, c:'#C2255C', tx:'#A61E4D', t:'#FBE4EC', gap:0.9, heavy:false, hard:1},
  sst:{name:'Social Science', paper:'Social Science (087)', exam:'2027-03-08', theory:80, c:'#D9730D', tx:'#A85A0A', t:'#FCEBD9', gap:1.0, heavy:true, hard:1}
};
const SUB_ORDER = ['math','sci','eng','fr','sst']; // exam order
// Optional second board exam (May 2027, up to three of Maths/Science/SST/English/French to improve). Dates not out yet. Not planned in v1.
export { NAME, SUBJ, SUB_ORDER };
