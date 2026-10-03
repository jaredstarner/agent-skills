#!/usr/bin/env node
/**
 * Prepare a photo for a public site: report the metadata it carries (EXIF,
 * GPS, XMP, IPTC, ICC), apply the camera orientation, resize or square-crop,
 * and write a copy with the metadata stripped. The output is re-read to
 * confirm nothing identifying survived.
 *
 *   node photo-intake.mjs <in> <out> [options]
 *
 * Options:
 *   --width <px>        Resize to this width (no upscaling)
 *   --square <px>       Center-crop to a square of this size (overrides --width)
 *   --position <pos>    Crop focus for --square: centre (default), top, bottom,
 *                       left, right, entropy, attention
 *   --quality <1-100>   JPEG/WebP/AVIF quality (default 82)
 *   --inspect           Only report the input's metadata; write nothing
 *
 * The output format follows the <out> extension (.jpg, .webp, .avif, .png).
 * Needs `sharp`: resolved from the current project first (run this from the
 * site's root), then from wherever Node can find it.
 *
 * Still look at the picture itself: metadata stripping does not remove a
 * house number, a street sign, a school logo, or a child's face.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, resolve } from 'node:path';
import { parseArgs } from './lib/chrome.mjs';

const { opts, positional } = parseArgs(process.argv.slice(2), { booleans: ['inspect', 'help'] });
if (opts.help || positional.length < (opts.inspect ? 1 : 2)) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(opts.help ? 0 : 1);
}

async function loadSharp() {
  try {
    return createRequire(resolve('package.json'))('sharp');
  } catch {
    try {
      return (await import('sharp')).default;
    } catch {
      console.error('sharp is not installed. Add it to the project (e.g. `pnpm add -D sharp`) and run from the project root.');
      process.exit(1);
    }
  }
}
const sharp = await loadSharp();

/** True if the EXIF block has a GPS IFD pointer (tag 0x8825) in IFD0. */
function hasGps(exif) {
  if (!exif) return false;
  let tiff = exif.indexOf('Exif\0\0') === 0 ? 6 : 0;
  const le = exif.toString('latin1', tiff, tiff + 2) === 'II';
  const u16 = (o) => (le ? exif.readUInt16LE(o) : exif.readUInt16BE(o));
  const u32 = (o) => (le ? exif.readUInt32LE(o) : exif.readUInt32BE(o));
  try {
    const ifd0 = tiff + u32(tiff + 4);
    const count = u16(ifd0);
    for (let i = 0; i < count; i++) if (u16(ifd0 + 2 + i * 12) === 0x8825) return true;
  } catch {
    return null; // unparseable; report as unknown
  }
  return false;
}

function describe(meta) {
  const gps = hasGps(meta.exif);
  return {
    format: meta.format,
    size: `${meta.width}x${meta.height}`,
    orientation: meta.orientation ?? 'none',
    exif: meta.exif ? `${meta.exif.length} bytes` : 'none',
    gps: gps === null ? 'unknown (EXIF unparseable)' : gps ? 'YES' : 'no',
    xmp: meta.xmp ? `${meta.xmp.length} bytes` : 'none',
    iptc: meta.iptc ? `${meta.iptc.length} bytes` : 'none',
    icc: meta.icc ? `${meta.icc.length} bytes` : 'none',
  };
}
const print = (label, d) => console.log(`${label}\n` + Object.entries(d).map(([k, v]) => `  ${k.padEnd(12)}${v}`).join('\n'));

const [input, output] = positional;
const inMeta = await sharp(input).metadata();
print(`Input: ${input}`, describe(inMeta));
if (opts.inspect) process.exit(0);

const quality = Number(opts.quality ?? 82);
let img = sharp(input).rotate(); // bake in EXIF orientation before the metadata goes
if (opts.square) {
  const n = Number(opts.square);
  img = img.resize(n, n, { fit: 'cover', position: opts.position ?? 'centre', withoutEnlargement: false });
} else if (opts.width) {
  img = img.resize({ width: Number(opts.width), withoutEnlargement: true });
}
const ext = extname(output).toLowerCase();
const formats = {
  '.jpg': () => img.jpeg({ quality, mozjpeg: true }),
  '.jpeg': () => img.jpeg({ quality, mozjpeg: true }),
  '.webp': () => img.webp({ quality }),
  '.avif': () => img.avif({ quality }),
  '.png': () => img.png(),
};
if (!formats[ext]) throw new Error(`Unsupported output extension "${ext}"`);
// sharp drops EXIF, XMP, and IPTC unless asked to keep them; it is not asked to here.
await formats[ext]().toFile(output);

const outMeta = await sharp(output).metadata();
const outDesc = describe(outMeta);
print(`Output: ${output}`, outDesc);
const leaked = ['exif', 'xmp', 'iptc'].filter((k) => outDesc[k] !== 'none');
if (leaked.length) {
  console.error(`FAILED: output still carries ${leaked.join(', ')}`);
  process.exit(1);
}
console.log('OK: no EXIF, GPS, XMP, or IPTC in the output.' + (outMeta.icc ? ' (ICC color profile kept; it does not identify anyone.)' : ''));
