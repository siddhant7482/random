// Deterministic torn-watercolour edge generator -> objectBoundingBox path data (0..1)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise around a circle (periodic) built from a few harmonics
function lobes(rand, count) {
  const h = [];
  for (let i = 0; i < count; i++) h.push({ freq: i + 2, amp: rand(), phase: rand() * Math.PI * 2 });
  return h;
}
function lobeAt(h, t) {
  let v = 0;
  for (const { freq, amp, phase } of h) v += Math.sin(t * freq + phase) * amp / freq;
  return v;
}

function blob({ seed, points = 220, rx = 0.5, ry = 0.5, lobeAmt = 0.055, tearAmt = 0.012, nLobes = 5 }) {
  const rand = mulberry32(seed);
  const H = lobes(rand, nLobes);
  // pre-roll fine tear noise, smoothed slightly so it reads as fibre not static
  const raw = Array.from({ length: points }, () => rand() * 2 - 1);
  const tear = raw.map((_, i) => {
    const a = raw[(i - 1 + points) % points], b = raw[i], c = raw[(i + 1) % points];
    return (a + b * 2 + c) / 4;
  });

  const pts = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const r = 1 + lobeAt(H, t) * lobeAmt + tear[i] * tearAmt;
    pts.push([
      +(0.5 + Math.cos(t) * rx * r).toFixed(4),
      +(0.5 + Math.sin(t) * ry * r).toFixed(4),
    ]);
  }
  return "M" + pts.map((p) => p.join(",")).join("L") + "Z";
}

const shapes = {
  heroBlob:  blob({ seed: 20260123, points: 240, rx: 0.495, ry: 0.495, lobeAmt: 0.06,  tearAmt: 0.011, nLobes: 5 }),
  heroWash:  blob({ seed: 771,      points: 200, rx: 0.5,   ry: 0.5,   lobeAmt: 0.075, tearAmt: 0.016, nLobes: 4 }),
  softBlob:  blob({ seed: 4242,     points: 220, rx: 0.495, ry: 0.495, lobeAmt: 0.05,  tearAmt: 0.010, nLobes: 6 }),
  softBlobB: blob({ seed: 9091,     points: 220, rx: 0.495, ry: 0.495, lobeAmt: 0.052, tearAmt: 0.010, nLobes: 5 }),
  tileBlob:  blob({ seed: 3311,     points: 200, rx: 0.498, ry: 0.498, lobeAmt: 0.028, tearAmt: 0.008, nLobes: 6 }),
};

/* Emitted as CSS mask images rather than SVG <clipPath> elements.
 *
 * `clip-path: url(#id)` points at a separate SVG somewhere else in the
 * document. If that reference isn't resolved when the element is painted, the
 * browser applies no clip at all and you get a bare rectangle — which is
 * exactly the flash of a square photo this replaced. A mask carries its own
 * geometry, so there is nothing to resolve and nothing to race.
 *
 * viewBox 0 0 1 1 with preserveAspectRatio='none' reproduces what
 * clipPathUnits="objectBoundingBox" did: the shape stretches to whatever size
 * the element happens to be.
 */
function maskUrl(path) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'>` +
    `<path d='${path}' fill='%23fff'/></svg>`;
  // only the characters that are unsafe unencoded inside a CSS url()
  return svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/"/g, "%22");
}

// ASCII-only header: this goes through a shell stdout redirect, and a stray
// em-dash comes out mangled on some Windows consoles.
let out = "/* AUTO-GENERATED - do not edit by hand.\n";
out += "   Torn watercolour edges, as CSS masks.\n";
out += "   Regenerate with:  npm run shapes\n";
out += "   Change the `seed` numbers in scripts/generate-shapes.mjs for a new set. */\n\n";

for (const [name, path] of Object.entries(shapes)) {
  out += `.${name} {\n`;
  out += `  -webkit-mask-image: url("data:image/svg+xml,${maskUrl(path)}");\n`;
  out += `          mask-image: url("data:image/svg+xml,${maskUrl(path)}");\n`;
  out += `}\n\n`;
}

out += `/* shared by every shape above */\n`;
out += `.masked {\n`;
out += `  -webkit-mask-size: 100% 100%;\n`;
out += `          mask-size: 100% 100%;\n`;
out += `  -webkit-mask-repeat: no-repeat;\n`;
out += `          mask-repeat: no-repeat;\n`;
out += `  -webkit-mask-position: center;\n`;
out += `          mask-position: center;\n`;
out += `}\n`;

process.stdout.write(out);
