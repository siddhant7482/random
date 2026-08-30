"use client";

import { useSyncExternalStore } from "react";

/** Nothing to subscribe to — the value flips once, when React hydrates. */
const noopSubscribe = () => () => {};

/**
 * `false` during SSR and the hydration render, `true` from the first client
 * render onwards.
 *
 * This is how we gate anything that depends on the browser (sessionStorage,
 * window size, the clock) without a setState-in-effect cascade and without
 * React flagging a server/client markup mismatch.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Subscribes to a media query the same way — no setState in an effect, and a
 * defined server value so the first client render matches the markup.
 *
 * Returns `false` during SSR whatever the query, which is the safe default
 * here: it means "assume no fine pointer" and render the plain, still card.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
