import "server-only";

import { cookies, headers } from "next/headers";
import { hashToken, randomToken } from "./crypto";
import {
  createSession,
  deleteSession,
  findSession,
  findUserById,
  purgeExpiredSessions,
  rotateSessionId,
  touchSession,
  type AdminSession,
  type AdminUser,
} from "./store";

/* ============================================================
   Server-side sessions.

   The cookie carries a random 256-bit token; the database stores only its
   SHA-256. A leaked database therefore cannot be replayed as a login.

   Two clocks run at once:
     - idle timeout: 45 minutes of no activity and the session dies
     - absolute timeout: 12 hours from sign-in, no matter how active
   Rotation happens roughly every 15 minutes so a stolen cookie has a short
   useful life, and so session fixation is impossible.
   ============================================================ */

const COOKIE = "lo_session";
const IDLE_MS = 45 * 60 * 1000;
const ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const ROTATE_AFTER_MS = 15 * 60 * 1000;

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true, // unreadable from JavaScript, so XSS can't lift it
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const, // never sent on a cross-site request: CSRF defence
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function clientMeta() {
  const h = await headers();
  // x-forwarded-for is set by the platform's proxy; take the first hop
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
  return { ip, userAgent };
}

export async function startSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const { ip, userAgent } = await clientMeta();
  const now = new Date();

  const session: AdminSession = {
    id: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ABSOLUTE_MS).toISOString(),
    ip,
    userAgent,
  };

  await createSession(session);
  (await cookies()).set(COOKIE, token, cookieOptions(Math.floor(ABSOLUTE_MS / 1000)));
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await deleteSession(hashToken(token));
  store.delete(COOKIE);
}

export type Authed = { user: AdminUser; session: AdminSession };

/**
 * Resolve the current session, enforcing both timeouts and rotating the token
 * when it's old enough.
 *
 * Returns null for anything not perfectly valid — expired, unknown, or
 * belonging to a user who no longer exists.
 */
export async function getAuth(): Promise<Authed | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const id = hashToken(token);
  const session = await findSession(id);
  if (!session) return null;

  const now = Date.now();
  const idleDeadline = Date.parse(session.lastSeenAt) + IDLE_MS;
  const absoluteDeadline = Date.parse(session.expiresAt);

  if (now > idleDeadline || now > absoluteDeadline) {
    await deleteSession(id);
    store.delete(COOKIE);
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    await deleteSession(id);
    store.delete(COOKIE);
    return null;
  }

  /* Keep the idle clock alive. Throttled to a minute so a burst of requests
     doesn't mean a write each. This is a database write only — it is safe in
     a Server Component, where setting a cookie is not. */
  const age = now - Date.parse(session.lastSeenAt);
  if (age > 60_000) {
    await touchSession(id, new Date(now).toISOString());
    session.lastSeenAt = new Date(now).toISOString();
  }

  // best-effort housekeeping; never let it break a request
  void purgeExpiredSessions().catch(() => {});

  return { user, session };
}

/**
 * Swap the session token for a fresh one.
 *
 * Only safe from a Route Handler or Server Action, because it writes a cookie.
 * The cookie is written *before* the database row is changed: if this is a
 * read-only context, `set` throws and we leave without having touched the
 * database — the alternative order would rotate the row, fail to update the
 * cookie, and silently sign the user out.
 */
export async function rotateIfDue(session: AdminSession): Promise<void> {
  const now = Date.now();
  if (now - Date.parse(session.createdAt) < ROTATE_AFTER_MS) return;

  const store = await cookies();
  const next = randomToken(32);
  const remaining = Math.floor((Date.parse(session.expiresAt) - now) / 1000);
  if (remaining <= 0) return;

  try {
    store.set(COOKIE, next, cookieOptions(remaining));
  } catch {
    return; // read-only context; try again on the next write request
  }

  await rotateSessionId(session.id, hashToken(next));
}
