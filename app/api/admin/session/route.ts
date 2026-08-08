import { NextResponse } from "next/server";
import { hashToken, safeEqual, verifyPassword } from "@/lib/auth/crypto";
import { verifyTotp } from "@/lib/auth/totp";
import { audit, findUserByEmail, updateUser } from "@/lib/auth/store";
import { checkLock, noteFailure, noteSuccess, sameOrigin } from "@/lib/auth/policy";
import { clientMeta, endSession, getAuth, startSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Sign in — two steps, both rate limited.

     stage=password  ->  email + password, answers "now send a code"
     stage=totp      ->  the same credentials plus a 6-digit code, or a
                         recovery code, and only then is a session issued

   The password stage never issues anything. That matters: it means a stolen
   password alone is worth nothing, and it means the second stage can't be
   called on its own to skip the first.
   ============================================================ */

/** Deliberately identical whichever of the two is wrong. */
const GENERIC = "That email, password or code isn't right.";

export async function POST(request: Request) {
  if (!(await sameOrigin())) {
    return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  }

  const form = await request.formData();
  const stage = String(form.get("stage") ?? "password");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const { ip } = await clientMeta();

  const lock = await checkLock(email, ip);
  if (lock.locked) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).`,
        retryAfter: lock.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSeconds) } },
    );
  }

  const user = await findUserByEmail(email);

  /* Hash even when the account is unknown, so response time doesn't reveal
     which emails are registered. */
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA");

  if (!user || !passwordOk) {
    await noteFailure(email, ip);
    await audit({ userId: null, email, action: "login.failed", detail: "password", ip });
    return NextResponse.json({ ok: false, error: GENERIC }, { status: 401 });
  }

  /* --- stage 1 --- */
  if (stage === "password") {
    // no session, no cookie: just permission to be asked for a code
    return NextResponse.json({ ok: true, next: "totp" });
  }

  /* --- stage 2 --- */
  const code = String(form.get("code") ?? "").trim();
  let counter: number | null = null;
  let usedRecovery = false;

  if (user.totpEnabled && user.totpSecret) {
    counter = verifyTotp(user.totpSecret, code, user.totpLastCounter);

    if (counter === null) {
      // maybe it's a recovery code
      const candidate = hashToken(code.replace(/[\s-]/g, "").toUpperCase());
      const match = user.recoveryCodes.find((stored) => safeEqual(stored, candidate));

      if (!match) {
        await noteFailure(email, ip);
        await audit({ userId: user.id, email, action: "login.failed", detail: "2fa", ip });
        return NextResponse.json({ ok: false, error: GENERIC }, { status: 401 });
      }

      // one use only — burn it
      usedRecovery = true;
      await updateUser(user.id, {
        recoveryCodes: user.recoveryCodes.filter((c) => c !== match),
      });
    }
  }

  await noteSuccess(email, ip);
  if (counter !== null) await updateUser(user.id, { totpLastCounter: counter });
  await updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  await startSession(user.id);

  await audit({
    userId: user.id,
    email,
    action: "login.success",
    detail: usedRecovery ? "recovery code used" : "password + 2fa",
    ip,
  });

  return NextResponse.json({
    ok: true,
    usedRecovery,
    recoveryRemaining: usedRecovery ? user.recoveryCodes.length - 1 : user.recoveryCodes.length,
  });
}

/** Sign out. */
export async function DELETE() {
  if (!(await sameOrigin())) {
    return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  }

  const auth = await getAuth();
  if (auth) {
    const { ip } = await clientMeta();
    await audit({
      userId: auth.user.id,
      email: auth.user.email,
      action: "logout",
      detail: null,
      ip,
    });
  }

  await endSession();
  return NextResponse.json({ ok: true });
}
