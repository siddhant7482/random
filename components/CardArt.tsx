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
