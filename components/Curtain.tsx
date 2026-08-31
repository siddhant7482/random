"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { wedding } from "@/lib/config";
import { useIsHydrated } from "@/lib/hydration";
import s from "./Curtain.module.css";

const HOLD_MS = 1900;

/**
 * The ivory panel that lifts on first paint, monogram first.
 *
 * Deliberately short and shown once per tab via sessionStorage — a guest
 * checking the schedule for the third time shouldn't sit through it again.
 * Skipped entirely under prefers-reduced-motion.
 */
export default function Curtain() {
  const reduce = useReducedMotion();
  const hydrated = useIsHydrated();
  const [lifted, setLifted] = useState(false);

  /* Decided once, in a lazy initialiser that only runs on the very first
     render. It has to be latched like this: the timeout below writes the same
     sessionStorage flag it reads, so a live read would make the curtain
     unmount itself halfway through its own animation. */
  const [shouldPlay] = useState(() => {
    if (typeof window === "undefined") return false;
    return !reduce && sessionStorage.getItem("lo-curtain") !== "seen";
  });

  useEffect(() => {
    if (!shouldPlay || lifted) return;

    document.body.classList.add("is-locked");

    const t = setTimeout(() => {
      sessionStorage.setItem("lo-curtain", "seen");
      document.body.classList.remove("is-locked");
      setLifted(true);
    }, HOLD_MS);

    return () => {
      clearTimeout(t);
      document.body.classList.remove("is-locked");
    };
  }, [shouldPlay, lifted]);

  // Nothing renders until hydration, so the server markup and the first client
  // render agree — and a repeat visitor never sees a flash of a curtain that
  // sessionStorage would have skipped anyway.
  if (!hydrated || !shouldPlay) return null;

  return (
    <AnimatePresence>
      {!lifted && (
        <motion.div
          className={s.curtain}
          aria-hidden="true"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className={s.inner}>
            {/* The same interlocking monogram as the header and the card,
                rather than the hand-drawn flourish that used to be here —
                the mark is settled now, so the loader should use it. */}
            <motion.p
              className={s.monogram}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <span>{wedding.bride[0]}</span>
              <span className={s.monogramR}>{wedding.groom[0]}</span>
            </motion.p>

            {/* a hairline that draws itself out from the centre */}
            <motion.span
              className={s.rule}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            />

            <motion.span
              className={s.label}
              initial={{ opacity: 0, letterSpacing: "0.9em" }}
              animate={{ opacity: 1, letterSpacing: "0.44em" }}
              transition={{ duration: 1.2, delay: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {wedding.dateShort}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
