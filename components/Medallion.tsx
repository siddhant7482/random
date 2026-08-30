"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { wedding } from "@/lib/config";
import s from "./Medallion.module.css";

/**
 * The illustrated centre of the card, as artwork rather than drawn shapes.
 *
 * It tilts toward the pointer and carries a specular highlight that follows
 * it, so the gold reads as foil catching the light — the way you would turn a
 * printed card in your hand. The tilt is deliberately small; past about six
 * degrees it stops looking like paper and starts looking like a video game.
 *
 * Only enabled for a real mouse. On a touchscreen there is no hover to track,
 * and under prefers-reduced-motion it is off entirely — in both cases the card
 * renders as a plain, still image.
 */

const MAX_TILT = 5.5;

export default function Medallion() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [interactive, setInteractive] = useState(false);

  /* Decided after mount: the server cannot know the pointer type, so rendering
     the interactive version first would risk a hydration mismatch. */
  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setInteractive(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reduce]);

  // pointer position over the card, 0..1 on each axis
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  // springs, so the card settles rather than snapping to the cursor
  const sx = useSpring(px, { stiffness: 140, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 140, damping: 18, mass: 0.4 });

  const rotateY = useTransform(sx, [0, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [0, 1], [MAX_TILT, -MAX_TILT]);

  /* The highlight sits where the pointer is; a card tilted toward you catches
     the light at the point nearest the viewer. */
  const hx = useTransform(sx, (v) => `${v * 100}%`);
  const hy = useTransform(sy, (v) => `${v * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(circle at ${hx} ${hy}, rgba(255,247,226,0.62), rgba(255,240,206,0.18) 26%, transparent 54%)`;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }

  function onLeave() {
    // back to flat, and the highlight back to centre
    px.set(0.5);
    py.set(0.5);
  }

  const body = failed ? (
    <div className={s.fallbackInner}>
      <span className={s.ring} aria-hidden="true" />
      <p className={s.monogram} aria-label={`${wedding.bride[0]} and ${wedding.groom[0]}`}>
        <span>{wedding.bride[0]}</span>
        <span className={s.monogramR}>{wedding.groom[0]}</span>
      </p>
    </div>
  ) : (
    <Image
      src={wedding.hero.art}
      alt={wedding.hero.artAlt}
      fill
      priority
      sizes="(max-width: 760px) 94vw, 660px"
      className={s.art}
      onError={() => setFailed(true)}
    />
  );

  return (
    <div
      ref={ref}
      className={s.stage}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      // the tilt is decorative; nothing here is a control
      aria-hidden={false}
    >
      <motion.div
        className={`${s.wrap} ${failed ? s.fallback : ""}`}
        style={interactive ? { rotateX, rotateY } : undefined}
      >
        <p className={s.eyebrow}>{wedding.hero.eyebrow}</p>
        {body}

        {interactive && !failed && (
          <motion.span className={s.sheen} style={{ backgroundImage: sheen }} aria-hidden="true" />
        )}
      </motion.div>
    </div>
  );
}
