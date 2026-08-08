import { NextResponse } from "next/server";
import { isResponse, requireAdminApi } from "@/lib/auth/guard";
import { audit } from "@/lib/auth/store";
import { clientMeta } from "@/lib/auth/session";
import { listRsvps } from "@/lib/rsvp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Escape a value for CSV, and defuse spreadsheet formula injection. */
function cell(value: string | number | null) {
  const s = value === null || value === undefined ? "" : String(value);
  // a leading =, +, - or @ makes Excel/Sheets evaluate the cell as a formula
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  /* Origin isn't checked here: this is a plain navigation from an <a download>,
     which sends no Origin header. It's a safe GET that changes nothing, and the
     SameSite=Strict session cookie already stops a cross-site page from
     triggering it with the user's credentials. */
  const gate = await requireAdminApi({ checkOrigin: false });
  if (isResponse(gate)) return gate.response;

  const rows = await listRsvps();

  // downloading the whole guest list is worth recording
  const { ip } = await clientMeta();
  await audit({
    userId: gate.auth.user.id,
    email: gate.auth.user.email,
    action: "rsvps.exported",
    detail: `${rows.length} row(s)`,
    ip,
  });

  const header = [
    "Name",
    "Attending",
    "Party size",
    "Email",
    "Phone",
    "Dietary",
    "Song",
    "Note",
    "Replied at",
  ];

  const body = rows.map((r) =>
    [
      r.name,
      r.attending === "yes" ? "Yes" : "No",
      r.attending === "yes" ? r.guests : "",
      r.email,
      r.phone,
      r.dietary,
      r.song,
      r.note,
      new Date(r.createdAt).toISOString(),
    ]
      .map(cell)
      .join(","),
  );

  // BOM so Excel opens UTF-8 names and accents correctly
  const csv = "﻿" + [header.map(cell).join(","), ...body].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvps-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
