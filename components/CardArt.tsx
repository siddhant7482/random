/**
 * The engraved ornament from the save-the-date card.
 *
 * All of it is drawn rather than photographed, so it stays crisp at any size
 * and re-colours from the CSS tokens. Shapes are placed from small data
 * tables rather than written out one path at a time — the wreath alone is
 * about seventy elements, and a table is the only way to keep it legible and
 * adjustable.
 */

type Svg = React.SVGProps<SVGSVGElement>;

/* ============================================================
   FLEURONS
   ============================================================ */

/** The thin double arc with a crown ornament that caps the card. */
export function TopArc(props: Svg) {
  return (
    <svg viewBox="0 0 520 120" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeLinecap="round">
        <path d="M18,116 C50,44 140,10 260,10 C380,10 470,44 502,116" strokeWidth="1.4" />
        <path d="M34,118 C66,54 148,22 260,22 C372,22 454,54 486,118" strokeWidth="0.7" opacity="0.65" />
      </g>

      {/* crown: a small lily over a pair of facing scrolls */}
      <g transform="translate(260 4)" fill="currentColor">
        <path d="M0,-4 C3.4,2 3.4,10 0,15 C-3.4,10 -3.4,2 0,-4 Z" />
        <path d="M0,12 C6,7 13,8 15,13 C10,17 3,16 0,12 Z" />
        <path d="M0,12 C-6,7 -13,8 -15,13 C-10,17 -3,16 0,12 Z" />
        <circle cx="0" cy="19" r="2.1" />
      </g>
      <g stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round">
        <path d="M238,26 C246,18 254,20 258,26" />
        <path d="M282,26 C274,18 266,20 262,26" />
      </g>
    </svg>
  );
}

/** Small divider: a lozenge between two hairlines, as under the names. */
export function Fleuron({ width = 200, ...props }: { width?: number } & Svg) {
  return (
    <svg viewBox="0 0 200 16" width={width} fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.75">
        <path d="M6,8 H78" />
        <path d="M122,8 H194" />
      </g>
      <g fill="currentColor">
        <path d="M100,1.5 C103,4.5 103,11.5 100,14.5 C97,11.5 97,4.5 100,1.5 Z" />
        <circle cx="88" cy="8" r="1.5" />
        <circle cx="112" cy="8" r="1.5" />
      </g>
    </svg>
  );
}

