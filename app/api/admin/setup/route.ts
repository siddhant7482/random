import { NextResponse } from "next/server";
import { toString } from "qrcode";
import { generateRecoveryCodes, hashPassword, hashToken } from "@/lib/auth/crypto";
import { formatSecret, generateSecret, otpauthUri, verifyTotp } from "@/lib/auth/totp";
import { countAdmins, createUser, findUserByEmail, audit, updateUser } from "@/lib/auth/store";
import { sameOrigin } from "@/lib/auth/policy";
import { clientMeta, startSession } from "@/lib/auth/session";
import { wedding } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   First-run account creation.

   Only ever available while there are zero admins. Once the first account
   exists this route refuses everything, so it cannot be used to add an
   unauthorised second account later.
   ============================================================ */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Deliberately about entropy, not about punctuation. Length does the work. */
function passwordProblem(pw: string): string | null {
  if (pw.length < 12) return "Use at least 12 characters.";
  if (pw.length > 200) return "That's too long.";
  if (/^(.)\1+$/.test(pw)) return "That's a single repeated character.";
  const weak = ["password", "wedding", "12345678", "qwerty", "letmein", "admin"];
  if (weak.some((w) => pw.toLowerCase().includes(w))) return "That contains a very common word.";
  return null;
}

export async function POST(request: Request) {
  if (!(await sameOrigin())) {
    return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  }

  if ((await countAdmins()) > 0) {
    return NextResponse.json(
      { ok: false, error: "An administrator already exists." },
      { status: 409 },
    );
  }

  const form = await request.formData();
  const step = String(form.get("step") ?? "begin");

  /* --- step 1: hand out a secret to enrol, without creating anything yet --- */
  if (step === "begin") {
    const secret = generateSecret();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const uri = otpauthUri(secret, email || "admin", `${wedding.bride} & ${wedding.groom}`);

    /* Rendered here rather than in the browser so the secret is never handed
       to a third-party script or image host. */
    const qr = await toString(uri, {
      type: "svg",
      margin: 1,
      width: 220,
      color: { dark: "#17263c", light: "#ffffff" },
    });

    return NextResponse.json({ ok: true, secret, formatted: formatSecret(secret), uri, qr });
  }

  /* --- step 2: create the account, but only once 2FA is proven to work --- */
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const secret = String(form.get("secret") ?? "");
  const code = String(form.get("code") ?? "");

  const errors: Record<string, string> = {};
  if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";

  const pwProblem = passwordProblem(password);
  if (pwProblem) errors.password = pwProblem;
  else if (password !== confirm) errors.confirm = "The two passwords don't match.";

  if (!secret) errors.code = "Start again — the setup secret was lost.";
  else if (verifyTotp(secret, code, null) === null) {
    errors.code = "That code isn't right. Check your authenticator app and try again.";
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  if (await findUserByEmail(email)) {
    return NextResponse.json({ ok: false, errors: { email: "Already registered." } }, { status: 409 });
  }

  const recoveryCodes = generateRecoveryCodes();

  const user = await createUser({
    email,
    passwordHash: await hashPassword(password),
    totpSecret: secret,
    // stored hashed: the plaintext below is the only time they are ever shown
    recoveryCodes: recoveryCodes.map((c) => hashToken(c.replace(/-/g, ""))),
  });

  const counter = verifyTotp(secret, code, null);
  await updateUser(user.id, { totpEnabled: true, totpLastCounter: counter });

  const { ip } = await clientMeta();
  await audit({ userId: user.id, email, action: "admin.created", detail: "first run", ip });

  await startSession(user.id);

  return NextResponse.json({ ok: true, recoveryCodes });
}
