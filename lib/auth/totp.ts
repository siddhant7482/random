import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { base32Decode, base32Encode } from "./crypto";

/* ============================================================
   Time-based one-time passwords, RFC 6238.

   Small enough to implement directly, and doing so keeps a security-critical
   path free of third-party code. Compatible with Google Authenticator, Authy,
   1Password, Bitwarden — anything that reads an otpauth:// URI.
   ============================================================ */

const DIGITS = 6;
const PERIOD = 30; // seconds
/** Accept the neighbouring steps so a phone clock a few seconds out still works. */
const WINDOW = 1;

export function generateSecret(): string {
  // 20 bytes = 160 bits, the size RFC 4226 specifies for HMAC-SHA1
  return base32Encode(randomBytes(20));
}

function codeAt(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(buf).digest();

  // dynamic truncation, RFC 4226 §5.4
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Verify a submitted code.
 *
 * Returns the counter it matched, or null. The caller must persist that
 * counter and refuse anything at or below it next time — without that, a code
 * shoulder-surfed or phished inside its 30-second window can be replayed.
 */
export function verifyTotp(
  secretBase32: string,
  token: string,
  lastUsedCounter: number | null,
  now = Date.now(),
): number | null {
  const clean = token.replace(/\D/g, "");
  if (clean.length !== DIGITS) return null;

  let secret: Buffer;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    return null;
  }

  const counter = Math.floor(now / 1000 / PERIOD);

  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const c = counter + drift;
    if (lastUsedCounter !== null && c <= lastUsedCounter) continue; // replay

    const expected = Buffer.from(codeAt(secret, c));
    const given = Buffer.from(clean);
    if (expected.length === given.length && timingSafeEqual(expected, given)) return c;
  }

  return null;
}

/** The otpauth:// URI an authenticator app scans. */
export function otpauthUri(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Grouped into fours, for typing in by hand when a camera won't cooperate. */
export const formatSecret = (secret: string) => secret.match(/.{1,4}/g)?.join(" ") ?? secret;
