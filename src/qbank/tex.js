// Turns the LaTeX-in-$…$ used in the question bank into readable plain text with Unicode symbols.
// The app has no maths renderer, so this covers the commands a question bank is likely to use.

const SYM = {
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', varepsilon:'ε', eta:'η', theta:'θ', lambda:'λ', mu:'μ', nu:'ν', pi:'π',
  rho:'ρ', sigma:'σ', tau:'τ', phi:'φ', varphi:'φ', omega:'ω', Delta:'Δ', Phi:'Φ', Sigma:'Σ', Omega:'Ω',
  times:'×', cdot:'·', circ:'°', pm:'±', approx:'≈', neq:'≠', le:'≤', leq:'≤', ge:'≥', geq:'≥', ll:'≪', gg:'≫', propto:'∝', infty:'∞',
  rightarrow:'→', longrightarrow:'→', Rightarrow:'⇒', perp:'⊥', parallel:'∥', angle:'∠', triangle:'△', int:'∫', oint:'∮', ldots:'…', ell:'ℓ',
  AA:'Å', angstrom:'Å', sin:'sin', cos:'cos', tan:'tan', log:'log', ln:'ln', cdots:'…', quad:' ', qquad:'  '
};
const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','−':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','i':'ⁱ'};
const SUB = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','−':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','h':'ₕ','i':'ᵢ','j':'ⱼ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','o':'ₒ','p':'ₚ','r':'ᵣ','s':'ₛ','t':'ₜ','u':'ᵤ','v':'ᵥ','x':'ₓ'};

function mapAll(s, table){ let out = ''; for (const ch of s) { if (!(ch in table)) return null; out += table[ch]; } return out; }

// Parse LaTeX math into text. Returns the text for tokens starting at i and the next index.
function parseSeq(s, i, stop){
  let out = '';
  while (i < s.length) {
    const ch = s[i];
    if (stop && ch === stop) break;
    if (ch === '{') { const r = parseSeq(s, i + 1, '}'); out += r.text; i = r.i + 1; continue; }
    if (ch === '}') { i++; continue; }
    if (ch === '\\') {
      let j = i + 1;
      if (j < s.length && /[A-Za-z]/.test(s[j])) { while (j < s.length && /[A-Za-z]/.test(s[j])) j++; }
      else j++;
      const cmd = s.slice(i + 1, j);
      i = j;
      if (cmd === 'frac' || cmd === 'dfrac') {
        const a = arg(s, i); const b = arg(s, a.i); i = b.i;
        out += wrapFrac(a.text) + '/' + wrapFrac(b.text); continue;
      }
      if (cmd === 'sqrt') { const a = arg(s, i); i = a.i; out += '√' + (a.text.length > 1 && !/^[\w.]+$/.test(a.text) ? '(' + a.text + ')' : a.text); continue; }
      if (cmd === 'vec') { const a = arg(s, i); i = a.i; out += combine(a.text, '⃗'); continue; }
      if (cmd === 'hat') { const a = arg(s, i); i = a.i; out += combine(a.text, '̂'); continue; }
      if (cmd === 'bar' || cmd === 'overline') { const a = arg(s, i); i = a.i; out += combine(a.text, '̄'); continue; }
      if (cmd === 'mathrm' || cmd === 'text' || cmd === 'mathbf' || cmd === 'textbf' || cmd === 'mathit') { const a = arg(s, i); i = a.i; out += a.text; continue; }
      if (cmd === 'left' || cmd === 'right') { if (s[i] === '.') i++; continue; }
      if (cmd === ',' || cmd === ';' || cmd === ':' || cmd === ' ' || cmd === '!') { out += cmd === '!' ? '' : ' '; continue; }
      if (cmd === '%' || cmd === '$' || cmd === '&' || cmd === '#' || cmd === '_') { out += cmd; continue; }
      if (cmd === '{' || cmd === '}') { out += cmd; continue; }
      if (cmd === '\\') { out += ' '; continue; }
      out += (cmd in SYM) ? SYM[cmd] : cmd;
      continue;
    }
    if (ch === '^' || ch === '_') {
      const a = arg(s, i + 1); i = a.i;
      const t = mapAll(a.text, ch === '^' ? SUP : SUB);
      out += t != null ? t : (ch === '^' ? '^' : '_') + (a.text.length > 1 ? '(' + a.text + ')' : a.text);
      continue;
    }
    if (ch === '~') { out += ' '; i++; continue; }
    out += ch; i++;
  }
  return { text: out, i };
}
function arg(s, i){
  while (s[i] === ' ') i++;
  if (s[i] === '{') { const r = parseSeq(s, i + 1, '}'); return { text: r.text, i: r.i + 1 }; }
  if (s[i] === '\\') return singleCmd(s, i);
  return { text: s[i] === undefined ? '' : s[i], i: i + 1 };
}
function singleCmd(s, i){
  let j = i + 1;
  if (/[A-Za-z]/.test(s[j] || '')) { while (j < s.length && /[A-Za-z]/.test(s[j])) j++; } else j++;
  const r = parseSeq(s.slice(i, j), 0, null);
  return { text: r.text, i: j };
}
function wrapFrac(t){ return /^[\p{L}\p{N}.°]{1,2}$/u.test(t) ? t : '(' + t + ')'; }
function combine(t, mark){ return t.length === 1 ? t + mark : (t.length ? '(' + t + ')' + mark : ''); }

export function texToText(input){
  if (input == null) return '';
  const s = String(input);
  // math segments are $…$ ; outside them the text stays as written, unless it still carries a LaTeX command
  const fixOutside = t => (t.indexOf('\\') >= 0 ? parseSeq(t, 0, null).text : t);
  let out = '', last = 0;
  s.replace(/\$([^$]*)\$/g, (m, inner, idx) => { out += fixOutside(s.slice(last, idx)) + parseSeq(inner, 0, null).text; last = idx + m.length; return m; });
  out += fixOutside(s.slice(last));
  return out.replace(/[ \t]{2,}/g, ' ');
}
