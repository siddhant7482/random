/**
 * Renders the A & R monogram into the site's favicons.
 *
 * You only need this if the initials or the palette change — the generated
 * icons are committed. To run it:
 *
 *   npm install --no-save puppeteer-core   # not a project dependency
 *   npm run build && npm start             # it renders from the live site
 *   npm run icons
 *
 * It drives a real browser pointed at the running site, so the monogram is
 * drawn with the very same self-hosted Cormorant Garamond and Pinyon Script
 * the pages use. Hand-drawing the letterforms as SVG paths would drift from
 * the typography the moment either font changed.
 *
 * Writes app/icon.png, app/apple-icon.png and app/favicon.ico.
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SITE = process.env.SITE_URL || "http://localhost:3000";

const IVORY = "#fbf9f6";
const GOLD = "#d8bc8e";

/* Navy at 0.996 rather than a flat hex, and the reason is not cosmetic.
   Chrome encodes a screenshot as RGB whenever every pixel is fully opaque,
   and a PNG embedded in an .ico must be RGBA or decoders reject the file
   outright. Shaving alpha to 254/255 forces the channel to exist. The colour
   shift is under half a percent — invisible against any tab background. */
const INK = "rgba(23, 38, 60, 0.996)";

/**
 * @param {number} size   rendered edge length in px
 * @param {boolean} bleed true for the browser tab (fills the square), false
 *                        for iOS, which rounds the corners itself and needs
 *                        the mark inset so nothing is clipped
 */
const markup = (size, bleed) => {
  /* Below about 24px the Pinyon ampersand has too few pixels to be anything
     but a smudge, so the small sizes carry the two initials alone and give
     them the extra room. The .ico holds each size separately, so this costs
     nothing. */
  const tiny = size < 24;
  const letter = size * (tiny ? 0.46 : bleed ? 0.34 : 0.3);

  return `
  <div id="icon" style="
    position:relative;z-index:9999;
    width:${size}px;height:${size}px;
    background:${INK};
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;
    ${bleed ? "" : `padding:${Math.round(size * 0.1)}px;box-sizing:border-box;`}
  ">
    <div style="
      display:flex;align-items:baseline;justify-content:center;
      gap:${size * (tiny ? 0.06 : 0.035)}px;
      font-family:var(--font-serif),Georgia,serif;
      font-weight:500;
      font-size:${letter}px;
      line-height:1;
      color:${IVORY};
      /* greyscale, not subpixel: LCD antialiasing leaves red/blue fringes on
         the glyph edges, which look like artefacts once the icon is scaled */
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    ">
      <span>A</span>
      ${
        tiny
          ? ""
          : `<span style="
        font-family:var(--font-script),cursive;
        font-weight:400;
        font-size:${size * (bleed ? 0.3 : 0.26)}px;
        color:${GOLD};
      ">&amp;</span>`
      }
      <span>R</span>
    </div>
  </div>`;
};

/* The site's own chrome would otherwise sit on top of the icon: the ambient
   wash is a fixed ::before, and the petals are a fixed canvas. */
const STRIP_CHROME = `
  body::before { display: none !important; }
  canvas, header, footer, main { display: none !important; }
  /* transparent, not white: an opaque page background would composite the
     icon to fully opaque and Chrome would then encode RGB, which an .ico
     cannot contain */
  html, body { background: transparent !important; }`;

/* ---------- a minimal .ico writer ----------
   ICO is a tiny container: a 6-byte header, one 16-byte entry per image, then
   the image payloads. Since Windows Vista those payloads may be PNG rather
   than BMP, which means we can embed the PNGs we already have verbatim. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];

  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/* ---------- render ---------- */

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    // belt and braces with -webkit-font-smoothing, so no colour fringing
    "--disable-lcd-text",
  ],
});

const page = await browser.newPage();
await page.goto(SITE, { waitUntil: "networkidle0", timeout: 60000 });
// the site's fonts are already downloading; wait for them before drawing text
await page.evaluate(() => document.fonts.ready);

async function shot(size, bleed) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.evaluate(
    (html, css) => {
      document.body.style.margin = "0";
      let style = document.getElementById("icon-strip");
      if (!style) {
        style = document.createElement("style");
        style.id = "icon-strip";
        document.head.appendChild(style);
      }
      style.textContent = css;
      // keep the stripping stylesheet, replace everything else
      document.body.innerHTML = html;
    },
    markup(size, bleed),
    STRIP_CHROME,
  );
  await new Promise((r) => setTimeout(r, 120));
  const el = await page.$("#icon");

  /* omitBackground makes Chrome encode RGBA rather than RGB. The icon itself
     is still fully opaque — its own navy background paints over everything —
     but the alpha channel has to be present: a PNG embedded in an .ico must
     be RGBA, and decoders reject it outright otherwise. */
  return Buffer.from(await el.screenshot({ encoding: "binary", omitBackground: true }));
}

/** PNG colour type lives at byte 25; 6 is RGBA, 2 is RGB. */
function assertRgba(buf, label) {
  const colourType = buf[25];
  if (colourType !== 6) {
    throw new Error(
      `${label}: PNG colour type ${colourType}, expected 6 (RGBA). ` +
        `An .ico containing a non-RGBA PNG fails to decode.`,
    );
  }
}

const png512 = await shot(512, true);
const apple180 = await shot(180, false);
const png32 = await shot(32, true);
const png16 = await shot(16, true);

await browser.close();

assertRgba(png16, "favicon 16");
assertRgba(png32, "favicon 32");

writeFileSync(join(APP, "icon.png"), png512);
writeFileSync(join(APP, "apple-icon.png"), apple180);
writeFileSync(join(APP, "favicon.ico"), buildIco([
  { size: 16, data: png16 },
  { size: 32, data: png32 },
]));

const kb = (b) => `${(b.length / 1024).toFixed(1)} KB`;
console.log(`app/icon.png        512x512  ${kb(png512)}`);
console.log(`app/apple-icon.png  180x180  ${kb(apple180)}`);
console.log(`app/favicon.ico     16+32    ${kb(buildIco([{ size: 16, data: png16 }, { size: 32, data: png32 }]))}`);
