"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   Reading how the phone is being held.

   The card's tilt is driven by the cursor on a desktop, which leaves a phone
   with nothing to drive it — and a phone is where most guests will open this.
   Device orientation is the natural equivalent: tip the handset and the card
   tips with it, the way a printed card catches the light as you turn it.
   ============================================================ */

/** Degrees of handset tilt that map to the card's full travel. */
const RANGE = 20;

/** Safari exposes a permission gate that the standard lib types don't know about. */
type PermissionGate = { requestPermission?: () => Promise<PermissionState | "granted" | "denied"> };

export function orientationNeedsPermission(): boolean {
  if (typeof window === "undefined" || !window.DeviceOrientationEvent) return false;
  return typeof (window.DeviceOrientationEvent as unknown as PermissionGate).requestPermission === "function";
}

/** iOS only ever grants this from inside a user gesture — call it from a tap. */
export async function requestOrientationAccess(): Promise<boolean> {
  const gate = window.DeviceOrientationEvent as unknown as PermissionGate;
  if (typeof gate?.requestPermission !== "function") return true;
  try {
    return (await gate.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export type Tilt = {
  /** 0..1 across, 0..1 down — the same shape the pointer produces. */
  x: number;
  y: number;
};

/**
 * Subscribes to device orientation and reports a normalised tilt.
 *
 * `live` stays false until a real reading arrives, so a desktop, a denied
 * permission prompt, or a handset with no sensors all leave the caller free
 * to fall back to something else rather than sitting on a dead value.
 */
export function useDeviceTilt(active: boolean, onTilt: (t: Tilt) => void) {
  const [live, setLive] = useState(false);

  /* The neutral position is wherever the phone happens to be at the first
     reading, not flat on a table: people hold a handset at maybe 40 degrees,
     and anchoring to zero would peg the card at full tilt permanently. */
  const base = useRef<{ beta: number; gamma: number } | null>(null);
  /* Held in a ref and refreshed in its own effect, not assigned during
     render: the listener below must not re-subscribe on every render just
     because the caller passed a fresh closure. */
  const cb = useRef(onTilt);
  useEffect(() => {
    cb.current = onTilt;
  });

  useEffect(() => {
    if (!active || typeof window === "undefined" || !window.DeviceOrientationEvent) return;

    const clamp = (v: number) => Math.min(Math.max(v, -1), 1);

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;

      if (!base.current) {
        base.current = { beta: e.beta, gamma: e.gamma };
        setLive(true);
      }

      cb.current({
        x: 0.5 + clamp((e.gamma - base.current.gamma) / RANGE) * 0.5,
        y: 0.5 + clamp((e.beta - base.current.beta) / RANGE) * 0.5,
      });
    };

    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [active]);

  /** Re-anchor to however the phone is being held right now. */
  const recentre = () => {
    base.current = null;
  };

  return { live, recentre };
}
