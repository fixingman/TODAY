// gen-splash.mjs — one-off generator for iOS PWA launch screens (BUG-041, third pass).
//
// iOS shows its own *launch screen* between tapping a home-screen PWA icon and the
// WebView's first paint. With no apple-touch-startup-image registered, that frame is
// white — the residual flash the v2.18.2/v2.18.7 inline-background fixes can't reach
// (those only colour the WebView's first paint, which happens one frame later).
//
// This writes one solid-#0e0e10 PNG per current iPhone resolution into assets/splash/.
// iOS is strict: each startup image must match the device's exact physical-pixel
// dimensions or it's ignored. A flat colour compresses to a few hundred bytes regardless
// of size, so the whole set is only a few KB.
//
// Dev-only authoring tooling, NOT a build step (same category as smoke-test.mjs). The
// committed PNGs are the shipped artefacts — rerun this only if the device matrix changes.
//
//   node scripts/gen-splash.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import crc32 from 'buffer-crc32';

// Single source of truth for the launch colour — mirror of --bg (#0e0e10).
// Same Rule 19 exception already documented inline on <html>/<body>: CSS vars don't
// exist at first paint, so the literal must live outside :root. Keep in sync with --bg.
const BG = { r: 0x0e, g: 0x0e, b: 0x10 };

// Portrait device-pixel dimensions (CSS w×h × DPR). One entry per distinct resolution.
const SIZES = [
  [750, 1334],   // SE 2/3, 6/7/8           — 375×667 @2
  [1242, 2208],  // 6+/7+/8+                — 414×736 @3
  [1125, 2436],  // X/XS/11Pro/12·13 mini   — 375×812 @3
  [828, 1792],   // XR/11                   — 414×896 @2
  [1242, 2688],  // XS Max/11 Pro Max       — 414×896 @3
  [1170, 2532],  // 12/12Pro/13/13Pro/14    — 390×844 @3
  [1284, 2778],  // 12·13 ProMax/14 Plus    — 428×926 @3
  [1179, 2556],  // 14Pro/15/15Pro/16       — 393×852 @3
  [1290, 2796],  // 14ProMax/15Plus/16Plus  — 430×932 @3
  [1206, 2622],  // 16 Pro                  — 402×874 @3
  [1320, 2868],  // 16 Pro Max              — 440×956 @3
];

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBuf, data]);
  return Buffer.concat([lenBuf, body, crc32(body)]);
}

function solidPng(width, height, { r, g, b }) {
  // IHDR: 8-bit, colour type 2 (truecolour RGB)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw scanlines: each row = 1 filter byte (0 = none) + width × RGB.
  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'splash');
mkdirSync(outDir, { recursive: true });

let total = 0;
for (const [w, h] of SIZES) {
  const png = solidPng(w, h, BG);
  const name = `splash-${w}x${h}.png`;
  writeFileSync(join(outDir, name), png);
  total += png.length;
  console.log(`  ✓ ${name}  (${png.length} bytes)`);
}
console.log(`\n${SIZES.length} launch images, ${total} bytes total → assets/splash/`);
