"use strict";
// Build Plan phases — first exam is Maths on 17 Feb 2027, so the plan runs to 16 Feb (between-exam days are planned later, as for Class 12).
// Tejas is still in school until January, so the daily load defaults lower than Anuj's (see the brief).
// If the app goes live after 19 Nov 2026, start CHK on the day after go-live and keep every later date as is.
// School preboards: dates not known yet; Krishnath marks them as special days in World map when the school announces them.
const PH = [
  {id:'CHK', name:'Starting check', short:'Check', from:'2026-11-19', to:'2026-11-21'},
  {id:'P1', name:'Build and revise', short:'Build', from:'2026-11-22', to:'2026-12-31'},
  {id:'P2', name:'Paper practice', short:'Papers', from:'2027-01-01', to:'2027-01-31'},
  {id:'P3', name:'Fast-track', short:'Fast-track', from:'2027-02-01', to:'2027-02-10'},
  {id:'FW', name:'Final week', short:'Final week', from:'2027-02-11', to:'2027-02-16'}
];
const PLAN_END = '2027-02-16';
// Same XP thresholds as Class 12; original blocky rank names (no names taken from any game).
const RANKS = [[0,'Wood'],[200,'Stone'],[500,'Copper'],[900,'Iron'],[1400,'Gold'],[2000,'Diamond'],[2800,'Master Builder'],[3800,'Legend Builder'],[5000,'World Builder']];
export { PH, PLAN_END, RANKS };
