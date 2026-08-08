/**
 * Hand-drawn botanical line art.
 *
 * Every stroke carries pathLength="1" so the draw-on animation in
 * globals.css times identically across paths of wildly different length.
 * Nothing animates here directly — an ancestor with `is-drawn` starts it,
 * which `Reveal` applies when the section scrolls into view.
 */

type SvgProps = React.SVGProps<SVGSVGElement>;

/** A climbing stem with alternating leaves — sits in a page corner. */
export function CornerFloral({ flip = false, ...rest }: { flip?: boolean } & SvgProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      className="floralSvg"
      aria-hidden="true"
      style={flip ? { transform: "scale(-1,-1)" } : undefined}
      {...rest}
    >
      <g className="draw" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path pathLength="1" d="M8,8 C58,28 96,68 118,118 C133,152 139,188 141,224" />
        <path pathLength="1" d="M54,30 C68,16 94,16 104,32 C92,48 66,48 54,30 Z" />
        <path pathLength="1" d="M82,64 C98,48 126,50 134,68 C120,84 94,82 82,64 Z" />
        <path pathLength="1" d="M106,102 C124,88 150,92 156,110 C140,124 116,120 106,102 Z" />
        <path pathLength="1" d="M28,42 C16,58 18,84 36,92 C48,76 44,52 28,42 Z" />
        <path pathLength="1" d="M56,84 C44,102 48,128 66,136 C78,118 72,94 56,84 Z" />
        <path pathLength="1" d="M82,132 C70,150 76,176 94,182 C105,164 98,142 82,132 Z" />
      </g>
      <g className="bloom">
        <circle cx="150" cy="146" r="4.5" />
        <circle cx="164" cy="160" r="3" />
        <circle cx="140" cy="167" r="2.4" />
      </g>
    </svg>
  );
}

/** Two facing laurel leaves on a hairline rule — the section separator. */
export function DividerFloral(props: SvgProps) {
  return (
    <svg viewBox="0 0 320 40" className="floralSvg" aria-hidden="true" {...props}>
      <g className="draw" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
        <path pathLength="1" d="M10,20 H124" />
        <path pathLength="1" d="M196,20 H310" />
        <path pathLength="1" d="M138,20 C146,7 157,7 160,20 C157,33 146,33 138,20 Z" />
        <path pathLength="1" d="M182,20 C174,7 163,7 160,20 C163,33 174,33 182,20 Z" />
      </g>
      <g className="bloom">
        <circle cx="160" cy="20" r="2.6" />
      </g>
    </svg>
  );
}

/** A wide sweeping garland for the footer. */
export function GarlandFloral(props: SvgProps) {
  return (
    <svg viewBox="0 0 400 90" className="floralSvg" aria-hidden="true" {...props}>
      <g className="draw" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
        <path pathLength="1" d="M28,62 C90,62 130,40 200,40 C270,40 310,62 372,62" />
        <path pathLength="1" d="M170,40 C176,25 191,21 199,32 C193,47 178,51 170,40 Z" />
        <path pathLength="1" d="M230,40 C224,25 209,21 201,32 C207,47 222,51 230,40 Z" />
        <path pathLength="1" d="M119,48 C123,35 138,31 145,42 C138,55 125,57 119,48 Z" />
        <path pathLength="1" d="M281,48 C277,35 262,31 255,42 C262,55 275,57 281,48 Z" />
        <path pathLength="1" d="M68,57 C72,46 85,44 90,53 C84,63 73,64 68,57 Z" />
        <path pathLength="1" d="M332,57 C328,46 315,44 310,53 C316,63 327,64 332,57 Z" />
      </g>
      <g className="bloom">
        <circle cx="200" cy="37" r="3" />
      </g>
    </svg>
  );
}

/** A single sprig — used as a quiet full stop between blocks. */
export function SprigFloral(props: SvgProps) {
  return (
    <svg viewBox="0 0 60 90" className="floralSvg" aria-hidden="true" {...props}>
      <g className="draw" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
        <path pathLength="1" d="M30,86 C30,60 30,38 30,14" />
        <path pathLength="1" d="M30,30 C21,22 10,24 8,33 C17,41 27,39 30,30 Z" />
        <path pathLength="1" d="M30,30 C39,22 50,24 52,33 C43,41 33,39 30,30 Z" />
        <path pathLength="1" d="M30,52 C22,45 12,47 10,55 C18,62 28,60 30,52 Z" />
        <path pathLength="1" d="M30,52 C38,45 48,47 50,55 C42,62 32,60 30,52 Z" />
      </g>
      <g className="bloom">
        <circle cx="30" cy="12" r="3" />
      </g>
    </svg>
  );
}

/* ============================================================
   DETAIL CARD ICONS
   ============================================================ */

const ICONS = {
  pin: (
    <>
      <path pathLength="1" d="M24 42s14-11.5 14-22a14 14 0 1 0-28 0c0 10.5 14 22 14 22Z" />
      <circle pathLength="1" cx="24" cy="20" r="5" />
    </>
  ),
  dress: (
    <>
      <path pathLength="1" d="M16 10 24 6l8 4 6 6-5 5-3-2v19H18V19l-3 2-5-5Z" />
    </>
  ),
  bed: (
    <>
      <path pathLength="1" d="M6 34V16a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v18" />
      <path pathLength="1" d="M6 34h36v6H6z" />
      <path pathLength="1" d="M14 20h8v6h-8zM26 20h8v6h-8z" />
    </>
  ),
  clock: (
    <>
      <circle pathLength="1" cx="24" cy="24" r="17" />
      <path pathLength="1" d="M24 13v11l7 5" />
    </>
  ),
  gift: (
    <>
      <path pathLength="1" d="M8 18h32v22H8zM6 12h36v6H6zM24 12v28" />
      <path pathLength="1" d="M24 12c-4-7-12-5-10 0M24 12c4-7 12-5 10 0" />
    </>
  ),
  heart: (
    <>
      <path pathLength="1" d="M24 40s-14-8.5-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 9.5-14 18-14 18Z" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function DetailIcon({ name, ...rest }: { name: IconName } & SvgProps) {
  return (
    <svg viewBox="0 0 48 48" className="floralSvg" aria-hidden="true" {...rest}>
      <g className="draw" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        {ICONS[name]}
      </g>
    </svg>
  );
}
