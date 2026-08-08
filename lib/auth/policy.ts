import "server-only";

import { headers } from "next/headers";
import { clearFailures, recentFailures, recordAttempt } from "./store";

/* ============================================================
   Login policy: rate limiting, lockout, and origin checking.
   ============================================================ */

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_AFTER = 5;
/** Lockout grows with each failure past the threshold, up to 30 minutes. */
const BASE_LOCK_MS = 60 * 1000;
const MAX_LOCK_MS = 30 * 60 * 1000;

export type Lock = { locked: boolean; retryAfterSeconds: number; failures: number };

/**
 * Rate limit on two independent keys: the account being targeted, and the
 * source address. The account key stops one inbox being hammered; the address
 * key stops one attacker spraying many accounts. Whichever locks first wins.
 */
export async function checkLock(email: string, ip: string | null): Promise<Lock> {
  const since = new Date(Date.now() - WINDOW_MS);

  const keys = [`user:${email.toLowerCase()}`, ...(ip ? [`ip:${ip}`] : [])];
  const results = await Promise.all(keys.map((k) => recentFailures(k, since)));

  let worst: Lock = { locked: false, retryAfterSeconds: 0, failures: 0 };

  for (const { count, lastAt } of results) {
    if (count < LOCK_AFTER || !lastAt) {
      worst = { ...worst, failures: Math.max(worst.failures, count) };
      continue;
    }

    // 1 min, 2, 4, 8… from the most recent failure
    const backoff = Math.min(BASE_LOCK_MS * 2 ** (count - LOCK_AFTER), MAX_LOCK_MS);
    const readyAt = lastAt.getTime() + backoff;
    const remaining = Math.ceil((readyAt - Date.now()) / 1000);

    if (remaining > 0 && remaining > worst.retryAfterSeconds) {
      worst = { locked: true, retryAfterSeconds: remaining, failures: count };
    }
  }

  return worst;
}

export async function noteFailure(email: string, ip: string | null): Promise<void> {
  await Promise.all([
    recordAttempt(`user:${email.toLowerCase()}`, false),
    ...(ip ? [recordAttempt(`ip:${ip}`, false)] : []),
  ]);
}

export async function noteSuccess(email: string, ip: string | null): Promise<void> {
  await Promise.all([
    clearFailures(`user:${email.toLowerCase()}`),
    ...(ip ? [clearFailures(`ip:${ip}`)] : []),
  ]);
}

/**
 * Reject state-changing requests that didn't originate from this site.
 *
 * The session cookie is already SameSite=Strict, which is the primary CSRF
 * defence; this is the belt to that pair of braces, and it also covers older
 * browsers. Requests with no Origin at all (some same-origin form posts) fall
 * back to comparing Referer, and are refused if neither is present.
 */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return false;

  const candidate = h.get("origin") ?? h.get("referer");
  if (!candidate) return false;

  try {
    return new URL(candidate).host === host;
  } catch {
    return false;
  }
}
