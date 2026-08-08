/**
 * Generates soft watercolour-wash placeholder images into public/images/.
 *
 * These exist so the site reads as finished before any real photographs are
 * taken — they show off the torn edges, the gallery mosaic and the tonal
 * balance without pretending to be anyone's engagement shoot. Overwrite any
 * of them with a real photo of the same name and nothing else needs changing.
 *
 *   npm run placeholders
 *
 * Everything is deterministic: same seed, same wash, every run.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images");

/* ------------------------------------------------------------------
   Minimal PNG writer (8-bit RGB, no interlacing, filter type 0)
   ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------
   Painting
   ------------------------------------------------------------------ */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Hermite ease — smooth 1 at `edge0`, 0 at `edge1`. */
const falloff = (d) => {
  const t = clamp01(1 - d);
  return t * t * (3 - 2 * t);
};

/* The site palette, so the washes always belong to the page. */
const PALETTE = {
  ivory: [251, 249, 246],
  paper: [244, 240, 234],
  blush: [235, 210, 202],
  sage: [156, 172, 150],
  gold: [214, 184, 133],
  navy: [42, 62, 92],
  dusk: [176, 168, 186],
  clay: [206, 172, 152],
};

/** Smooth 2-D field from a handful of sine harmonics — cheap and seamless. */
function makeField(rand, count, scale) {
  return Array.from({ length: count }, () => ({
    fx: (rand() * 2 - 1) * scale,
    fy: (rand() * 2 - 1) * scale,
    amp: rand(),
    phase: rand() * Math.PI * 2,
  }));
}

function sampleField(field, x, y) {
  let v = 0;
  let total = 0;
  for (const h of field) {
    v += Math.sin(x * h.fx + y * h.fy + h.phase) * h.amp;
    total += h.amp;
  }
  return v / (total || 1);
}

function paint({ width, height, seed, tones, mood = "warm" }) {
  const rand = mulberry32(seed);
  const rgb = Buffer.alloc(width * height * 3);

  const warp = makeField(rand, 4, 9);
  const grain = makeField(rand, 3, 46);

  // three or four soft blooms of colour
  const blobs = tones.map((tone, i) => ({
    color: PALETTE[tone],
    cx: rand() * 0.9 + 0.05,
    cy: rand() * 0.9 + 0.05,
    rx: 0.34 + rand() * 0.42,
    ry: 0.34 + rand() * 0.42,
    alpha: i === 0 ? 0.55 + rand() * 0.2 : 0.28 + rand() * 0.3,
  }));

  // a light source, so each image has somewhere the eye rests
  const lightX = rand() * 0.6 + 0.2;
  const lightY = rand() * 0.35 + 0.08;

  for (let py = 0; py < height; py++) {
    const v = py / (height - 1);

    for (let px = 0; px < width; px++) {
      const u = px / (width - 1);

      // vertical tonal base: brighter sky above, warmer ground below
      const top = mood === "cool" ? PALETTE.ivory : PALETTE.ivory;
      const bottom = mood === "cool" ? PALETTE.paper : PALETTE.paper;
      let r = lerp(top[0], bottom[0], v);
      let g = lerp(top[1], bottom[1], v);
      let b = lerp(top[2], bottom[2], v);

      const wx = sampleField(warp, u, v) * 0.11;
      const wy = sampleField(warp, v + 3.1, u - 1.7) * 0.11;

      for (const blob of blobs) {
        const dx = (u + wx - blob.cx) / blob.rx;
        const dy = (v + wy - blob.cy) / blob.ry;
        const a = falloff(Math.sqrt(dx * dx + dy * dy)) * blob.alpha;
        if (a <= 0) continue;
        r = lerp(r, blob.color[0], a);
        g = lerp(g, blob.color[1], a);
        b = lerp(b, blob.color[2], a);
      }

      // warm glow around the light source
      const ld = Math.sqrt((u - lightX) ** 2 + (v - lightY) ** 2) / 0.62;
      const glow = falloff(ld) * 0.4;
      r = lerp(r, 255, glow);
      g = lerp(g, 251, glow * 0.95);
      b = lerp(b, 240, glow * 0.85);

      // gentle vignette keeps the torn edge from looking pasted on
      const vd = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) / 0.78;
      const vig = clamp01(vd) ** 2 * 0.11;
      r = lerp(r, 190, vig);
      g = lerp(g, 184, vig);
      b = lerp(b, 176, vig);

      /* Paper grain. Kept mostly to the smooth field rather than per-pixel
         randomness — white noise is incompressible and was tripling the PNG
         size for texture nobody can see at viewing distance. */
      const n = sampleField(grain, u, v) * 3 + (rand() - 0.5) * 0.6;

      const o = (py * width + px) * 3;
      rgb[o] = clamp01((r + n) / 255) * 255;
      rgb[o + 1] = clamp01((g + n) / 255) * 255;
      rgb[o + 2] = clamp01((b + n) / 255) * 255;
    }
  }

  return encodePNG(width, height, rgb);
}

/* ------------------------------------------------------------------
   The set
   ------------------------------------------------------------------ */

const IMAGES = [
  { name: "hero.png", width: 1400, height: 1400, seed: 101, tones: ["blush", "gold", "clay"] },
  { name: "story-1.png", width: 1000, height: 1250, seed: 211, tones: ["sage", "gold", "ivory"] },
  { name: "story-2.png", width: 1000, height: 1250, seed: 223, tones: ["dusk", "blush", "gold"] },
  { name: "story-3.png", width: 1000, height: 1250, seed: 237, tones: ["gold", "clay", "blush"] },
  { name: "gallery-1.png", width: 1000, height: 1000, seed: 311, tones: ["blush", "sage"] },
  { name: "gallery-2.png", width: 1000, height: 1400, seed: 323, tones: ["gold", "clay", "blush"] },
  { name: "gallery-3.png", width: 1000, height: 1000, seed: 337, tones: ["dusk", "gold"] },
  { name: "gallery-4.png", width: 1000, height: 1000, seed: 349, tones: ["sage", "ivory", "gold"] },
  { name: "gallery-5.png", width: 1500, height: 1000, seed: 353, tones: ["clay", "blush", "navy"] },
  { name: "gallery-6.png", width: 1000, height: 1000, seed: 367, tones: ["gold", "blush"] },
];

mkdirSync(OUT, { recursive: true });

for (const spec of IMAGES) {
  const png = paint(spec);
  writeFileSync(join(OUT, spec.name), png);
  console.log(`${spec.name.padEnd(16)} ${spec.width}x${spec.height}  ${(png.length / 1024).toFixed(0)} KB`);
}

console.log(`\nWrote ${IMAGES.length} placeholder washes to public/images/`);
