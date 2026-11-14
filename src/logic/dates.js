
const pad = n => String(n).padStart(2,'0');
const D = s => { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); };
const S = dt => dt.toISOString().slice(0,10);
const addDays = (s,n) => { const d = D(s); d.setUTCDate(d.getUTCDate()+n); return S(d); };
const diffDays = (a,b) => Math.round((D(b)-D(a))/86400000);
const dow = s => D(s).getUTCDay();
function range(a,b){ const out=[]; for(let d=a; d<=b; d=addDays(d,1)) out.push(d); return out; }
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
export { pad, D, S, addDays, diffDays, dow, range, clamp };
