import { heroBlob, heroWash, softBlob, softBlobB, tileBlob } from "@/lib/shapes";

/**
 * Rendered once, in the layout. Everything else references these by id.
 *
 * The clip paths are in objectBoundingBox units (0–1), so a single shape
 * stretches to fit any photo at any size — which is what makes the torn
 * watercolour edge work identically on a phone and a 27" monitor.
 */
export default function SvgDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <clipPath id="clipHero" clipPathUnits="objectBoundingBox">
          <path d={heroBlob} />
        </clipPath>
        <clipPath id="clipWash" clipPathUnits="objectBoundingBox">
          <path d={heroWash} />
        </clipPath>
        <clipPath id="clipSoft" clipPathUnits="objectBoundingBox">
          <path d={softBlob} />
        </clipPath>
        <clipPath id="clipSoftB" clipPathUnits="objectBoundingBox">
          <path d={softBlobB} />
        </clipPath>
        <clipPath id="clipTile" clipPathUnits="objectBoundingBox">
          <path d={tileBlob} />
        </clipPath>

        <linearGradient id="inkGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#17263c" />
          <stop offset="55%" stopColor="#2e4260" />
          <stop offset="100%" stopColor="#b99458" />
        </linearGradient>
      </defs>
    </svg>
  );
}
