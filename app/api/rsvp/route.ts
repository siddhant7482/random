import { NextResponse } from "next/server";
import { addRsvp, type NewRsvp } from "@/lib/rsvp-store";
import { notifyOnRsvp } from "@/lib/mail";

/* Postgres and the file store both need Node APIs, so this can't run on edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trim, collapse whitespace, cap length, and treat empty as absent. */
function clean(v: FormDataEntryValue | null, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim().slice(0, max);
  return s.length ? s : null;
}

export async function POST(request: Request) {
  let data: FormData;
  try {
    // the form posts FormData; accept JSON too so the endpoint is easy to test
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      data = new FormData();
      for (const [k, v] of Object.entries(body)) data.set(k, String(v ?? ""));
    } else {
      data = await request.formData();
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read that request." }, { status: 400 });
  }

  /* Validate here as well as in the browser. Client-side checks are for
     helpfulness; these are the ones that actually protect the data. */
  const errors: Record<string, string> = {};

  const name = clean(data.get("name"), 120);
  const email = clean(data.get("email"), 200);
  const attendingRaw = clean(data.get("attending"), 8);

  if (!name || name.length < 2) errors.name = "Please tell us your name.";
  if (!email || !EMAIL.test(email)) errors.email = "That email doesn't look quite right.";
  if (attendingRaw !== "yes" && attendingRaw !== "no") errors.attending = "Please let us know either way.";

  // honeypot: real guests never see this field, bots fill everything
  if (clean(data.get("website"), 200)) {
    // pretend it worked so the bot doesn't retry with a different shape
    return NextResponse.json({ ok: true });
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const attending = attendingRaw as "yes" | "no";
  const guestsRaw = Number(clean(data.get("guests"), 3) ?? "1");
  const guests = attending === "yes" && Number.isFinite(guestsRaw) ? Math.min(Math.max(Math.trunc(guestsRaw), 1), 12) : 1;

  const record: NewRsvp = {
    name: name!,
    email: email!,
    phone: clean(data.get("phone"), 40),
    attending,
    guests,
    // questions only asked of people who are coming
    dietary: attending === "yes" ? clean(data.get("dietary"), 500) : null,
    song: attending === "yes" ? clean(data.get("song"), 200) : null,
    note: clean(data.get("note"), 2000),
  };

  let saved;
  try {
    saved = await addRsvp(record);
  } catch (err) {
    console.error("[rsvp] could not save:", err);
    return NextResponse.json(
      { ok: false, error: "We couldn't save that. Please try again, or email us." },
      { status: 500 },
    );
  }

  /* Store first, notify second, and never let a mail failure fail the reply —
     an RSVP that's saved but unemailed is recoverable; a lost one isn't. */
  const mail = await notifyOnRsvp(saved);

  return NextResponse.json({ ok: true, mailed: mail.guest.sent });
}
