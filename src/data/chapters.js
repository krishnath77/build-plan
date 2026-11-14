"use strict";
// Build Plan — CBSE Class 10 chapters for the 2027 board exam (2026-27 syllabus, current NCERT rationalised books; new NCERT
// Class 10 books start only in 2027-28).
// Same row format as the Class 12 app: [id, subject, name, marks, difficulty 1-3, kind, marksAreEstimate, link]
// - Unit totals are CBSE's (2026-27 curriculum). Chapter marks marked 1 in column 7 are chat's split of a unit total.
// - link is left empty: the app's AI brief writes a one-line "where you see this" link per chapter (see the brief).
// Sources (chat, 14 Nov 2026): CBSE 2026-27 curriculum summaries (Maths/Science/SST unit marks), Delhi DoE 2026-27
// English 184 syllabus (chapter list), CBSE French 018 2026-27 course structure (sections, Entre Jeunes lessons).
const CH_RAW = [
 // Maths Standard — units: Number Systems 6, Algebra 20, Coordinate Geometry 6, Geometry 15, Trigonometry 12, Mensuration 10, Statistics & Probability 11
 ['m1','math','Real Numbers',6,1,'num',0,''],
 ['m2','math','Polynomials',3,1,'num',1,''],
 ['m3','math','Pair of Linear Equations in Two Variables',6,2,'num',1,''],
 ['m4','math','Quadratic Equations',6,2,'num',1,''],
 ['m5','math','Arithmetic Progressions',5,2,'num',1,''],
 ['m6','math','Triangles',8,3,'num',1,''],
 ['m7','math','Coordinate Geometry',6,2,'num',0,''],
 ['m8','math','Introduction to Trigonometry',7,2,'num',1,''],
 ['m9','math','Some Applications of Trigonometry',5,2,'num',1,''],
 ['m10','math','Circles',7,2,'num',1,''],
 ['m11','math','Areas Related to Circles',4,1,'num',1,''],
 ['m12','math','Surface Areas and Volumes',6,2,'num',1,''],
 ['m13','math','Statistics',6,2,'num',1,''],
 ['m14','math','Probability',5,1,'num',1,''],
 // Science — units: Chemical Substances 25, World of Living 25, Natural Phenomena 12, Effects of Current 13, Natural Resources 5
 ['s1','sci','Chemical Reactions and Equations',6,1,'inorg',1,''],
 ['s2','sci','Acids, Bases and Salts',7,2,'inorg',1,''],
 ['s3','sci','Metals and Non-metals',6,2,'inorg',1,''],
 ['s4','sci','Carbon and its Compounds',6,3,'org',1,''],
 ['s5','sci','Life Processes',8,2,'theory',1,''],
 ['s6','sci','Control and Coordination',6,2,'theory',1,''],
 ['s7','sci','How do Organisms Reproduce?',6,2,'theory',1,''],
 ['s8','sci','Heredity',5,2,'theory',1,''], // one publisher summary says "not assessed"; current rationalised book and CBSE unit list include it — keep, verify against the official PDF
 ['s9','sci','Light – Reflection and Refraction',8,3,'num',1,''],
 ['s10','sci','The Human Eye and the Colourful World',4,1,'num',1,''],
 ['s11','sci','Electricity',8,3,'num',1,''],
 ['s12','sci','Magnetic Effects of Electric Current',5,2,'num',1,''],
 ['s13','sci','Our Environment',5,1,'theory',0,''],
 // English Language & Literature (184) — Reading 20, Writing with Grammar 20, Literature 40
 ['r1','eng','Reading: discursive passage',10,1,'read',0,''],
 ['r2','eng','Reading: case-based factual passage',10,1,'read',0,''],
 ['gr','eng','Grammar: determiners, tenses, modals, concord, reported speech',10,1,'write',0,''],
 ['w1','eng','Writing: formal letter',5,2,'write',0,''],
 ['w2','eng','Writing: analytical paragraph (map, chart, graph or cues)',5,2,'write',0,''],
 ['ff1','eng','A Letter to God',2,1,'lit',1,''],
 ['ff2','eng','Nelson Mandela: Long Walk to Freedom',2,2,'lit',1,''],
 ['ff3','eng','Two Stories about Flying',2,1,'lit',1,''],
 ['ff4','eng','From the Diary of Anne Frank',2,2,'lit',1,''],
 ['ff5','eng','Glimpses of India',2,2,'lit',1,''],
 ['ff6','eng','Mijbil the Otter',2,1,'lit',1,''],
 ['ff7','eng','Madam Rides the Bus',2,1,'lit',1,''],
 ['ff8','eng','The Sermon at Benares',2,1,'lit',1,''],
 ['ff9','eng','The Proposal (play)',2,2,'lit',1,''],
 ['fp1','eng','Dust of Snow',1.1,1,'poem',1,''],
 ['fp2','eng','Fire and Ice',1.1,2,'poem',1,''],
 ['fp3','eng','A Tiger in the Zoo',1.1,1,'poem',1,''],
 ['fp4','eng','How to Tell Wild Animals',1.1,1,'poem',1,''],
 ['fp5','eng','The Ball Poem',1.1,2,'poem',1,''],
 ['fp6','eng','Amanda!',1.1,1,'poem',1,''],
 ['fp7','eng','The Trees',1.1,2,'poem',1,''],
 ['fp8','eng','Fog',1.1,1,'poem',1,''],
 ['fp9','eng','The Tale of Custard the Dragon',1.1,1,'poem',1,''],
 ['fp10','eng','For Anne Gregory',1.1,2,'poem',1,''],
 ['fw1','eng','A Triumph of Surgery',1.2,1,'lit',1,''],
 ['fw2','eng','The Thief’s Story',1.2,1,'lit',1,''],
 ['fw3','eng','The Midnight Visitor',1.2,1,'lit',1,''],
 ['fw4','eng','A Question of Trust',1.2,1,'lit',1,''],
 ['fw5','eng','Footprints without Feet',1.2,1,'lit',1,''],
 ['fw6','eng','The Making of a Scientist',1.2,1,'lit',1,''],
 ['fw7','eng','The Necklace',1.2,2,'lit',1,''],
 ['fw8','eng','Bholi',1.2,1,'lit',1,''],
 ['fw9','eng','The Book That Saved the Earth',1.4,2,'lit',1,''],
 // French (018) — Comprehension 10, Writing 20, Grammar 30, Culture & Civilisation 20 (Entre Jeunes, Class X: lessons 2,3,4,5,6,7,8,10)
 ['fr1','fr','Comprehension: unseen passage',10,1,'read',0,''],
 ['fr2','fr','Writing: informal letter',10,2,'write',0,''],
 ['fr3','fr','Writing: short compositions (message, dialogue, story)',10,2,'write',0,''],
 ['fg1','fr','Grammar: verbs and tenses (compulsory)',10,3,'write',1,''],
 ['fg2','fr','Grammar: pronouns (object, relative), possessives and demonstratives',10,2,'write',1,''],
 ['fg3','fr','Grammar: direct and indirect speech, questions, negation, subjunctive',10,3,'write',1,''],
 ['fc1','fr','L2 Après le bac',2.5,1,'lit',1,''],
 ['fc2','fr','L3 Chercher du travail',2.5,1,'lit',1,''],
 ['fc3','fr','L4 Le plaisir de lire',2.5,1,'lit',1,''],
 ['fc4','fr','L5 Les médias',2.5,1,'lit',1,''],
 ['fc5','fr','L6 Chacun ses goûts',2.5,1,'lit',1,''],
 ['fc6','fr','L7 En pleine forme',2.5,1,'lit',1,''],
 ['fc7','fr','L8 L’environnement',2.5,1,'lit',1,''],
 ['fc8','fr','L10 Vive la République !',2.5,1,'lit',1,''],
 // Social Science — History 20 (18 + map 2), Geography 20 (17 + map 3), Political Science 20, Economics 20
 // Not in the board paper: History ch IV Age of Industrialisation (periodic test only), Economics ch 5 Consumer Rights (project),
 // Geography ch 7 Lifelines (map only, inside 'mp'), Global World beyond 1.3 and Globalisation beyond "factors" (interdisciplinary project).
 ['h1','sst','The Rise of Nationalism in Europe',6,2,'theory',1,''],
 ['h2','sst','Nationalism in India',7,2,'theory',1,''],
 ['h3','sst','The Making of a Global World (sections 1 to 1.3)',2,2,'theory',1,''],
 ['h4','sst','Print Culture and the Modern World',3,1,'theory',1,''],
 ['g1','sst','Resources and Development',4,1,'theory',1,''],
 ['g2','sst','Forest and Wildlife Resources',2,1,'theory',1,''],
 ['g3','sst','Water Resources',3,1,'theory',1,''],
 ['g4','sst','Agriculture',3,2,'theory',1,''],
 ['g5','sst','Minerals and Energy Resources',3,2,'theory',1,''],
 ['g6','sst','Manufacturing Industries',2,2,'theory',1,''],
 ['mp','sst','Map work (History 2 + Geography 3, incl. Lifelines of National Economy)',5,1,'theory',0,''],
 ['pl1','sst','Power-sharing',4,1,'theory',1,''],
 ['pl2','sst','Federalism',5,2,'theory',1,''],
 ['pl3','sst','Gender, Religion and Caste',4,1,'theory',1,''],
 ['pl4','sst','Political Parties',4,1,'theory',1,''],
 ['pl5','sst','Outcomes of Democracy',3,1,'theory',1,''],
 ['ec1','sst','Development',4,1,'theory',1,''],
 ['ec2','sst','Sectors of the Indian Economy',6,2,'theory',1,''],
 ['ec3','sst','Money and Credit',5,2,'theory',1,''],
 ['ec4','sst','Globalisation and the Indian Economy (board part)',5,2,'theory',1,'']
];
const CHAPTERS = CH_RAW.map(r => ({id:r[0], s:r[1], name:r[2], marks:r[3], d:r[4], kind:r[5], est:!!r[6], tech:r[7]}));
const CH = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
const chOf = s => CHAPTERS.filter(c => c.s === s);
// small light items are revised together so every one gets a slot
const GROUPS = [['fp1','fp2'],['fp3','fp4'],['fp5','fp6'],['fp7','fp8'],['fp9','fp10'],
  ['fw1','fw2'],['fw3','fw4'],['fw5','fw6'],['fw7','fw8'],['fw9'],
  ['fc1','fc2'],['fc3','fc4'],['fc5','fc6'],['fc7','fc8'],
  ['h3','h4'],['g2','g6']];
const UNITS = (() => { const inG = new Set(GROUPS.flat()); const u = CHAPTERS.filter(c => !inG.has(c.id)).map(c => ({id:c.id, s:c.s, cs:[c.id]})); GROUPS.forEach(g => u.push({id:g[0], s:CH[g[0]].s, cs:g})); return u; })();
export { CH_RAW, CHAPTERS, CH, chOf, GROUPS, UNITS };