/** The little heart that closes the card, under the RSVP box. */
export function HeartRule(props: Svg) {
  return (
    <svg viewBox="0 0 160 18" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7">
        <path d="M6,9 H62" />
        <path d="M98,9 H154" />
      </g>
      <path
        d="M80,14.5 C74,10.5 70.5,8 70.5,5.6 C70.5,3.6 72.1,2.2 74,2.2 C75.4,2.2 76.7,3 80,5.6
           C83.3,3 84.6,2.2 86,2.2 C87.9,2.2 89.5,3.6 89.5,5.6 C89.5,8 86,10.5 80,14.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ============================================================
   WREATH
   ============================================================ */

const CX = 300;
const CY = 300;
const RX = 262;
const RY = 268;

/** θ measured from the top, clockwise, so the table below reads like a clock. */
function at(theta: number, inset = 0) {
  const r = (theta * Math.PI) / 180;
  return [CX + (RX - inset) * Math.sin(r), CY - (RY - inset) * Math.cos(r)] as const;
}

type Bloom = { t: number; kind: Kind; s: number; r: number; in: number };
type Kind = "rose" | "cosmos" | "sprig" | "leaf" | "berry";

/* The ring is generated rather than listed. The first pass was a hand-written
   table of about thirty items and it read as scattered — a wreath needs to be
   crowded enough that the eye sees one continuous garland, which takes closer
   to a hundred pieces than thirty.

   Deterministic throughout: the same angles produce the same wreath on the
   server and in the browser, so nothing shifts on hydration. */

/** Roses anchor the composition; everything else fills between them. */
const ROSE_AT = [296, 212, 134, 64];
/** The top stays open between 340° and 20° for the arc and the eyebrow. */
const FROM = 20;
const TO = 340;
const STEP = 4.2;

function buildRing(): Bloom[] {
  const out: Bloom[] = [];
  const placed = new Set<number>();

  for (let t = FROM; t <= TO; t += STEP) {
    const i = out.length;

    // a rose whenever we first pass one of its anchors
    const anchor = ROSE_AT.find((a) => Math.abs(a - t) < STEP / 2 && !placed.has(a));
    if (anchor !== undefined) {
      placed.add(anchor);
      out.push({ t, kind: "rose", s: 1.15, r: (t % 24) - 12, in: 4 });
      continue;
    }
    // keep a clear margin around each rose so nothing grows out of it
    if (ROSE_AT.some((a) => Math.abs(a - t) < 9)) continue;

    /* Leaves outnumber flowers roughly two to one, which is what stops a
       wreath looking like a string of beads. */
    const cycle = i % 7;
    const kind: Kind =
      cycle === 0 || cycle === 3 ? "cosmos" : cycle === 5 ? "sprig" : cycle === 6 ? "berry" : "leaf";

    // leaves lie along the ring, flowers face outward
    const tangent = t + (i % 2 ? 96 : -96);

    out.push({
      t,
      kind,
      s: kind === "leaf" ? 0.72 + (i % 4) * 0.09 : kind === "cosmos" ? 0.5 + (i % 3) * 0.11 : 0.72,
      r: kind === "leaf" ? tangent : (i % 30) - 15,
      // alternating inset gives the garland some thickness
      in: kind === "leaf" ? (i % 3) * 15 - 6 : (i % 2) * 12,
    });
  }
  return out;
}

const RING = buildRing();

function Rose({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      {/* outer petals */}
      {[0, 51, 102, 153, 204, 255, 306].map((a) => (
        <ellipse
          key={a}
          transform={`rotate(${a}) translate(0 -12)`}
          rx="9.5"
          ry="11"
          fill="var(--rose-2)"
          stroke="var(--rose)"
          strokeWidth="0.7"
        />
      ))}
      {/* inner whorl */}
      {[20, 92, 164, 236, 308].map((a) => (
        <ellipse
          key={a}
          transform={`rotate(${a}) translate(0 -6.5)`}
          rx="6"
          ry="7"
          fill="var(--rose)"
          opacity="0.85"
        />
      ))}
      <circle r="3.6" fill="var(--gold-2)" />
      <circle r="1.5" fill="var(--gold-3)" />
    </g>
  );
}

function Cosmos({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse
          key={a}
          transform={`rotate(${a}) translate(0 -11)`}
          rx="5.6"
          ry="9"
          fill="var(--rose-2)"
          stroke="var(--rose)"
          strokeWidth="0.6"
        />
      ))}
      <circle r="4.4" fill="var(--gold-2)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} transform={`rotate(${a}) translate(0 -2.4)`} r="0.9" fill="var(--gold-3)" />
      ))}
    </g>
  );
}

function Leaf({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M0,0 C7,-5 11,-15 0,-25 C-11,-15 -7,-5 0,0 Z"
        fill="var(--sage)"
        opacity="0.85"
        stroke="var(--gold-3)"
        strokeWidth="0.5"
      />
      <path d="M0,-1.5 L0,-22" stroke="var(--paper-2)" strokeWidth="0.7" opacity="0.6" fill="none" />
    </g>
  );
}

/** A stem of tiny blossoms — the mimosa-like sprays on the card. */
function Sprig({ s = 1 }: { s?: number }) {
  const buds = [
    [0, -6], [4, -12], [-5, -13], [2, -20], [-6, -21], [7, -25],
    [-2, -30], [-9, -30], [5, -35], [-4, -41], [1, -47],
  ] as const;
  return (
    <g transform={`scale(${s})`}>
      <path d="M0,0 C2,-16 -1,-32 0,-48" stroke="var(--gold-3)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {buds.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.6 : 2} fill="var(--gold-2)" stroke="var(--gold-3)" strokeWidth="0.4" />
      ))}
    </g>
  );
}

