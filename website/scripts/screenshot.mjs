#!/usr/bin/env node
/**
 * Headless screenshots of one or more pages across widths and color schemes.
 *
 *   node screenshot.mjs <url-or-file>... [options]
 *
 * Options:
 *   --out <dir>            Output directory (default: ./screenshots)
 *   --widths <list>        Viewport widths in CSS px (default: 1280,390)
 *   --height <px>          Viewport height (default: 900)
 *   --schemes <list>       light, dark, or both (default: light)
 *   --theme-attr <name>    Also set this attribute on <html> to the scheme name,
 *                          for sites that theme via e.g. data-theme="dark"
 *   --full-page            Capture the full document height
 *   --wait <ms>            Extra wait after load and fonts (default: 500); raise
 *                          it for pages that animate on load
 *   --reduced-motion       Emulate prefers-reduced-motion: reduce
 *   --inject <file.js>     Script run before page scripts on every load
 *                          (stub requestAnimationFrame, force states, etc.)
 *   --script <file.js>     Script evaluated after load, before capture
 *                          (open a menu, trigger a hover state, fire keys)
 *   --style <css>          CSS added after load (e.g. force hidden UI visible)
 *   --name <prefix>        Filename prefix (default: derived from the URL path)
 *
 * Writes <prefix>-<width>-<scheme>.png per combination and prints each path.
 * Serve built sites over http (e.g. `pnpm preview`) rather than file://,
 * since root-relative links and assets break under file://.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, list, parseArgs } from './lib/chrome.mjs';

const { opts, positional } = parseArgs(process.argv.slice(2), { booleans: ['full-page', 'reduced-motion', 'help'] });
if (opts.help || !positional.length) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(opts.help ? 0 : 1);
}

const out = resolve(opts.out ?? 'screenshots');
const widths = list(opts.widths ?? '1280,390').map(Number);
const height = Number(opts.height ?? 900);
const schemes = list(opts.schemes ?? 'light');
const wait = Number(opts.wait ?? 500);
const inject = opts.inject ? readFileSync(opts.inject, 'utf8') : null;
const script = opts.script ? readFileSync(opts.script, 'utf8') : null;
const style = opts.style ?? null;
const themeAttr = opts['theme-attr'] ?? null;

const slug = (target) => {
  const path = target.replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/[?#].*$/, '');
  return path.replace(/\.html?$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'index';
};

mkdirSync(out, { recursive: true });
const browser = await launch();
let failed = 0;
try {
  for (const target of positional) {
    const prefix = opts.name ?? slug(target);
    for (const width of widths) {
      for (const scheme of schemes) {
        const page = await browser.newPage();
        try {
          await page.setViewport(width, height);
          await page.emulateMedia({
            'prefers-color-scheme': scheme,
            'prefers-reduced-motion': opts['reduced-motion'] ? 'reduce' : 'no-preference',
          });
          if (themeAttr) {
            // Set before page scripts run so no-flash theme scripts see it too.
            await page.injectOnLoad(
              `document.documentElement.setAttribute(${JSON.stringify(themeAttr)}, ${JSON.stringify(scheme)});` +
                `try { localStorage.setItem('theme', ${JSON.stringify(scheme)}); } catch {}`,
            );
          }
          if (inject) await page.injectOnLoad(inject);
          await page.goto(target);
          if (themeAttr) {
            await page.evaluate(
              `document.documentElement.setAttribute(${JSON.stringify(themeAttr)}, ${JSON.stringify(scheme)})`,
            );
          }
          if (style) {
            await page.evaluate(
              `(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(style)}; document.head.append(s); })()`,
            );
          }
          if (script) await page.evaluate(`(async () => { ${script}\n })()`);
          await page.settle(wait);
          const file = join(out, `${prefix}-${width}-${scheme}.png`);
          writeFileSync(file, await page.screenshot({ fullPage: Boolean(opts['full-page']) }));
          console.log(file);
        } catch (err) {
          failed++;
          console.error(`FAILED ${target} @${width} ${scheme}: ${err.message}`);
        } finally {
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
