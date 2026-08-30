/**
 * The engraved ornament from the save-the-date card.
 *
 * Only the small typographic furniture lives here: the rule under the names
 * and the heart that closes the card. The crown arc used to live here too,
 * until the artwork turned out to carry its own.
 *
 * The illustrated medallion is NOT drawn here. An earlier version tried to
 * reproduce the wreath and the two monuments in SVG and it was not close:
 * that artwork is engraved, with a level of detail hand-authored paths cannot
 * reach. It is used as an image instead — see Hero.tsx.
 */

type Svg = React.SVGProps<SVGSVGElement>;

/* ============================================================
   FLEURONS
   ============================================================ */

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
   FOOTHILLS
   ============================================================ */

/**
 * The Shivalik ridge Panchkula sits against, as engraved line art.
 *
 * A wordless sense of place: the same hills already stand behind the Open
 * Hand in the card's own illustration, so this echoes the artwork rather than
 * introducing a new motif. Deliberately very faint and completely still — it
 * is a horizon for the page to rest on, not something to look at.
 *
 * `preserveAspectRatio="none"` on purpose: the ridge stretches to whatever
 * width the page is, which is what a distant horizon does anyway, and it
 * means no awkward letterboxing on a wide screen.
 */
export function Foothills(props: Svg) {
  return (
    <svg
      viewBox="0 0 1200 180"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* furthest ridge, palest */}
      <path
        d="M0,150 L0,104 C86,66 150,52 214,66 C286,82 330,116 402,110 C470,104 512,66 588,58
           C664,50 706,84 782,92 C858,100 912,72 986,60 C1062,48 1130,66 1200,96 L1200,150 Z"
        fill="currentColor"
        opacity="0.10"
      />
      {/* middle ridge */}
      <path
        d="M0,152 L0,124 C74,102 138,92 206,102 C282,113 336,138 404,132 C472,126 520,100 596,96
           C672,92 722,116 796,122 C870,128 928,110 1000,102 C1072,94 1138,108 1200,128 L1200,152 Z"
        fill="currentColor"
        opacity="0.14"
      />
      {/* nearest ridge, with a drawn crest so it reads as engraved */}
      <path
        d="M0,156 L0,142 C80,130 146,126 216,134 C296,143 348,158 420,154 C492,150 540,134 614,132
           C688,130 740,148 812,152 C884,156 940,146 1010,140 C1080,134 1140,142 1200,154 L1200,156 Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M0,142 C80,130 146,126 216,134 C296,143 348,158 420,154 C492,150 540,134 614,132
           C688,130 740,148 812,152 C884,156 940,146 1010,140 C1080,134 1140,142 1200,154"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.3"
      />
    </svg>
  );
}
