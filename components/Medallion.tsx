"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { wedding } from "@/lib/config";
import { useIsHydrated, useMediaQuery } from "@/lib/hydration";
import s from "./Medallion.module.css";

/**
 * The illustrated centre of the card, as artwork rather than drawn shapes.
 *
 * It tilts and carries a specular highlight, so the gold reads as foil
 * catching the light — the way you would turn a printed card in your hand.
 *
 * Three modes, because most guests will open this on a phone:
 *
 *   mouse    the card follows the cursor on hover
 *   touch    it follows a finger, but only while one is down — there is no
 *            hover on a touchscreen, so tracking anything else is impossible
 *   idle     a slow highlight drifts across on its own
 *
 * The idle drift is the important one. Without it a phone shows a completely
 * static card unless someone happens to drag across it, and the foil is the
 * whole point.
 */

const MAX_TILT = 5.5;
/** How long after a touch or a mouse leaving before the drift resumes. */
const IDLE_AFTER = 1800;

export default function Medallion() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  /* Both read through useSyncExternalStore rather than setState in an effect:
     the server has no pointer type and no matchMedia, so this is the only way
     to get a defined first render that agrees with the markup. */
  const hydrated = useIsHydrated();
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const enabled = hydrated && !reduce;

  // pointer position over the card, 0..1 on each axis
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  // springs, so the card settles rather than snapping
  const sx = useSpring(px, { stiffness: 140, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 140, damping: 18, mass: 0.4 });

  const rotateY = useTransform(sx, [0, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [0, 1], [MAX_TILT, -MAX_TILT]);

  const hx = useTransform(sx, (v) => `${(v * 100).toFixed(1)}%`);
  const hy = useTransform(sy, (v) => `${(v * 100).toFixed(1)}%`);
  const sheen = useMotionTemplate`radial-gradient(circle at ${hx} ${hy}, rgba(255,247,226,0.62), rgba(255,240,206,0.18) 26%, transparent 54%)`;

  /* The idle drift. Kept in a ref so starting it twice cannot leave an
     orphaned animation running forever behind the new one. */
  const drift = useRef<{ stop: () => void }[]>([]);
  const idleTimer = useRef<number>(0);

  const stopDrift = useCallback(() => {
    drift.current.forEach((a) => a.stop());
    drift.current = [];
  }, []);

  const startDrift = useCallback(() => {
    stopDrift();
    const common = { repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const };
    drift.current = [
      // unequal periods, so the highlight wanders rather than tracing one line
      animate(px, [0.22, 0.78], { duration: 6.5, ...common }),
      animate(py, [0.34, 0.62], { duration: 9.1, ...common }),
    ];
  }, [px, py, stopDrift]);

  useEffect(() => {
    if (!enabled) return;
    startDrift();
    return () => {
      stopDrift();
      window.clearTimeout(idleTimer.current);
    };
  }, [enabled, startDrift, stopDrift]);

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    stopDrift();
    window.clearTimeout(idleTimer.current);
    px.set(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1));
    py.set(Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1));
  };

  const resumeSoon = () => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(startDrift, IDLE_AFTER);
  };

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!enabled) return;
    // a mouse tracks on hover; a finger only while it is actually down
    if (e.pointerType === "mouse" ? fine : e.buttons > 0 || e.pressure > 0) track(e);
  }

  return (
    <div
      ref={ref}
      className={s.stage}
      onPointerMove={onMove}
      onPointerDown={(e) => enabled && track(e)}
      onPointerUp={resumeSoon}
      onPointerLeave={resumeSoon}
      onPointerCancel={resumeSoon}
    >
      <motion.div
        className={`${s.wrap} ${failed ? s.fallback : ""}`}
        style={enabled ? { rotateX, rotateY } : undefined}
      >
        <p className={s.eyebrow}>{wedding.hero.eyebrow}</p>

        {failed ? (
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
        )}

        {enabled && !failed && (
          <motion.span className={s.sheen} style={{ backgroundImage: sheen }} aria-hidden="true" />
        )}
      </motion.div>
    </div>
  );
}
