"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { useIsHydrated } from "./hydration";

/**
 * How long the hero should wait before it starts animating.
 *
 * The curtain covers the first ~2s of a cold visit, so the hero holds until
 * it lifts. On a repeat visit within the same tab there's no curtain, so the
 * hero comes in almost immediately rather than leaving the guest looking at
 * a blank page for two seconds.
 *
 * Returns null until hydration — read that as "not ready to animate yet".
 */
export function useIntroDelay(): number | null {
  const reduce = useReducedMotion();
  const hydrated = useIsHydrated();

  /* Computed once, in a lazy initialiser, so it survives the curtain writing
     its sessionStorage flag partway through the hero's own animation. A plain
     read on every render would swap the delay out from under an in-flight
     transition. */
  const [delay] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    if (reduce) return 0;
    return sessionStorage.getItem("lo-curtain") === "seen" ? 0.2 : 2.1;
  });

  return hydrated ? delay : null;
}
