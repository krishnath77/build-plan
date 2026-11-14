// Theme and Blueprint: text contrast of at least 4.5:1, original words, Blueprint marks, and the hidden board-question screens.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SUBJ, SUB_ORDER } from '../../src/data/subjects.js';
import { RANKS } from '../../src/data/phases.js';
import { CH } from '../../src/data/chapters.js';
import { PP_UNITS, ppTotal } from '../../src/data/paperPattern.js';
import { renderIntel } from '../../src/ui/target.js';
import { TABS } from '../../src/ui/nav.js';
import { practiceCardHTML, papersCardHTML } from '../../src/ui/pyq.js';
import { boardSectionHTML, opsBoardHTML } from '../../src/ui/board.js';

const ROOT = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
const vars = Object.fromEntries([...css.slice(0, css.indexOf('*{box-sizing')).matchAll(/--([A-Za-z0-9]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => ['--' + m[1], m[2].toUpperCase()]));

const lum = h => { const n = parseInt(h.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('palette (starting values from docs/reference/theme.md)', () => {
  it('uses the agreed colours', () => {
    expect(vars['--navy']).toBe('#23262E');
    expect(vars['--grass']).toBe('#5DA130');
    expect(vars['--dirt']).toBe('#8B5A2B');
    expect(vars['--sky']).toBe('#6CB4EE');
    expect(vars['--gold']).toBe('#F2C230');
    expect(vars['--diamond']).toBe('#3ED1C8');
    expect(vars['--bg']).toBe('#F6F3EA');
  });
});

describe('text contrast is at least 4.5:1 on every surface it is used on', () => {
  const v = k => vars[k];
  const pairs = [
    ['ink on paper', v('--ink'), v('--bg')], ['ink on card', v('--ink'), v('--card')],
    ['muted on paper', v('--muted'), v('--bg')], ['muted on card', v('--muted'), v('--card')], ['muted on pill', v('--muted'), '#EAE4D2'], ['muted on note banner', v('--muted'), '#E8E2CF'], ['muted on ok banner', v('--muted'), v('--okBg')],
    ['white on night-stone', '#FFFFFF', v('--navy')], ['hud on night-stone', v('--hud'), v('--navy')], ['hud on stone 2', v('--hud'), v('--navy2')], ['hud on stone 3', v('--hud'), v('--navy3')],
    ['gold on night-stone', v('--gold'), v('--navy')], ['gold on stone 2', v('--gold'), v('--navy2')], ['ink on gold button', v('--ink'), v('--gold')],
    ['ok on ok background', v('--ok'), v('--okBg')], ['ok on card', v('--ok'), v('--card')], ['ok on paper', v('--ok'), v('--bg')],
    ['warn on warn background', v('--warnInk'), v('--warnBg')], ['amber ink on amber background', v('--amberInk'), v('--amberBg')], ['amber ink on card', v('--amberInk'), v('--card')],
    ['link on card', v('--link'), v('--card')], ['link on ok background', v('--link'), v('--okBg')],
    ['ink on grass', v('--ink'), v('--grass')], ['white on dirt (sign-in block)', '#FFFFFF', v('--dirt')], ['ink on sky', v('--ink'), v('--sky')], ['ink on diamond', v('--ink'), v('--diamond')],
    ['wrong-answer text', '#7A2E0E', '#FBE4D8']
  ];
  pairs.forEach(([name, fg, bg]) => it(name, () => { expect(fg && bg).toBeTruthy(); expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5); }));

  SUB_ORDER.forEach(s => {
    it('subject colours for ' + SUBJ[s].name, () => {
      const S = SUBJ[s];
      expect(contrast(S.tx, S.t)).toBeGreaterThanOrEqual(4.5);          // text on its tint
      expect(contrast(S.tx, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);    // text on white
      expect(contrast(S.tx, vars['--bg'])).toBeGreaterThanOrEqual(4.5); // text on the paper background
      expect(contrast('#FFFFFF', S.c)).toBeGreaterThanOrEqual(4.5);     // white heading on the subject colour
    });
  });
});

describe('words and look', () => {
  it('tabs use the Build Plan names', () => {
    expect(TABS.map(t => t[1])).toEqual(['Today', 'World map', 'Syllabus', 'Blueprint', 'Training', 'Inventory', 'Base camp']);
  });
  it('rank names are the blocky ones', () => {
    expect(RANKS.map(r => r[1])).toEqual(['Wood', 'Stone', 'Copper', 'Iron', 'Gold', 'Diamond', 'Master Builder', 'Legend Builder', 'World Builder']);
  });
  it('the pixel font is the agreed one and nothing names the game it was inspired by', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    expect(html).toContain('Pixelify+Sans');
    expect(html).toContain('DM+Sans');
    expect(html).toContain('<title>Build Plan');
    const banned = /minecraft|creeper|steve|enderman|mojang/i;
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'index.html'), path.join(ROOT, 'vite.config.js'), path.join(ROOT, 'scripts/make-icons.mjs'), path.join(ROOT, 'public/favicon.svg')].forEach(f => expect(banned.test(fs.readFileSync(f, 'utf8')), f).toBe(false));
  });
  it('the manifest uses the right name and theme colour', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
    expect(cfg).toContain("short_name: 'Build Plan'");
    expect(cfg).toContain("theme_color: '#23262E'");
  });
  it('the app icons were generated', () => {
    ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.svg'].forEach(f => expect(fs.statSync(path.join(ROOT, 'public', f)).size).toBeGreaterThan(500));
  });
});

describe('Blueprint tab', () => {
  it('shows each subject’s unit marks, adding up to 80 per paper (from the chapter data)', () => {
    SUB_ORDER.forEach(s => expect(ppTotal(s)).toBe(80));
    expect(PP_UNITS.math.map(u => u.marks)).toEqual([6, 20, 6, 15, 12, 10, 11]);
    expect(PP_UNITS.sci.map(u => u.marks)).toEqual([25, 25, 12, 13, 5]);
    expect(PP_UNITS.eng.map(u => u.marks)).toEqual([20, 20, 40]);
    expect(PP_UNITS.fr.map(u => u.marks)).toEqual([10, 20, 30, 20]);
    expect(PP_UNITS.sst.map(u => u.marks)).toEqual([20, 20, 20, 20]);
    // every chapter of a subject belongs to exactly one unit (the map work is split between History and Geography)
    SUB_ORDER.forEach(s => {
      const ids = PP_UNITS[s].flatMap(u => u.ids);
      expect(new Set(ids).size).toBe(ids.length);
      const missing = Object.values(CH).filter(c => c.s === s && !ids.includes(c.id)).map(c => c.id);
      expect(missing).toEqual(s === 'sst' ? ['mp'] : []);
    });
  });
  it('renders five subject cards and says the question pattern comes later, without inventing counts', () => {
    const html = renderIntel();
    expect((html.match(/<article class="pp-card"/g) || []).length).toBe(5);
    expect(html).toContain('Blueprint');
    expect(html).toContain('<b>400</b> theory marks');
    expect(html).toContain('2026-27 CBSE sample papers later');
    expect(html).not.toMatch(/questions? · all compulsory/);
  });
});

describe('board-question screens hide themselves until a Class 10 bank exists', () => {
  it('the practice card, the papers card, the chapter section and the Base camp line are all empty', () => {
    expect(practiceCardHTML()).toBe('');
    expect(papersCardHTML()).toBe('');
    expect(boardSectionHTML(CH.m6)).toBe('');
    expect(opsBoardHTML()).toBe('');
  });
});
