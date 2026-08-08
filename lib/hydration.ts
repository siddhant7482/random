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
