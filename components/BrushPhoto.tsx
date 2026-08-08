"use client";

import { useState } from "react";
import Image from "next/image";
import s from "./BrushPhoto.module.css";

type Variant = "hero" | "soft" | "softB" | "tile";

const CLIP: Record<Variant, string> = {
  hero: "url(#clipHero)",
  soft: "url(#clipSoft)",
  softB: "url(#clipSoftB)",
  tile: "url(#clipTile)",
};

type Props = {
  src: string;
  alt: string;
  variant?: Variant;
  /** aspect ratio, width / height */
  ratio?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** the soft colour bleed behind the photo */
  wash?: boolean;
  /**
   * CSS object-position, e.g. "50% 30%". Photos are cropped to fill the torn
   * shape, so use this to keep faces in frame when the source is a very
   * different aspect ratio to the slot.
   */
  focus?: string;
};

/**
 * A photo clipped to a hand-torn watercolour edge, with an offset colour
 * wash bleeding out behind it — the treatment from the save-the-date card.
 *
 * If the image file isn't there yet, it degrades to a labelled placeholder
 * rather than a broken-image icon, so the site looks finished from day one.
 */
export default function BrushPhoto({
  src,
  alt,
  variant = "hero",
  ratio = 1,
  priority = false,
  sizes = "(max-width: 700px) 90vw, 640px",
  className = "",
  wash = true,
  focus,
}: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`${s.wrap} ${className}`} style={{ aspectRatio: String(ratio) }}>
      {/* The wash is a fixed torn silhouette; the colour inside it drifts.
          Three blooms on unrelated timings so they never fall into step. */}
      {wash && (
        <div className={s.wash} aria-hidden="true">
          <span className={`${s.bloom} ${s.bloomBlush}`} />
          <span className={`${s.bloom} ${s.bloomSage}`} />
          <span className={`${s.bloom} ${s.bloomGold}`} />
        </div>
      )}

      <div className={s.clip} style={{ clipPath: CLIP[variant] }}>
        {failed ? (
          <Placeholder src={src} />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className={s.img}
            style={focus ? { objectPosition: focus } : undefined}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </figure>
  );
}

/** Shown when the photo hasn't been added yet. Tells you exactly where to put it. */
function Placeholder({ src }: { src: string }) {
  return (
    <div className={s.placeholder}>
      <svg viewBox="0 0 120 120" className={s.placeholderArt} aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
          <path d="M60,104 C60,74 60,52 60,26" />
          <path d="M60,44 C48,34 34,36 30,48 C42,58 56,56 60,44 Z" />
          <path d="M60,44 C72,34 86,36 90,48 C78,58 64,56 60,44 Z" />
          <path d="M60,68 C50,60 38,62 35,72 C45,80 57,78 60,68 Z" />
          <path d="M60,68 C70,60 82,62 85,72 C75,80 63,78 60,68 Z" />
        </g>
        <circle cx="60" cy="24" r="3.5" fill="currentColor" opacity="0.7" />
      </svg>
      <span className={s.placeholderText}>{src.replace(/^\//, "")}</span>
    </div>
  );
}
