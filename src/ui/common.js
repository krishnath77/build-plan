import { pad, D } from '../logic/dates.js';

const $ = s => document.querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function todayStr(){ const n = new Date(); return n.getFullYear()+'-'+pad(n.getMonth()+1)+'-'+pad(n.getDate()); }
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt = s => { const d = D(s); return WD[d.getUTCDay()]+' '+d.getUTCDate()+' '+MON[d.getUTCMonth()]; };
const fmtShort = s => { const d = D(s); return d.getUTCDate()+' '+MON[d.getUTCMonth()]; };
// Utility icons stay as simple strokes; the tab and feature icons are original pixel art on a 16x16 grid (rects, so they stay crisp).
const IC = {
  check:'<path d="M5 12l5 5 9-10"/>', back:'<path d="M15 5l-7 7 7 7"/>', play:'<path d="M7 4l13 8-13 8z"/>', camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>', recall:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'
};
// [x, y, w, h, alpha]; alpha defaults to 1
const PIX = {
  today: [[7,1,2,1],[6,2,4,2],[5,4,6,3],[6,7,4,1],[7,4,2,3,.45],[6,8,4,1],[7,9,2,6,.8]],                              // torch
  plan: [[2,3,12,1],[2,12,12,1],[2,3,1,10],[13,3,1,10],[3,4,10,8,.3],[6,4,1,8,.55],[10,4,1,8,.55],[4,10,2,1],[6,9,2,1],[8,8,2,1],[10,7,2,1],[11,5,2,2]], // map with a path and a mark
  syl: [[3,2,10,1],[3,13,10,1],[3,2,2,12],[12,2,1,12],[5,3,7,10,.3],[6,5,5,1],[6,7,5,1],[6,9,3,1]],                      // book
  intel: [[2,2,12,1],[2,13,12,1],[2,2,1,12],[13,2,1,12],[3,3,10,10,.2],[2,6,12,1,.6],[2,10,12,1,.6],[6,2,1,12,.6],[10,2,1,12,.6],[7,7,3,3]], // blueprint sheet with one block placed
  sim: [[4,4,2,2],[6,3,4,2],[10,4,2,2],[12,6,2,3],[8,6,2,1],[7,7,2,1],[6,8,2,1],[5,9,2,1],[4,10,2,1],[3,11,2,1],[2,12,2,2]], // pickaxe
  hangar: [[2,4,12,1],[2,13,12,1],[2,4,1,10],[13,4,1,10],[3,5,10,8,.3],[2,8,12,1,.7],[7,7,2,3],[3,2,10,2,.6]],           // chest
  ops: [[7,2,2,2],[5,4,6,2],[3,6,10,2],[4,8,1,6],[11,8,1,6],[4,13,8,1],[7,9,2,5,.6],[5,8,6,1,.45]],                       // camp with a door
  tip: [[7,1,2,14],[1,7,14,2],[5,5,6,6,.55],[7,7,2,2]],                                                                     // spark
  block: [[2,5,12,9],[2,3,12,2,.7],[3,6,10,7,.25],[2,3,1,11],[13,3,1,11],[5,7,2,2,.7],[9,10,2,2,.7]]                       // a grass-topped block
};
const pix = (n, sz) => '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">'
  + PIX[n].map(r => '<rect x="'+r[0]+'" y="'+r[1]+'" width="'+r[2]+'" height="'+r[3]+'"'+(r[4] != null ? ' fill-opacity="'+r[4]+'"' : '')+'/>').join('') + '</svg>';
const ico = (n, sz=20, sw=2) => PIX[n] ? pix(n, sz) : '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="'+(n==='play'?'currentColor':'none')+'" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">'+IC[n]+'</svg>';
function toast(msg){ const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role','status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
export { $, esc, todayStr, MON, WD, fmt, fmtShort, IC, PIX, ico, toast };
