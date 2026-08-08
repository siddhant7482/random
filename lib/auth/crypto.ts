import "server-only";

import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/* ============================================================
   Password hashing and token generation.

   scrypt from node's own crypto rather than bcrypt/argon2: it is memory-hard,
   it is in the standard library (nothing to audit, nothing to keep patched,
   no native build), and it is the algorithm Node itself recommends when you
   don't want a dependency.
   ============================================================ */

/* N=2^16 with r=8 costs roughly 64 MB and ~100ms per hash. That is deliberately
   slow: it is what makes an offline attack on a stolen hash expensive. Raise N
   if your host can afford it — the parameters travel with each hash, so old
   passwords keep verifying after a change. */
const SCRYPT = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const KEYLEN = 64;

/** `scrypt$N$r$p$salt$hash`, all base64url. Self-describing so params can change. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, SCRYPT);
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");

    const key = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * 1024 * 1024,
    });

    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/* ---------------- comparisons ---------------- */

/** Constant-time string compare that doesn't leak length through timing. */
export function safeEqual(a: string, b: string): boolean {
  // hash both first: equal-length digests, so the compare itself is uniform
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/* ---------------- tokens ---------------- */

/** 256 bits from the CSPRNG. Used for session tokens and recovery codes. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Sessions are stored as a SHA-256 of the token, never the token itself, so a
 * leaked database can't be used to impersonate anyone. Plain SHA-256 is right
 * here — unlike a password, the input already has 256 bits of entropy, so
 * there is nothing to brute force and no need for a slow KDF.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ---------------- recovery codes ---------------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

/** Human-transcribable one-time codes, for when the phone is lost. */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]);
    return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
  });
}

export const normaliseCode = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();

/* ---------------- base32 (for TOTP secrets) ---------------- */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];

  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(out);
}
