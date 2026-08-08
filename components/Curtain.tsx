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
            <motion.svg viewBox="0 0 200 110" className={s.mono} initial="hidden" animate="shown">
              {/* Defined inside this same SVG rather than in a shared defs
                  block elsewhere in the document — an internal reference is
                  resolved with the element, so there's nothing to race. */}
              <defs>
                <linearGradient id="curtainInk" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#17263c" />
                  <stop offset="55%" stopColor="#2e4260" />
                  <stop offset="100%" stopColor="#b99458" />
                </linearGradient>
              </defs>
              <motion.path
                d="M18,70 C40,38 66,34 80,56 C92,74 74,94 60,84 C46,74 58,48 84,42 C110,36 126,52 132,64"
                fill="none"
                stroke="url(#curtainInk)"
                strokeWidth="1.2"
                strokeLinecap="round"
                pathLength={1}
                variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
              />
              <motion.path
                d="M132,64 C140,48 158,40 172,48 C186,56 184,78 168,82 C154,86 142,76 140,64"
                fill="none"
                stroke="url(#curtainInk)"
                strokeWidth="1.2"
                strokeLinecap="round"
                pathLength={1}
                variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
                transition={{ duration: 0.85, delay: 0.5, ease: "easeInOut" }}
              />
            </motion.svg>

            <motion.span
              className={s.label}
              initial={{ opacity: 0, letterSpacing: "0.9em" }}
              animate={{ opacity: 1, letterSpacing: "0.42em" }}
              transition={{ duration: 1.2, delay: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {wedding.bride[0]} &amp; {wedding.groom[0]}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
