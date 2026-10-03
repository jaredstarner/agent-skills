#!/usr/bin/env node
/**
 * Render a social preview image (Open Graph / Twitter card) from HTML with
 * headless Chrome, so the site's own fonts and CSS render exactly.
 *
 *   node og-image.mjs [options]
 *
 * Options:
 *   --out <file>         Output PNG (default: public/og.png)
 *   --template <file>    Your own HTML template. Relative URLs in it (fonts,
 *                        token stylesheets, images) resolve from the template's
 *                        folder, so it can <link> the site's token CSS directly.
 *                        Without it, a built-in layout is used.
 *   --var key=value      Replace {{key}} in the template (repeatable)
 *   --width <px>         Default 1200
 *   --height <px>        Default 630
 *   --wait <ms>          Extra wait after fonts load (default 300)
 *
 * Built-in layout variables (all optional):
 *   title, subtitle, bg, fg, accent, font (path to a .woff2/.ttf for the title)
 *
 * Example:
 *   node og-image.mjs --var title="Shelf Life" --var subtitle="shelflife.example" \
 *     --var bg=#1c1b26 --var fg=#f7f1e3 --var accent=#ff77a8 \
 *     --var font=src/fonts/display.woff2 --out public/og.png
 *
 * Keep text that can go stale (dates, roles, "now open") out of the image, and
 * view the result at thumbnail size before shipping.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, parseArgs } from './lib/chrome.mjs';

const { opts } = parseArgs(process.argv.slice(2), { booleans: ['help'] });
if (opts.help) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(0);
}

const width = Number(opts.width ?? 1200);
const height = Number(opts.height ?? 630);
const out = resolve(opts.out ?? 'public/og.png');
const vars = Object.fromEntries(
  [].concat(opts.var ?? []).map((pair) => {
    const i = pair.indexOf('=');
    if (i < 1) throw new Error(`--var expects key=value, got "${pair}"`);
    return [pair.slice(0, i), pair.slice(i + 1)];
  }),
);

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const BUILT_IN = `<!doctype html>
<meta charset="utf-8">
<style>
  {{fontFace}}
  * { margin: 0; box-sizing: border-box; }
  html, body { width: {{width}}px; height: {{height}}px; overflow: hidden; background: {{bg}}; }
  body { display: flex; flex-direction: column; justify-content: center; gap: 28px; padding: 0 96px;
         font-family: {{fontFamily}}; color: {{fg}}; }
  h1 { font-size: 88px; line-height: 1.05; letter-spacing: -0.01em; max-width: 16ch; }
  p { font-size: 38px; opacity: 0.85; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 24px; background: {{accent}}; }
</style>
<h1>{{title}}</h1>
<p>{{subtitle}}</p>
<div class="bar"></div>
`;

let html;
let baseDir;
if (opts.template) {
  const templatePath = resolve(opts.template);
  html = readFileSync(templatePath, 'utf8');
  baseDir = dirname(templatePath);
} else {
  baseDir = process.cwd();
  const font = vars.font ? pathToFileURL(resolve(vars.font)).href : null;
  html = BUILT_IN.replaceAll('{{fontFace}}', font ? `@font-face { font-family: 'OG Display'; src: url("${font}"); }` : '')
    .replaceAll('{{fontFamily}}', font ? "'OG Display', system-ui, sans-serif" : 'system-ui, sans-serif');
  vars.title ??= 'Site name';
  vars.subtitle ??= '';
  vars.bg ??= '#1c1b26';
  vars.fg ??= '#f7f1e3';
  vars.accent ??= '#ff77a8';
}
vars.width = String(width);
vars.height = String(height);

const textKeys = new Set(['title', 'subtitle']);
html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
  if (!(key in vars)) {
    console.warn(`Warning: no value for {{${key}}}`);
    return '';
  }
  return textKeys.has(key) ? escapeHtml(vars[key]) : vars[key];
});
// Resolve the template's relative URLs from its own folder.
const baseHref = pathToFileURL(baseDir + '/').href;
html = html.replace(/<head>|<meta charset[^>]*>/i, (m) => `${m}<base href="${baseHref}">`);

const browser = await launch();
try {
  const page = await browser.newPage();
  await page.setViewport(width, height, { mobile: false });
  // Navigate to a file URL in the base folder first so file:// fonts and styles may load.
  await page.goto(baseHref);
  await page.setContent(html);
  await page.settle(Number(opts.wait ?? 300));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await page.screenshot({ clip: { x: 0, y: 0, width, height } }));
  console.log(`Wrote ${out} (${width}x${height})`);
} finally {
  await browser.close();
}