function Berry({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      {[[0, -4], [5, -10], [-5, -11], [1, -17]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill="var(--rose)" opacity="0.9" />
      ))}
      <path d="M0,0 L0,-15" stroke="var(--gold-3)" strokeWidth="0.7" strokeLinecap="round" />
    </g>
  );
}

export function Wreath(props: Svg) {
  return (
    <svg viewBox="0 0 600 600" fill="none" aria-hidden="true" {...props}>
      {/* No drawn stem ring. An earlier version had one and it showed through
          every gap in the garland as a stray arc; at this density the flowers
          and leaves describe the circle on their own. */}

      {RING.map((b, i) => {
        const [x, y] = at(b.t, b.in ?? 0);
        const rot = b.r ?? 0;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})`}>
            {b.kind === "rose" && <Rose s={b.s} />}
            {b.kind === "cosmos" && <Cosmos s={b.s} />}
            {b.kind === "leaf" && <Leaf s={b.s} />}
            {b.kind === "sprig" && <Sprig s={b.s} />}
            {b.kind === "berry" && <Berry s={b.s} />}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   THE TWO CITIES
   ============================================================ */

/**
 * Chandigarh's Open Hand on the left, a domed palace on the right, over a
 * shared hill line — the "two cities, one journey" of the card.
 *
 * Stylised line art, not an architectural drawing: at the size this renders
 * it needs to read instantly, and detail would only turn to mud.
 */
export function CityScene(props: Svg) {
  return (
    <svg viewBox="0 0 620 300" fill="none" aria-hidden="true" {...props}>
      {/* Distant hills, kept well inside the frame. The first version ran
          them edge to edge and the line carried on straight through the
          wreath, reading as a stray rule rather than a horizon. */}
      <g stroke="var(--ink-3)" strokeWidth="1" opacity="0.35" fill="none" strokeLinecap="round">
        <path d="M92,192 C140,132 186,124 232,172 C252,193 268,200 292,202" />
        <path d="M328,202 C356,199 378,184 404,152 C438,110 486,116 534,180" />
        <path d="M128,192 C162,154 190,150 216,178" opacity="0.6" />
      </g>

      {/* ---- Open Hand Monument ---- */}
      <g transform="translate(150 150)">
        {/* the hand: a palm with four fingers and a thumb, as a cupped shell */}
        <g fill="var(--paper-3)" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M-42,44 C-52,10 -44,-16 -24,-30 L-20,-28 C-30,-12 -32,4 -28,22 Z" />
          {[
            "M-24,-30 C-20,-58 -12,-72 -4,-70 C2,-68 2,-52 -6,-26",
            "M-6,-30 C0,-62 10,-76 18,-72 C25,-68 22,-50 12,-24",
            "M12,-28 C20,-56 30,-66 37,-60 C43,-54 38,-38 28,-18",
            "M28,-22 C38,-42 47,-48 52,-42 C57,-36 51,-22 42,-8",
          ].map((d, i) => (
            <path key={i} d={d} fill="var(--paper-3)" />
          ))}
          <path d="M-28,22 C-16,40 14,42 42,-8 C50,8 46,34 28,48 C4,60 -26,56 -42,44 Z" />
        </g>
        {/* engraved hatching on the palm */}
        <g stroke="var(--ink-3)" strokeWidth="0.6" opacity="0.55">
          <path d="M-30,20 C-10,32 12,30 30,10" />
          <path d="M-28,30 C-8,42 16,38 34,20" />
          <path d="M-24,40 C-6,50 14,48 30,34" />
        </g>
        {/* pivot and pedestal */}
        <path d="M-4,56 L-4,88" stroke="var(--ink-2)" strokeWidth="4" strokeLinecap="round" />
        <rect x="-40" y="88" width="72" height="34" fill="var(--paper-3)" stroke="var(--ink-2)" strokeWidth="1.4" />
        <g stroke="var(--ink-3)" strokeWidth="0.6" opacity="0.6">
          <path d="M-40,99 H32M-40,110 H32M-22,88 V122M-4,88 V122M14,88 V122" />
        </g>
      </g>

      {/* ---- domed palace ---- */}
      <g transform="translate(430 130)" stroke="var(--ink-2)" strokeLinejoin="round">
        {/* minarets */}
        {[-118, 118].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <path d="M0,-52 L0,-64" strokeWidth="1.2" />
            <circle cy="-68" r="4" fill="var(--paper-3)" strokeWidth="1.1" />
            <path d="M-7,-52 C-7,-60 7,-60 7,-52 Z" fill="var(--paper-3)" strokeWidth="1.2" />
            <rect x="-8" y="-52" width="16" height="94" fill="var(--paper-3)" strokeWidth="1.3" />
            <g stroke="var(--ink-3)" strokeWidth="0.6" opacity="0.6">
              <path d="M-8,-30 H8M-8,-8 H8M-8,14 H8" />
            </g>
          </g>
        ))}

        {/* flanking domes */}
        {[-64, 64].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <path d="M-22,-24 C-22,-46 22,-46 22,-24 Z" fill="var(--paper-3)" strokeWidth="1.3" />
            <path d="M0,-46 L0,-56" strokeWidth="1.1" />
            <circle cy="-58" r="3" fill="var(--paper-3)" strokeWidth="1" />
          </g>
        ))}

        {/* central dome on its drum */}
        <path d="M-46,-46 C-46,-96 46,-96 46,-46 Z" fill="var(--paper-3)" strokeWidth="1.6" />
        <path d="M0,-96 L0,-112" strokeWidth="1.3" />
        <circle cy="-116" r="4.5" fill="var(--paper-3)" strokeWidth="1.2" />
        <g stroke="var(--ink-3)" strokeWidth="0.6" opacity="0.5" fill="none">
          <path d="M-30,-52 C-30,-84 30,-84 30,-52" />
          <path d="M-15,-56 C-15,-90 15,-90 15,-56" />
        </g>
        <rect x="-50" y="-46" width="100" height="12" fill="var(--paper-3)" strokeWidth="1.3" />

        {/* façade with arcades */}
        <rect x="-104" y="-34" width="208" height="76" fill="var(--paper-3)" strokeWidth="1.5" />
        <path d="M-16,42 L-16,-6 C-16,-22 16,-22 16,-6 L16,42 Z" fill="var(--paper-2)" strokeWidth="1.4" />
        {[-84, -56, 44, 72].map((x) => (
          <path
            key={x}
            d={`M${x},42 L${x},2 C${x},-10 ${x + 24},-10 ${x + 24},2 L${x + 24},42 Z`}
            fill="var(--paper-2)"
            strokeWidth="1.1"
          />
        ))}
        {/* steps */}
        <g strokeWidth="1.2">
          <rect x="-56" y="42" width="112" height="8" fill="var(--paper-3)" />
          <rect x="-68" y="50" width="136" height="8" fill="var(--paper-3)" />
          <rect x="-80" y="58" width="160" height="8" fill="var(--paper-3)" />
        </g>
      </g>

      {/* the ground both sit on, fading out well before the wreath */}
      <defs>
        <linearGradient id="groundFade" x1="0" x2="1">
          <stop offset="0" stopColor="var(--gold-3)" stopOpacity="0" />
          <stop offset="0.22" stopColor="var(--gold-3)" stopOpacity="0.45" />
          <stop offset="0.78" stopColor="var(--gold-3)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--gold-3)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M70,224 H550" stroke="url(#groundFade)" strokeWidth="0.9" />
    </svg>
  );
}
