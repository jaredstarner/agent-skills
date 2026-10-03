#!/usr/bin/env node
/**
 * WCAG 2 contrast check for color pairs, resolving CSS custom properties per mode.
 *
 * Quick check of two colors:
 *   node contrast.mjs "#1c1b26" "#f6f0e1"
 *
 * Check token pairs from a config:
 *   node contrast.mjs --config contrast.json
 *
 * Config (paths are relative to the config file):
 *   {
 *     "css": ["src/theme/tokens/palette.css", "src/theme/tokens/semantic.css"],
 *     "modes": {
 *       "light": [":root"],
 *       "dark":  [":root", ":root[data-theme='dark']"]
 *     },
 *     "pairs": [
 *       ["--color-text", "--color-bg"],
 *       ["--color-text-muted", "--color-surface"],
 *       ["--color-border", "--color-bg", 3]
 *     ]
 *   }
 *
 * Each mode lists selectors whose declarations are layered in order (later
 * wins). A rule applies when one of its comma-separated selectors matches a
 * listed selector exactly (whitespace and quote style are ignored). Rules
 * inside @media blocks are treated as unconditional. A pair's optional third
 * value is its minimum ratio (default 4.5; use 3 for large text, borders, and
 * focus indicators). Pair values may be token names or literal colors.
 *
 * Exits 1 if any pair fails or cannot be resolved.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseColor(value) {
  const v = value.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), alpha };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { rgb: [m[1], m[2], m[3]].map(Number), alpha: a };
  }
  if (v === 'white') return { rgb: [255, 255, 255], alpha: 1 };
  if (v === 'black') return { rgb: [0, 0, 0], alpha: 1 };
  return null;
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const normSel = (s) => s.replace(/\s+/g, ' ').replace(/'/g, '"').trim();

function parseRules(css) {
  const rules = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selectors, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = {};
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) decls[name] = value.trim();
    rules.push({ selectors: selectors.split(',').map(normSel), decls });
  }
  return rules;
}

function resolveVar(value, vars, seen = new Set()) {
  const m = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (!m) return value;
  const [, name, fallback] = m;
  if (seen.has(name)) throw new Error(`circular reference at ${name}`);
  seen.add(name);
  if (name in vars) return resolveVar(vars[name], vars, seen);
  if (fallback !== undefined) return resolveVar(fallback.trim(), vars, seen);
  throw new Error(`${name} is not defined`);
}

function lookup(token, vars) {
  const raw = token.startsWith('--') ? resolveVar(`var(${token})`, vars) : token;
  const color = parseColor(raw);
  if (!color) throw new Error(`cannot parse color "${raw}" for ${token}`);
  return color;
}

function report(rows) {
  const w = [0, 1, 2].map((i) => Math.max(...rows.map((r) => String(r[i]).length)));
  for (const r of rows) console.log(r.map((c, i) => (i < 3 ? String(c).padEnd(w[i]) : c)).join('  '));
}

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(args.length ? 0 : 1);
}

if (args[0] !== '--config') {
  const [a, b] = args.map(parseColor);
  if (!a || !b) throw new Error('Pass two colors, e.g. "#000" "#fff"');
  const r = ratio(a.rgb, b.rgb);
  console.log(`${r.toFixed(2)}:1  AA text ${r >= 4.5 ? 'pass' : 'FAIL'}  AA large/non-text ${r >= 3 ? 'pass' : 'FAIL'}  AAA text ${r >= 7 ? 'pass' : 'FAIL'}`);
  process.exit(0);
}

const configPath = resolve(args[1]);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const base = dirname(configPath);
const rules = config.css.flatMap((f) => parseRules(readFileSync(resolve(base, f), 'utf8')));
let failures = 0;

for (const [mode, selectors] of Object.entries(config.modes ?? { default: [':root'] })) {
  const vars = {};
  for (const sel of selectors.map(normSel)) {
    for (const rule of rules) if (rule.selectors.includes(sel)) Object.assign(vars, rule.decls);
  }
  console.log(`\n${mode}`);
  const rows = [];
  for (const [fg, bg, min = 4.5] of config.pairs) {
    try {
      const f = lookup(fg, vars);
      const b = lookup(bg, vars);
      const note = f.alpha < 1 || b.alpha < 1 ? '  (alpha ignored)' : '';
      const r = ratio(f.rgb, b.rgb);
      const ok = r >= min;
      if (!ok) failures++;
      rows.push([`${fg} on ${bg}`, `${hex(f.rgb)} / ${hex(b.rgb)}`, `${r.toFixed(2)}:1`, `${ok ? 'pass' : 'FAIL'} (min ${min})${note}`]);
    } catch (err) {
      failures++;
      rows.push([`${fg} on ${bg}`, '-', '-', `ERROR ${err.message}`]);
    }
  }
  report(rows);
}

console.log(failures ? `\n${failures} pair(s) failed` : '\nAll pairs pass');
process.exit(failures ? 1 : 0);
