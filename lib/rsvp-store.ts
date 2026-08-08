import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

/* ============================================================
   Where RSVPs live.

   With DATABASE_URL set it's Postgres — that's production.
   Without it, a JSON file under .data/ so `npm run dev` works with no
   setup at all and you can click through the whole flow locally.

   The file store is dev-only on purpose: serverless filesystems are
   read-only and thrown away between requests, so it would silently lose
   replies in production. `storageMode()` below reports which is active and
   the dashboard shows a warning if the wrong one is running.
   ============================================================ */

export type Attending = "yes" | "no";

export type Rsvp = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  attending: Attending;
  guests: number;
  dietary: string | null;
  song: string | null;
  note: string | null;
  createdAt: string;
};

export type NewRsvp = Omit<Rsvp, "id" | "createdAt">;

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "rsvps.json");

export function storageMode(): "postgres" | "file" {
  return process.env.DATABASE_URL ? "postgres" : "file";
}

/* ---------------- Postgres ---------------- */

// Cached on globalThis: dev hot-reload re-evaluates modules, and without this
// every reload would open another pool and exhaust the connection limit.
const globalForDb = globalThis as unknown as {
  __rsvpSql?: postgres.Sql;
  __rsvpSchemaReady?: Promise<void>;
};

function sql() {
  if (!globalForDb.__rsvpSql) {
    globalForDb.__rsvpSql = postgres(process.env.DATABASE_URL!, {
      // serverless invocations are short-lived; one socket each is plenty and
      // keeps us well inside a free tier's connection cap
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForDb.__rsvpSql;
}

function ensureSchema() {
  if (!globalForDb.__rsvpSchemaReady) {
    globalForDb.__rsvpSchemaReady = (async () => {
      const db = sql();
      await db`
        CREATE TABLE IF NOT EXISTS rsvps (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          email       TEXT NOT NULL,
          phone       TEXT,
          attending   TEXT NOT NULL CHECK (attending IN ('yes','no')),
          guests      INTEGER NOT NULL DEFAULT 1,
          dietary     TEXT,
          song        TEXT,
          note        TEXT,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS rsvps_created_at_idx ON rsvps (created_at DESC)`;
    })();
  }
  return globalForDb.__rsvpSchemaReady;
}

/* ---------------- file (dev) ---------------- */

/* Serialised and atomic, for the same reason as the auth store: two replies
   arriving at once would otherwise each read the same array and the second
   write would drop the first. Losing an RSVP is exactly what must not happen. */
let queue: Promise<unknown> = Promise.resolve();

function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readUnlocked(): Promise<Rsvp[]> {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Rsvp[]) : [];
  } catch {
    return [];
  }
}

async function writeUnlocked(rows: Rsvp[]) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await rename(tmp, DATA_FILE);
}

const readFileStore = () => withFileLock(readUnlocked);

/* ---------------- public API ---------------- */

export async function addRsvp(input: NewRsvp): Promise<Rsvp> {
  const row: Rsvp = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };

  if (storageMode() === "postgres") {
    await ensureSchema();
    await sql()`
      INSERT INTO rsvps (id, name, email, phone, attending, guests, dietary, song, note)
      VALUES (${row.id}, ${row.name}, ${row.email}, ${row.phone}, ${row.attending},
              ${row.guests}, ${row.dietary}, ${row.song}, ${row.note})
    `;
    return row;
  }

  await withFileLock(async () => {
    const rows = await readUnlocked();
    rows.unshift(row);
    await writeUnlocked(rows);
  });
  return row;
}

/** Shape as it comes back from Postgres — snake_case, real Date object. */
type RsvpRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  attending: Attending;
  guests: number;
  dietary: string | null;
  song: string | null;
  note: string | null;
  created_at: Date;
};

export async function listRsvps(): Promise<Rsvp[]> {
  if (storageMode() === "postgres") {
    await ensureSchema();
    const db = sql();
    const rows = await db<RsvpRow[]>`SELECT * FROM rsvps ORDER BY created_at DESC`;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      attending: r.attending,
      guests: r.guests,
      dietary: r.dietary,
      song: r.song,
      note: r.note,
      createdAt: r.created_at.toISOString(),
    }));
  }

  return readFileStore();
}

export type Stats = {
  replies: number;
  accepted: number;
  declined: number;
  /** total heads coming, counting each party's size */
  attendingHeads: number;
};

export function summarise(rows: Rsvp[]): Stats {
  return rows.reduce<Stats>(
    (acc, r) => {
      acc.replies += 1;
      if (r.attending === "yes") {
        acc.accepted += 1;
        acc.attendingHeads += r.guests;
      } else {
        acc.declined += 1;
      }
      return acc;
    },
    { replies: 0, accepted: 0, declined: 0, attendingHeads: 0 },
  );
}
