import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

/* ============================================================
   Storage for accounts, sessions, login attempts and the audit trail.

   Same dual backend as the RSVP store: Postgres when DATABASE_URL is set,
   otherwise a JSON file so local development needs no setup.

   The file backend serialises every operation through a lock (see below) and
   writes atomically, so it is correct within one process — but it is still
   one process and one disk, which serverless is not. The dashboard warns
   loudly whenever it's the one in use.
   ============================================================ */

export type AdminUser = {
  id: string;
  email: string;
  passwordHash: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  /** highest TOTP step already spent, so a code cannot be replayed */
  totpLastCounter: number | null;
  /** hashed, never the codes themselves */
  recoveryCodes: string[];
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminSession = {
  id: string; // SHA-256 of the cookie token
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  /** absolute cutoff — a session dies at this point however active it is */
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
};

export type LoginAttempt = { id: string; key: string; at: string; ok: boolean };

export type AuditEntry = {
  id: string;
  at: string;
  userId: string | null;
  email: string | null;
  action: string;
  detail: string | null;
  ip: string | null;
};

type FileShape = {
  users: AdminUser[];
  sessions: AdminSession[];
  attempts: LoginAttempt[];
  audit: AuditEntry[];
};

const DATA_DIR = join(process.cwd(), ".data");
const AUTH_FILE = join(DATA_DIR, "auth.json");

export const usingPostgres = () => Boolean(process.env.DATABASE_URL);

/* ---------------- Postgres ---------------- */

const g = globalThis as unknown as { __authSql?: postgres.Sql; __authSchema?: Promise<void> };

function sql() {
  if (!g.__authSql) {
    g.__authSql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return g.__authSql;
}

function ensureSchema() {
  if (!g.__authSchema) {
    g.__authSchema = (async () => {
      const db = sql();
      await db`
        CREATE TABLE IF NOT EXISTS admin_users (
          id                TEXT PRIMARY KEY,
          email             TEXT NOT NULL UNIQUE,
          password_hash     TEXT NOT NULL,
          totp_secret       TEXT,
          totp_enabled      BOOLEAN NOT NULL DEFAULT false,
          totp_last_counter BIGINT,
          recovery_codes    TEXT[] NOT NULL DEFAULT '{}',
          created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_login_at     TIMESTAMPTZ
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          id           TEXT PRIMARY KEY,
          user_id      TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at   TIMESTAMPTZ NOT NULL,
          ip           TEXT,
          user_agent   TEXT
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS admin_login_attempts (
          id  TEXT PRIMARY KEY,
          key TEXT NOT NULL,
          at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          ok  BOOLEAN NOT NULL
        )`;
      await db`CREATE INDEX IF NOT EXISTS attempts_key_at_idx ON admin_login_attempts (key, at DESC)`;
      await db`
        CREATE TABLE IF NOT EXISTS admin_audit (
          id      TEXT PRIMARY KEY,
          at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          user_id TEXT,
          email   TEXT,
          action  TEXT NOT NULL,
          detail  TEXT,
          ip      TEXT
        )`;
      await db`CREATE INDEX IF NOT EXISTS audit_at_idx ON admin_audit (at DESC)`;
    })();
  }
  return g.__authSchema;
}

/* ---------------- file ---------------- */

/**
 * Every file operation queues behind the last one.
 *
 * Without this, two concurrent read-modify-writes each read the same snapshot
 * and the second write silently discards the first. That is not theoretical:
 * a single failed login fires two `recordAttempt` calls through Promise.all,
 * and the losing write took the whole user record with it.
 */
let queue: Promise<unknown> = Promise.resolve();

function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readAllUnlocked(): Promise<FileShape> {
  try {
    const parsed = JSON.parse(await readFile(AUTH_FILE, "utf8")) as Partial<FileShape>;
    return {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      attempts: parsed.attempts ?? [],
      audit: parsed.audit ?? [],
    };
  } catch {
    return { users: [], sessions: [], attempts: [], audit: [] };
  }
}

async function writeAllUnlocked(data: FileShape) {
  await mkdir(DATA_DIR, { recursive: true });
  // write-then-rename, so a crash mid-write can't leave a truncated file
  const tmp = `${AUTH_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, AUTH_FILE);
}

const readAll = () => withFileLock(readAllUnlocked);

/** Read, change, write — all inside one turn of the lock. */
function mutate<T>(fn: (data: FileShape) => T | Promise<T>): Promise<T> {
  return withFileLock(async () => {
    const data = await readAllUnlocked();
    const result = await fn(data);
    await writeAllUnlocked(data);
    return result;
  });
}

/* ---------------- users ---------------- */

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  totp_secret: string | null;
  totp_enabled: boolean;
  totp_last_counter: string | number | null;
  recovery_codes: string[];
  created_at: Date;
  last_login_at: Date | null;
};

const toUser = (r: UserRow): AdminUser => ({
  id: r.id,
  email: r.email,
  passwordHash: r.password_hash,
  totpSecret: r.totp_secret,
  totpEnabled: r.totp_enabled,
  totpLastCounter: r.totp_last_counter === null ? null : Number(r.totp_last_counter),
  recoveryCodes: r.recovery_codes ?? [],
  createdAt: r.created_at.toISOString(),
  lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
});

export async function countAdmins(): Promise<number> {
  if (usingPostgres()) {
    await ensureSchema();
    const [row] = await sql()<{ n: string }[]>`SELECT count(*)::text AS n FROM admin_users`;
    return Number(row.n);
  }
  return (await readAll()).users.length;
}

export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const key = email.trim().toLowerCase();

  if (usingPostgres()) {
    await ensureSchema();
    const rows = await sql()<UserRow[]>`SELECT * FROM admin_users WHERE email = ${key}`;
    return rows[0] ? toUser(rows[0]) : null;
  }

  return (await readAll()).users.find((u) => u.email === key) ?? null;
}

export async function findUserById(id: string): Promise<AdminUser | null> {
  if (usingPostgres()) {
    await ensureSchema();
    const rows = await sql()<UserRow[]>`SELECT * FROM admin_users WHERE id = ${id}`;
    return rows[0] ? toUser(rows[0]) : null;
  }
  return (await readAll()).users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  totpSecret: string;
  recoveryCodes: string[];
}): Promise<AdminUser> {
  const user: AdminUser = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    totpSecret: input.totpSecret,
    totpEnabled: false,
    totpLastCounter: null,
    recoveryCodes: input.recoveryCodes,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  if (usingPostgres()) {
    await ensureSchema();
    await sql()`
      INSERT INTO admin_users (id, email, password_hash, totp_secret, totp_enabled, recovery_codes)
      VALUES (${user.id}, ${user.email}, ${user.passwordHash}, ${user.totpSecret}, false,
              ${sql().array(user.recoveryCodes)})`;
    return user;
  }

  await mutate((data) => {
    data.users.push(user);
  });
  return user;
}

export async function updateUser(id: string, patch: Partial<AdminUser>): Promise<void> {
  if (usingPostgres()) {
    await ensureSchema();
    const db = sql();
    if (patch.totpEnabled !== undefined) {
      await db`UPDATE admin_users SET totp_enabled = ${patch.totpEnabled} WHERE id = ${id}`;
    }
    if (patch.totpLastCounter !== undefined) {
      await db`UPDATE admin_users SET totp_last_counter = ${patch.totpLastCounter} WHERE id = ${id}`;
    }
    if (patch.lastLoginAt !== undefined) {
      await db`UPDATE admin_users SET last_login_at = ${patch.lastLoginAt} WHERE id = ${id}`;
    }
    if (patch.recoveryCodes !== undefined) {
      await db`UPDATE admin_users SET recovery_codes = ${db.array(patch.recoveryCodes)} WHERE id = ${id}`;
    }
    if (patch.passwordHash !== undefined) {
      await db`UPDATE admin_users SET password_hash = ${patch.passwordHash} WHERE id = ${id}`;
    }
    return;
  }

  await mutate((data) => {
    const i = data.users.findIndex((u) => u.id === id);
    if (i >= 0) data.users[i] = { ...data.users[i], ...patch };
  });
}

/* ---------------- sessions ---------------- */

type SessionRow = {
  id: string;
  user_id: string;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  ip: string | null;
  user_agent: string | null;
};

const toSession = (r: SessionRow): AdminSession => ({
  id: r.id,
  userId: r.user_id,
  createdAt: r.created_at.toISOString(),
  lastSeenAt: r.last_seen_at.toISOString(),
  expiresAt: r.expires_at.toISOString(),
  ip: r.ip,
  userAgent: r.user_agent,
});

export async function createSession(s: AdminSession): Promise<void> {
  if (usingPostgres()) {
    await ensureSchema();
    await sql()`
      INSERT INTO admin_sessions (id, user_id, created_at, last_seen_at, expires_at, ip, user_agent)
      VALUES (${s.id}, ${s.userId}, ${s.createdAt}, ${s.lastSeenAt}, ${s.expiresAt}, ${s.ip}, ${s.userAgent})`;
    return;
  }
  await mutate((data) => {
    data.sessions.push(s);
  });
}

export async function findSession(id: string): Promise<AdminSession | null> {
  if (usingPostgres()) {
    await ensureSchema();
    const rows = await sql()<SessionRow[]>`SELECT * FROM admin_sessions WHERE id = ${id}`;
    return rows[0] ? toSession(rows[0]) : null;
  }
  return (await readAll()).sessions.find((s) => s.id === id) ?? null;
}

export async function touchSession(id: string, lastSeenAt: string): Promise<void> {
  if (usingPostgres()) {
    await sql()`UPDATE admin_sessions SET last_seen_at = ${lastSeenAt} WHERE id = ${id}`;
    return;
  }
  await mutate((data) => {
    const s = data.sessions.find((x) => x.id === id);
    if (s) s.lastSeenAt = lastSeenAt;
  });
}

/** Replaces a session id in place, keeping its history — used to rotate tokens. */
export async function rotateSessionId(oldId: string, newId: string): Promise<void> {
  if (usingPostgres()) {
    await sql()`UPDATE admin_sessions SET id = ${newId}, last_seen_at = now() WHERE id = ${oldId}`;
    return;
  }
  await mutate((data) => {
    const s = data.sessions.find((x) => x.id === oldId);
    if (s) {
      s.id = newId;
      s.lastSeenAt = new Date().toISOString();
    }
  });
}

export async function deleteSession(id: string): Promise<void> {
  if (usingPostgres()) {
    await sql()`DELETE FROM admin_sessions WHERE id = ${id}`;
    return;
  }
  await mutate((data) => {
    data.sessions = data.sessions.filter((s) => s.id !== id);
  });
}

export async function deleteSessionsForUser(userId: string, except?: string): Promise<number> {
  if (usingPostgres()) {
    const rows = except
      ? await sql()`DELETE FROM admin_sessions WHERE user_id = ${userId} AND id <> ${except} RETURNING id`
      : await sql()`DELETE FROM admin_sessions WHERE user_id = ${userId} RETURNING id`;
    return rows.length;
  }
  return mutate((data) => {
    const before = data.sessions.length;
    data.sessions = data.sessions.filter((s) => s.userId !== userId || s.id === except);
    return before - data.sessions.length;
  });
}

export async function listSessions(userId: string): Promise<AdminSession[]> {
  if (usingPostgres()) {
    await ensureSchema();
    const rows = await sql()<SessionRow[]>`
      SELECT * FROM admin_sessions WHERE user_id = ${userId} ORDER BY last_seen_at DESC`;
    return rows.map(toSession);
  }
  return (await readAll()).sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function purgeExpiredSessions(): Promise<void> {
  if (usingPostgres()) {
    await sql()`DELETE FROM admin_sessions WHERE expires_at < now()`;
    return;
  }
  await mutate((data) => {
    const now = Date.now();
    data.sessions = data.sessions.filter((s) => Date.parse(s.expiresAt) > now);
  });
}

/* ---------------- attempts & audit ---------------- */

export async function recordAttempt(key: string, ok: boolean): Promise<void> {
  const row: LoginAttempt = { id: randomUUID(), key, at: new Date().toISOString(), ok };

  if (usingPostgres()) {
    await ensureSchema();
    await sql()`INSERT INTO admin_login_attempts (id, key, at, ok) VALUES (${row.id}, ${row.key}, ${row.at}, ${row.ok})`;
    return;
  }

  await mutate((data) => {
    data.attempts.push(row);
    // keep the file from growing without bound
    if (data.attempts.length > 500) data.attempts = data.attempts.slice(-500);
  });
}

/** Failures for this key since `since`, and when the most recent one was. */
export async function recentFailures(
  key: string,
  since: Date,
): Promise<{ count: number; lastAt: Date | null }> {
  if (usingPostgres()) {
    await ensureSchema();
    const [row] = await sql()<{ n: string; last: Date | null }[]>`
      SELECT count(*)::text AS n, max(at) AS last
      FROM admin_login_attempts
      WHERE key = ${key} AND ok = false AND at > ${since.toISOString()}`;
    return { count: Number(row.n), lastAt: row.last };
  }

  const rows = (await readAll()).attempts.filter(
    (a) => a.key === key && !a.ok && Date.parse(a.at) > since.getTime(),
  );
  const last = rows.at(-1);
  return { count: rows.length, lastAt: last ? new Date(last.at) : null };
}

export async function clearFailures(key: string): Promise<void> {
  if (usingPostgres()) {
    await sql()`DELETE FROM admin_login_attempts WHERE key = ${key} AND ok = false`;
    return;
  }
  await mutate((data) => {
    data.attempts = data.attempts.filter((a) => !(a.key === key && !a.ok));
  });
}

export async function audit(entry: Omit<AuditEntry, "id" | "at">): Promise<void> {
  const row: AuditEntry = { ...entry, id: randomUUID(), at: new Date().toISOString() };

  if (usingPostgres()) {
    await ensureSchema();
    await sql()`
      INSERT INTO admin_audit (id, at, user_id, email, action, detail, ip)
      VALUES (${row.id}, ${row.at}, ${row.userId}, ${row.email}, ${row.action}, ${row.detail}, ${row.ip})`;
    return;
  }

  await mutate((data) => {
    data.audit.push(row);
    if (data.audit.length > 500) data.audit = data.audit.slice(-500);
  });
}

export async function listAudit(limit = 25): Promise<AuditEntry[]> {
  if (usingPostgres()) {
    await ensureSchema();
    const rows = await sql()<
      { id: string; at: Date; user_id: string | null; email: string | null; action: string; detail: string | null; ip: string | null }[]
    >`SELECT * FROM admin_audit ORDER BY at DESC LIMIT ${limit}`;
    return rows.map((r) => ({
      id: r.id,
      at: r.at.toISOString(),
      userId: r.user_id,
      email: r.email,
      action: r.action,
      detail: r.detail,
      ip: r.ip,
    }));
  }

  return (await readAll()).audit.slice(-limit).reverse();
}
