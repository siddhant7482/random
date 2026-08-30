"use client";

import { useState } from "react";
import Image from "next/image";
import { wedding } from "@/lib/config";
import s from "./Medallion.module.css";

/**
 * The illustrated centre of the card: the wreath, the monogram and the two
 * cities, as artwork rather than as drawn shapes.
 *
 * If the file is missing the component falls back to a plain gold monogram on
 * a hairline ring. That fallback is deliberately minimal — an earlier attempt
 * to reproduce the illustration in SVG looked far worse than showing nothing
 * of the kind, so the fallback aims to be quietly correct rather than a poor
 * imitation.
 */
export default function Medallion() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={s.fallback}>
        <p className={s.eyebrow}>{wedding.hero.eyebrow}</p>
        <span className={s.ring} aria-hidden="true" />
        <p className={s.monogram} aria-label={`${wedding.bride[0]} and ${wedding.groom[0]}`}>
          <span>{wedding.bride[0]}</span>
          <span className={s.monogramR}>{wedding.groom[0]}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <p className={s.eyebrow}>{wedding.hero.eyebrow}</p>

      <Image
        src={wedding.hero.art}
        alt={wedding.hero.artAlt}
        fill
        priority
        sizes="(max-width: 760px) 94vw, 660px"
        className={s.art}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
