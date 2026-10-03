#!/usr/bin/env node
/**
 * Build a favicon set: favicon.svg, favicon.ico (16, 32, 48), and a 180x180
 * apple-touch-icon.png.
 *
 * From a pixel grid (Node built-ins only, crisp at every size):
 *   node favicon.mjs --grid glyph.txt --color "#=#ff77a8" --tile "#1c1b26" [--shape notched|square|none]
 *
 *   glyph.txt is a square grid of characters, one row per line. "." is the
 *   tile background (or transparent outside a notched tile, or everywhere with
 *   --shape none). Every other character needs a --color "<char>=<hex>"
 *   (repeatable).
 *
 * From a logo (rendered with headless Chrome):
 *   node favicon.mjs --svg logo.svg [--bg "#ffffff"] [--padding 0.1]
 *   node favicon.mjs --png logo.png [--bg "#ffffff"] [--padding 0.1]
 *
 *   --bg fills behind the logo in the raster icons (default transparent;
 *   the apple-touch icon is always opaque, white unless --bg is given).
 *   --padding is the fraction of each side left empty (default 0; 0.1 for the
 *   apple-touch icon if not set). With --svg, favicon.svg is the source SVG
 *   unchanged; with --png there is no SVG output.
 *
 * Common options:
 *   --out <dir>   Output directory (default: public)
 *
 * Link tags:
 *   <link rel="icon" href="/favicon.ico" sizes="32x32">
 *   <link rel="icon" type="image/svg+xml" href="/favicon.svg">
 *   <link rel="apple-touch-icon" href="/apple-touch-icon.png">
 *
 * Review the result at 16px on light and dark tab bars; a logo that reads at
 * 200px often does not read at 16px.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { launch, parseArgs } from './lib/chrome.mjs';

const { opts } = parseArgs(process.argv.slice(2), { booleans: ['help'] });
const modes = ['grid', 'svg', 'png'].filter((m) => opts[m]);
if (opts.help || modes.length !== 1) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(opts.help ? 0 : 1);
}
const out = resolve(opts.out ?? 'public');
mkdirSync(out, { recursive: true });

const parseHex = (h) => {
  const m = String(h).trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) throw new Error(`Expected a #rrggbb color, got "${h}"`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
};
const toHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixelAt(x, y);
      if (c) raw.set([...c, 255], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// PNG-in-ICO; every current browser reads it.
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const ICO_SIZES = [16, 32, 48];
const written = [];
const write = (name, data) => {
  writeFileSync(join(out, name), data);
  written.push(join(out, name));
};

if (opts.grid) {
  const rows = readFileSync(opts.grid, 'utf8').split(/\r?\n/).map((r) => r.trimEnd()).filter(Boolean);
  const n = rows.length;
  if (!rows.every((r) => r.length === n)) throw new Error(`Grid must be square: ${n} rows, row lengths ${[...new Set(rows.map((r) => r.length))].join('/')}`);
  const colors = new Map(
    [].concat(opts.color ?? []).map((pair) => {
      const [ch, value] = [pair[0], pair.slice(2)];
      if (pair[1] !== '=') throw new Error(`--color expects "<char>=<hex>", got "${pair}"`);
      return [ch, parseHex(value)];
    }),
  );
  const missing = [...new Set(rows.join(''))].filter((ch) => ch !== '.' && !colors.has(ch));
  if (missing.length) throw new Error(`No --color for: ${missing.join(' ')}`);
  const shape = opts.shape ?? (opts.tile ? 'notched' : 'none');
  const tile = opts.tile ? parseHex(opts.tile) : null;
  if (shape !== 'none' && !tile) throw new Error('--shape needs --tile <hex>');
  const notch = Math.max(1, Math.round(n / 8));
  const inTile = (x, y) => shape === 'square' || (shape === 'notched' && Math.min(x, n - 1 - x) + Math.min(y, n - 1 - y) >= notch);
  const cell = (x, y, fullBleed = false) => {
    const ch = rows[y][x];
    if (ch !== '.') return colors.get(ch);
    return tile && (fullBleed || inTile(x, y)) ? tile : null;
  };

  // SVG: one path per color from horizontal runs.
  const paths = new Map();
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; ) {
      const c = cell(x, y);
      let end = x + 1;
      while (end < n && cell(end, y) === c) end++;
      if (c) paths.set(toHex(c), (paths.get(toHex(c)) ?? '') + `M${x} ${y}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  }
  const body = [...paths].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('');
  write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${body}</svg>\n`);

  const raster = (size, { padding = 0, fullBleed = false } = {}) => {
    const inner = size - 2 * padding;
    return encodePng(size, (px, py) => {
      const gx = Math.floor(((px - padding) * n) / inner);
      const gy = Math.floor(((py - padding) * n) / inner);
      if (gx < 0 || gy < 0 || gx >= n || gy >= n) return fullBleed ? tile : null;
      return cell(gx, gy, fullBleed);
    });
  };
  if (n > 16) console.warn(`Note: a ${n}x${n} grid is downsampled for the 16px icon; check it reads.`);
  write('favicon.ico', encodeIco(ICO_SIZES.map((size) => ({ size, data: raster(size) }))));
  // iOS fills transparency with black and masks its own corners: go full-bleed.
  if (!tile) console.warn('No --tile color: apple-touch-icon.png will have a transparent background, which iOS shows as black.');
  // Largest whole-pixel scale that fits keeps the art crisp; center the remainder.
  const touchPadding = Math.floor((180 - Math.floor(180 / n) * n) / 2);
  write('apple-touch-icon.png', raster(180, { padding: touchPadding, fullBleed: Boolean(tile) }));
} else {
  const src = resolve(opts.svg ?? opts.png);
  const bg = opts.bg ?? null;
  const padding = opts.padding !== undefined ? Number(opts.padding) : null;
  if (opts.svg) write('favicon.svg', readFileSync(src));
  else console.warn('PNG input: no favicon.svg written; omit the SVG <link> tag.');

  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport(400, 400, { mobile: false });
    await page.transparentBackground();
    // Open the logo's folder first so the page has a file:// origin that may load it.
    await page.goto(pathToFileURL(dirname(src)).href + '/');
    const render = async (size, fill, pad) => {
      const inset = Math.round(size * pad);
      await page.setContent(`<!doctype html><style>
        html, body { margin: 0; background: transparent; }
        div { width: ${size}px; height: ${size}px; box-sizing: border-box; padding: ${inset}px; background: ${fill ?? 'transparent'}; }
        img { width: 100%; height: 100%; object-fit: contain; display: block; }
      </style><div><img src="${pathToFileURL(src).href}"></div>`);
      await page.evaluate('Promise.all([...document.images].map(i => i.decode()))');
      return page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
    };
    const icoImages = [];
    for (const size of ICO_SIZES) icoImages.push({ size, data: await render(size, bg, padding ?? 0) });
    write('favicon.ico', encodeIco(icoImages));
    if (!bg) console.warn('No --bg: apple-touch-icon.png uses white behind the logo.');
    write('apple-touch-icon.png', await render(180, bg ?? '#ffffff', padding ?? 0.1));
  } finally {
    await browser.close();
  }
}

for (const f of written) console.log(`Wrote ${f}`);
